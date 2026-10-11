import {getDb} from '../db';
import {sql} from 'drizzle-orm';
import {snapshotKey,type Competition} from './competitions';
export type LeagueMetric={key:string;label:string;average:number;leagueAverage:number;percentile:number;players:number;games:number};
export type LeagueContext={playerId:string;season:number;competition:string;fetchedAt:string;metrics:LeagueMetric[]};
export function rankMetrics(rows:{id:string;n:number;minutes:number;points:number;rebounds:number;assists:number;threes:number}[],id:string):LeagueMetric[]{
 const eligible=rows.filter(r=>r.n>=5&&r.minutes/r.n>=15),player=eligible.find(r=>r.id===id);
 if(!player||eligible.length<10)return [];
 return (['points','rebounds','assists','threes'] as const).map((key,i)=>{const values=eligible.map(r=>Number(r[key])/r.n),average=Number(player[key])/player.n,below=values.filter(v=>v<average).length,equal=values.filter(v=>v===average).length;return {key,label:['Puntos','Rebotes','Asistencias','Triples'][i],average,leagueAverage:values.reduce((a,b)=>a+b,0)/values.length,percentile:Math.round(100*(below+equal/2)/values.length),players:values.length,games:player.n};});
}
export async function readLeagueContext(id:string,season:number,competition:Competition):Promise<LeagueContext>{
 const db=getDb(),meta=await db.all<{prefix:string;fetchedAt:string}>(sql`select json_extract(payload,'$.prefix') as prefix,json_extract(payload,'$.fetchedAt') as fetchedAt from provider_cache where key=${snapshotKey(season,competition)}`);
 if(!meta[0])return {playerId:id,season,competition,fetchedAt:'',metrics:[]};
 const prefix=meta[0].prefix;
 const rows=await db.all<{id:string;n:number;minutes:number;points:number;rebounds:number;assists:number;threes:number}>(sql`select cast(json_extract(p.payload,'$.id') as text) as id,count(*) as n,sum(json_extract(g.value,'$.minutes')) as minutes,sum(json_extract(g.value,'$.points')) as points,sum(json_extract(g.value,'$.rebounds')) as rebounds,sum(json_extract(g.value,'$.assists')) as assists,sum(json_extract(g.value,'$.threes')) as threes from provider_cache p,json_each(p.payload,'$.games') g where p.key>=${prefix} and p.key<${prefix+'\uffff'} and json_extract(g.value,'$.played')=1 and json_extract(g.value,'$.minutes')>0 group by p.key`);
 return {playerId:id,season,competition,fetchedAt:meta[0].fetchedAt,metrics:rankMetrics(rows,id)};
}
