import {z} from 'zod';
import type {Calendar} from './nba-snapshot';
const codes=new Set(['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS']);
const aliases:Record<string,string>={NY:'NYK',GS:'GSW',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS'};
const competitor=z.object({homeAway:z.enum(['home','away']),score:z.string().regex(/^\d{1,3}$/),team:z.object({abbreviation:z.string(),displayName:z.string().min(1).max(80)})});
const input=z.object({leagues:z.array(z.object({abbreviation:z.string()})).min(1),events:z.array(z.object({id:z.string().regex(/^\d{1,12}$/),date:z.preprocess(v=>typeof v==='string'?v.replace(/T(\d{2}:\d{2})(Z|[+-]\d{2}:\d{2})$/,'T$1:00$2'):v,z.string().datetime({offset:true})),status:z.object({period:z.number().int().min(0).max(20),displayClock:z.string().max(20),type:z.object({name:z.string().max(60),state:z.enum(['pre','in','post']),completed:z.boolean()})}),competitions:z.array(z.object({competitors:z.array(competitor).length(2)})).length(1)})).max(25)});
export const liveGameSchema=z.object({id:z.string().regex(/^\d{1,12}$/),nbaId:z.string().regex(/^\d{10}$/).nullable(),startsAt:z.string().datetime({offset:true}),home:z.string(),away:z.string(),homeName:z.string(),awayName:z.string(),homeScore:z.number().int().min(0).max(300).nullable(),awayScore:z.number().int().min(0).max(300).nullable(),period:z.number().int().min(0).max(20),clock:z.string().max(20),state:z.enum(['scheduled','live','final','postponed','canceled','delayed']),detail:z.string().max(60)});
export type LiveGame=z.infer<typeof liveGameSchema>;
export const liveFeedSchema=z.object({provider:z.literal('ESPN'),status:z.enum(['ready','stale','unavailable','pending']),fetchedAt:z.string().datetime().nullable(),checkedAt:z.string().datetime().nullable(),games:z.array(liveGameSchema).max(25)});
export type LiveFeed=z.infer<typeof liveFeedSchema>;
export function normalizeLiveScores(raw:unknown,now=Date.now()):LiveGame[]{
 const data=input.parse(raw);if(!data.leagues.some(l=>l.abbreviation==='NBA'))throw Error('Liga incorrecta');
 const seen=new Set<string>();
 return data.events.map(e=>{
  if(seen.has(e.id))throw Error('Partido repetido');seen.add(e.id);
  if(Math.abs(Date.parse(e.date)-now)>48*3600000)throw Error('Jornada fuera de rango');
  const c=e.competitions[0].competitors,h=c.find(t=>t.homeAway==='home'),a=c.find(t=>t.homeAway==='away');if(!h||!a)throw Error('Equipos incompletos');
  const home=aliases[h.team.abbreviation]??h.team.abbreviation,away=aliases[a.team.abbreviation]??a.team.abbreviation;
  if(!codes.has(home)||!codes.has(away)||home===away)throw Error('Equipos no válidos');
  const s=e.status,t=s.type;
  const state:LiveGame['state']=t.name.includes('POSTPON')?'postponed':t.name.includes('CANCEL')?'canceled':t.name.includes('DELAY')?'delayed':t.completed&&t.state==='post'?'final':t.state==='in'?'live':'scheduled';
  if(t.state==='post'&&state==='scheduled')throw Error('Estado final incoherente');
  const score=state==='live'||state==='final';
  const detail=state==='final'?'Final':state==='postponed'?'Postergado':state==='canceled'?'Cancelado':state==='delayed'?'Demorado':state==='scheduled'?'Por jugar':t.name==='STATUS_HALFTIME'?'Entretiempo':`${s.period<=4?'C'+s.period:'TE'+(s.period-4)} · ${s.displayClock}`;
  return liveGameSchema.parse({id:e.id,nbaId:null,startsAt:new Date(e.date).toISOString(),home,away,homeName:h.team.displayName,awayName:a.team.displayName,homeScore:score?Number(h.score):null,awayScore:score?Number(a.score):null,period:s.period,clock:s.displayClock,state,detail});
 }).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
}
export function linkLiveCalendar(games:LiveGame[],calendar:Calendar|null){
 return games.map(g=>{const day=new Date(g.startsAt).toLocaleDateString('en-CA',{timeZone:'America/New_York'});const matches=calendar?.games.filter(c=>c.home===g.home&&c.away===g.away&&c.date===day)??[];return {...g,nbaId:matches.length===1?matches[0].id:null};});
}
export function liveFeed(saved:{games:LiveGame[];fetchedAt:string|null;checkedAt:string|null;failed:boolean},now=Date.now()):LiveFeed{
 const age=saved.fetchedAt?now-Date.parse(saved.fetchedAt):Infinity;
 const usable=age>=-5000&&age<300000;
 return {provider:'ESPN',status:usable?(saved.failed||age>90000?'stale':'ready'):saved.checkedAt?'unavailable':'pending',fetchedAt:saved.fetchedAt,checkedAt:saved.checkedAt,games:usable?saved.games:[]};
}
