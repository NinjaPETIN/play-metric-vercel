import {z} from 'zod';
import {liveContextSchema,normalizeLiveContext} from './live-context';
import {normalizeLiveScores,liveGameSchema,type LiveGame} from './live-scores';
const count=z.number().int().min(0).max(300);
export const boxPlayerSchema=z.object({id:z.string().regex(/^\d{1,12}$/),name:z.string().min(1).max(100),starter:z.boolean(),onCourt:z.boolean().nullable().default(null),didNotPlay:z.boolean(),minutes:z.string().max(12).nullable(),points:count.nullable(),rebounds:count.nullable(),assists:count.nullable(),steals:count.nullable(),blocks:count.nullable(),turnovers:count.nullable(),fouls:count.nullable(),fieldGoals:z.string().max(12).nullable(),threes:z.string().max(12).nullable(),freeThrows:z.string().max(12).nullable(),plusMinus:z.number().int().min(-200).max(200).nullable()});
export const boxTeamSchema=z.object({code:z.string(),name:z.string(),score:count,players:z.array(boxPlayerSchema).max(25)});
export const boxDataSchema=z.object({game:liveGameSchema,teams:z.array(boxTeamSchema).length(2),context:liveContextSchema.optional()});
export const boxFeedSchema=z.object({provider:z.literal('ESPN'),status:z.enum(['ready','stale','unavailable','pending']),fetchedAt:z.string().datetime().nullable(),data:boxDataSchema.nullable()});
export type BoxData=z.infer<typeof boxDataSchema>;
export type BoxFeed=z.infer<typeof boxFeedSchema>;
const rowSchema=z.object({athlete:z.object({id:z.string().regex(/^\d{1,12}$/),displayName:z.string().min(1).max(100)}),starter:z.boolean(),active:z.boolean().optional(),didNotPlay:z.boolean(),stats:z.array(z.string()).max(30)});
const summaryStatus=z.object({period:z.number().int().min(0).max(20).optional(),displayClock:z.string().max(20).optional(),type:z.object({name:z.string(),state:z.enum(['pre','in','post']),completed:z.boolean()})});
const rawSchema=z.object({header:z.object({id:z.string(),league:z.object({abbreviation:z.literal('NBA')}),competitions:z.array(z.object({date:z.string(),status:summaryStatus,competitors:z.unknown()})).length(1)}),boxscore:z.object({players:z.array(z.object({team:z.object({abbreviation:z.string(),displayName:z.string()}),statistics:z.array(z.object({labels:z.array(z.string()).max(30),athletes:z.array(rowSchema).max(25)})).min(1)})).length(2)})});
const code=(s:string)=>({GS:'GSW',NY:'NYK',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS'}[s]??s);
export function normalizeLiveBoxscore(raw:unknown,expected:LiveGame,now=Date.now()):BoxData{
 const r=rawSchema.parse(raw);if(r.header.id!==expected.id)throw Error('Partido incorrecto');
 const event=r.header.competitions[0],final=event.status.type.completed&&event.status.type.state==='post';
 // ESPN omits period/clock after the final horn. Never require a live clock for a final result.
 const status=final?{...event.status,period:event.status.period??(expected.state==='final'?expected.period:0),displayClock:event.status.displayClock??''}:event.status;
 const game=normalizeLiveScores({leagues:[r.header.league],events:[{id:r.header.id,date:event.date,status,competitions:[{competitors:event.competitors}]}]},now)[0];
 if(game.home!==expected.home||game.away!==expected.away||game.startsAt!==expected.startsAt)throw Error('Equipos o fecha incorrectos');
 if(!['live','final'].includes(game.state))throw Error('Estadísticas todavía no publicadas');game.nbaId=expected.nbaId;
 const seen=new Set<string>();
 const teams=[expected.away,expected.home].map(team=>{
  const matches=r.boxscore.players.filter(t=>code(t.team.abbreviation)===team);if(matches.length!==1)throw Error('Plantilla incorrecta');const t=matches[0],block=t.statistics[0];
  if(new Set(block.labels).size!==block.labels.length)throw Error('Columnas repetidas');
  const activeKnown=game.state==='live'&&event.status.type.name==='STATUS_IN_PROGRESS'&&block.athletes.every(p=>typeof p.active==='boolean')&&block.athletes.filter(p=>p.active===true).length===5&&!block.athletes.some(p=>p.active&&p.didNotPlay);
  const players=block.athletes.map(row=>{
   if(seen.has(row.athlete.id))throw Error('Jugador repetido');seen.add(row.athlete.id);
   const stats=Object.fromEntries(block.labels.map((k,i)=>[k,row.stats[i]])),dnp=row.didNotPlay;
   const n=(k:string)=>{if(dnp)return null;const v=stats[k];if(!/^\d{1,3}$/.test(v??''))throw Error('Estadística incompleta');return Number(v);};
   const pair=(k:string)=>{if(dnp)return null;const v=stats[k],m=/^(\d{1,3})-(\d{1,3})$/.exec(v??'');if(!m||Number(m[1])>Number(m[2]))throw Error('Tiros inválidos');return v;};
   const minutes=dnp||stats.MIN==='-'||stats.MIN==='--'?null:stats.MIN;if(minutes!==null&&!/^\d{1,2}(?::[0-5]\d)?$/.test(minutes??''))throw Error('Minutos inválidos');
   const p=boxPlayerSchema.parse({id:row.athlete.id,name:row.athlete.displayName,starter:row.starter,onCourt:activeKnown?row.active:null,didNotPlay:dnp,minutes,points:n('PTS'),rebounds:n('REB'),assists:n('AST'),steals:n('STL'),blocks:n('BLK'),turnovers:n('TO'),fouls:n('PF'),fieldGoals:pair('FG'),threes:pair('3PT'),freeThrows:pair('FT'),plusMinus:dnp||!/^[-+]?\d+$/.test(stats['+/-']??'')?null:Number(stats['+/-'])});
   if(!dnp){const fg=Number(p.fieldGoals!.split('-')[0]),threes=Number(p.threes!.split('-')[0]),ft=Number(p.freeThrows!.split('-')[0]);if(p.points!==fg*2+threes+ft)throw Error('Puntos inconsistentes');}
   return p;
  });
  const score=team===game.home?game.homeScore:game.awayScore;
  if(score===null||players.filter(p=>!p.didNotPlay).length<5||players.reduce((n,p)=>n+(p.points??0),0)!==score)throw Error('Box score incompleto');
  return {code:team,name:t.team.displayName,score,players};
 });
 return boxDataSchema.parse({game,teams,context:normalizeLiveContext(raw,game.away,game.home)});
}
export function boxFeed(saved:{data:BoxData|null;fetchedAt:string|null;checkedAt:string|null;failed:boolean},now=Date.now()):BoxFeed{
 const age=saved.fetchedAt?now-Date.parse(saved.fetchedAt):Infinity,usable=!!saved.data&&age>=-5000&&age<300000;
 return {provider:'ESPN',status:usable?(saved.failed||age>90000?'stale':'ready'):saved.checkedAt?'unavailable':'pending',fetchedAt:saved.fetchedAt,data:usable?saved.data:null};
}
