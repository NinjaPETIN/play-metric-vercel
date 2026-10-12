import {sql} from 'drizzle-orm';
import {getDb} from '../../../db';
import {rosterFreshness} from '../../../lib/roster';
export const dynamic='force-dynamic';
export async function GET(){
 const headers={'Cache-Control':'no-store'};
 try{
 const rows=await getDb().all<{key:string;fetchedAt:string|null}>(sql`select key,json_extract(payload,'$.fetchedAt') as fetchedAt from provider_cache where key in ('nba_roster','nba_calendar') or key glob 'nba_api:20[0-9][0-9]' or key glob 'nba_pre:20[0-9][0-9]' or key glob 'nba_post:20[0-9][0-9]'`);
 const roster=rosterFreshness(rows.find(r=>r.key==='nba_roster')?.fetchedAt??null);
 const feeds=['nba_api','nba_pre','nba_post','nba_calendar'].map(prefix=>{const row=rows.filter(r=>r.key===prefix||r.key.startsWith(prefix+':')).sort((a,b)=>b.key.localeCompare(a.key))[0];const fetchedAt=row?.fetchedAt??null;return {feed:prefix,season:row?.key.includes(':')?Number(row.key.split(':')[1]):null,fetchedAt,status:!fetchedAt?'pending':Date.now()-Date.parse(fetchedAt)>6*3600_000?'stale':'ready'};});
 return Response.json({name:'Play Metric',mode:'historical',liveData:false,version:'2.1.0',provider:'NBA.com',billing:false,checkedAt:new Date().toISOString(),status:roster.status==='ready'&&feeds.every(f=>f.status==='ready')?'ready':'degraded',roster,feeds},{headers});
 }catch{return Response.json({name:'Play Metric',status:'unavailable',checkedAt:new Date().toISOString()},{status:503,headers});}
}
