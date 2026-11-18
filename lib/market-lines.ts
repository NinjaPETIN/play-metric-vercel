import {z} from 'zod';
import {database} from './database-env';
import {normalizeSearch} from './player-search';
import type {Calendar} from './nba-snapshot';
import {teamNames} from './team-overview';

export const marketsByProvider={player_points:'Puntos',player_rebounds:'Rebotes',player_assists:'Asistencias',player_threes:'Triples'} as const;
type MarketKey=keyof typeof marketsByProvider;
const event=z.object({id:z.string().regex(/^[a-f0-9]{32}$/i),home_team:z.string(),away_team:z.string(),commence_time:z.string().datetime({offset:true})});
const book=z.object({key:z.string().max(60),title:z.string().max(80),last_update:z.string().datetime({offset:true}).optional(),markets:z.array(z.object({
 key:z.string(),last_update:z.string().datetime({offset:true}).optional(),outcomes:z.array(z.object({
  name:z.string(),description:z.string().min(1).max(120).optional(),point:z.number().min(0).max(300).optional(),price:z.number().gt(1).max(1000),
 })).max(750),
})).max(30)});
export type MarketLine={book:string;player:string;market:MarketKey;side:'Over'|'Under';line:number;price:number;updatedAt:string;firstLine:number|null;firstAt:string|null};
export type MarketLines={state:'unconfigured'|'unavailable'|'ready';lines:MarketLine[];dataStale?:boolean};

function teamKey(name:string){
 return normalizeSearch(name).replace(/[.]/g,'').replace(/^la clippers$/,'los angeles clippers');
}

export async function readMarketLines(game:Calendar['games'][number]):Promise<MarketLines>{
 const key=process.env.ODDS_API_KEY??'';
 if(!key)return {state:'unconfigured',lines:[]};
 const now=Date.now();
 const starts=Date.parse(game.startsAt??'');
 if(game.status!==1||!Number.isFinite(starts)||starts<now-10*60_000||starts>now+2*86400_000)return {state:'unavailable',lines:[]};
 const root='https://api.the-odds-api.com/v4/sports/basketball_nba/events';
 async function fetchOdds(path:string,query:Record<string,string>,revalidate:number){
  const url=new URL(root+path);
  url.search=new URLSearchParams({...query,apiKey:key}).toString();
  const response=await fetch(url,{next:{revalidate},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Proveedor de líneas no disponible');
  return response.json() as Promise<unknown>;
 }
 const candidates=z.array(event).max(300).parse(await fetchOdds('',{},300)).filter(row=>
  teamKey(row.home_team)===teamKey(teamNames[game.home]??game.homeName)&&
  teamKey(row.away_team)===teamKey(teamNames[game.away]??game.awayName)&&Math.abs(Date.parse(row.commence_time)-starts)<3*3600_000);
 if(candidates.length!==1)return {state:'unavailable',lines:[]};
 const match=candidates[0];
 const snapshot=event.extend({bookmakers:z.array(book).max(100)}).parse(await fetchOdds('/'+match.id+'/odds',{
  regions:'us',markets:Object.keys(marketsByProvider).join(','),oddsFormat:'decimal',
 },180));
 if(snapshot.id!==match.id||snapshot.home_team!==match.home_team||snapshot.away_team!==match.away_team)return {state:'unavailable',lines:[]};
 const rows=new Map<string,Omit<MarketLine,'firstLine'|'firstAt'>>();
 for(const item of snapshot.bookmakers)for(const market of item.markets){
  if(!Object.hasOwn(marketsByProvider,market.key))continue;
  const updatedAt=market.last_update??item.last_update;
  if(!updatedAt)continue;
  for(const option of market.outcomes){
   const {description:player,name:side,point:line,price}=option;
   if(!player||line===undefined||(side!=='Over'&&side!=='Under'))continue;
   rows.set([item.key,market.key,normalizeSearch(player),side].join(':'),{book:item.title,player,market:market.key as MarketKey,side,line,price,updatedAt});
  }
 }
 const entries=[...rows.entries()].slice(0,2000);
 const observedKey='pm:odds:first:v1:'+game.id;
 const stored=await database.prepare('select payload from provider_cache where key=?').bind(observedKey).first<{payload:string}>();
 const first=z.record(z.string(),z.object({line:z.number(),at:z.string()})).parse(stored?JSON.parse(stored.payload):{});
 const newEntries=entries.filter(([id])=>!Object.hasOwn(first,id)).map(([id,row])=>[id,{line:row.line,at:row.updatedAt}] as const);
 if(newEntries.length){
  await database.prepare(`insert into provider_cache(key,payload,expires_at) values(?,?,?)
   on conflict(key) do update set payload=json_patch(excluded.payload,provider_cache.payload)`)
   .bind(observedKey,JSON.stringify(Object.fromEntries(newEntries)),new Date(starts+14*86400_000).toISOString()).run();
  const saved=await database.prepare('select payload from provider_cache where key=?').bind(observedKey).first<{payload:string}>();
  if(saved)Object.assign(first,JSON.parse(saved.payload));
 }
 return {state:'ready',lines:entries.map(([id,row])=>({...row,firstLine:first[id]?.line??null,firstAt:first[id]?.at??null}))};
}
