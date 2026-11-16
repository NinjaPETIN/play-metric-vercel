import {getDb} from '../db';
import {sql} from 'drizzle-orm';
import {snapshotKey,type Competition} from './competitions';
export type LeagueMetric={key:string;label:string;average:number;leagueAverage:number;percentile:number;players:number;games:number};
export type LeagueContext={playerId:string;season:number;competition:string;fetchedAt:string;metrics:LeagueMetric[]};
type LeagueRow = {id:string;n:number;minutes:number;points:number;rebounds:number;assists:number;threes:number};
const leagueMetrics = [
 {key:'points',label:'Puntos'},
 {key:'rebounds',label:'Rebotes'},
 {key:'assists',label:'Asistencias'},
 {key:'threes',label:'Triples'},
] as const;

function eligiblePlayers(rows: LeagueRow[]) {
 return rows.filter(row=>row.n>=5&&row.minutes/row.n>=15);
}

function rankMetric(metric: typeof leagueMetrics[number], average: number, leagueAverage: number, start: number, end: number, players: number, games: number): LeagueMetric {
 return {...metric,average,leagueAverage,percentile:Math.round(100*(start+(end-start)/2)/players),players,games};
}

export function rankMetrics(rows: LeagueRow[], id: string): LeagueMetric[] {
 const eligible=eligiblePlayers(rows),player=eligible.find(row=>row.id===id);
 if(!player||eligible.length<10)return [];
 return leagueMetrics.map(metric=>{
  const average=Number(player[metric.key])/player.n;
  let below=0,equal=0,total=0;
  for(const row of eligible){
   const value=Number(row[metric.key])/row.n;
   total+=value;
   below+=Number(value<average);
   equal+=Number(value===average);
  }
  return rankMetric(metric,average,total/eligible.length,below,below+equal,eligible.length,player.n);
 });
}

export function rankLeague(rows: LeagueRow[]): Map<string,LeagueMetric[]> {
 const eligible=eligiblePlayers(rows);
 const rankings=new Map<string,LeagueMetric[]>();
 if(eligible.length<10)return rankings;
 for(const row of eligible)rankings.set(row.id,[]);
 for(const metric of leagueMetrics){
  const sorted=eligible.map(row=>({row,average:Number(row[metric.key])/row.n}));
  const leagueAverage=sorted.reduce((sum,entry)=>sum+entry.average,0)/sorted.length;
  sorted.sort((a,b)=>a.average-b.average);
  for(let start=0;start<sorted.length;){
   let end=start+1;
   while(end<sorted.length&&sorted[end].average===sorted[start].average)end++;
   for(let index=start;index<end;index++){
    const {row,average}=sorted[index];
    rankings.get(row.id)!.push(rankMetric(metric,average,leagueAverage,start,end,sorted.length,row.n));
   }
   start=end;
  }
 }
 return rankings;
}

export async function readLeagueContext(id:string,season:number,competition:Competition):Promise<LeagueContext>{
 const db=getDb(),meta=await db.all<{prefix:string;fetchedAt:string}>(sql`select json_extract(payload,'$.prefix') as prefix,json_extract(payload,'$.fetchedAt') as fetchedAt from provider_cache where key=${snapshotKey(season,competition)}`);
 if(!meta[0])return {playerId:id,season,competition,fetchedAt:'',metrics:[]};
 const prefix=meta[0].prefix;
 const rows=await db.all<{id:string;n:number;minutes:number;points:number;rebounds:number;assists:number;threes:number}>(sql`select cast(json_extract(p.payload,'$.id') as text) as id,count(*) as n,sum(json_extract(g.value,'$.minutes')) as minutes,sum(json_extract(g.value,'$.points')) as points,sum(json_extract(g.value,'$.rebounds')) as rebounds,sum(json_extract(g.value,'$.assists')) as assists,sum(json_extract(g.value,'$.threes')) as threes from provider_cache p,json_each(p.payload,'$.games') g where p.key>=${prefix} and p.key<${prefix+'\uffff'} and json_extract(g.value,'$.played')=1 and json_extract(g.value,'$.minutes')>0 group by p.key`);
 return {playerId:id,season,competition,fetchedAt:meta[0].fetchedAt,metrics:rankMetrics(rows,id)};
}
