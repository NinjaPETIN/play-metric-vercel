import {rankMetrics} from './league-context';
import type {PlayerProfile} from './player-profile';
import {competitions,snapshotKey,type Competition} from './competitions';
import {getDb} from '../db';
import {providerCache} from '../db/schema';
import {and,eq,gt,gte,lt,like,inArray,or,sql} from 'drizzle-orm';
import {type Player} from './data';
import {type TeamGame,type Snapshot} from './nba-snapshot';
import {analyze,value,markets,type Market} from './analytics';
const dashboardCache=new Map<string,{prefix:string;profileVersion:string;value:Awaited<ReturnType<typeof buildDashboard>>}>();
export async function loadDashboard(season?:number,competition:Competition='regular',catalog=false){
 const db=getDb(),keys=await db.select({key:providerCache.key,payload:sql<string|null>`case when ${providerCache.key} like 'nba_profile:%' or ${providerCache.key} like 'nba_traits_revision:%' then ${providerCache.payload} when ${providerCache.key} = coalesce(${season?snapshotKey(season,competition):null}, (select max(key) from provider_cache where key like ${competitions[competition].namespace+':20__'})) then ${providerCache.payload} else null end`}).from(providerCache).where(catalog?like(providerCache.key,competitions[competition].namespace+':20__'):or(like(providerCache.key,competitions[competition].namespace+':20__'),like(providerCache.key,'nba_profile:%'),like(providerCache.key,'nba_traits_revision:%')));
 const seasons=keys.filter(r=>r.key.startsWith(competitions[competition].namespace+':')&&/^[a-z_]+:\d{4}$/.test(r.key)).map(r=>Number(r.key.split(':')[1])).sort((a,b)=>b-a);
 const selected=season??seasons[0];if(!selected||!seasons.includes(selected))throw new Error('No hay historial disponible para esta temporada.');
 const record=keys.find(r=>r.key===snapshotKey(selected,competition));if(!record?.payload)throw Error('No hay historial disponible.');const meta=JSON.parse(record.payload) as {prefix:string;fetchedAt:string;teamGames?:TeamGame[]};
 const profileRows=keys.filter(r=>r.key.startsWith('nba_profile:')&&r.payload),profileVersion=keys.filter(r=>r.key.startsWith('nba_profile:')||r.key.startsWith('nba_traits_revision:')).map(r=>r.payload).join('|'),profiles=Object.fromEntries(profileRows.map(r=>[r.key.slice('nba_profile:'.length),JSON.parse(r.payload!) as PlayerProfile]));
 const cached=dashboardCache.get(competition+':'+selected+(catalog?':catalog':''));if(cached?.prefix===meta.prefix&&cached.profileVersion===profileVersion&&cached.value.fetchedAt===meta.fetchedAt&&cached.value.seasons.join(',')===seasons.join(','))return cached.value;
 // Bound response size and use indexed ranges: D1 limits LIKE pattern length.
 const records:{key:string;payload:string;traitsPayload?:string|null}[]=[];let cursor='';
 // Qualify the outer payload explicitly: Drizzle strips column table names in
 // single-table selections, which otherwise resolves payload inside traits.
 // Keep full-season payloads below the database HTTP response limit. The
 // regular season can exceed 10 MB even though it has fewer than 1,000 players.
 const pageSize=40;
 while(true){const batch=await db.select({key:providerCache.key,payload:providerCache.payload,traitsPayload:catalog?sql<string|null>`null`:sql<string|null>`(select payload from provider_cache traits where traits.key=${'nba_traits:'+competition+':'+selected+':'} || cast(json_extract(${sql.raw('provider_cache.payload')},'$.id') as text))`}).from(providerCache).where(and(gte(providerCache.key,meta.prefix),lt(providerCache.key,meta.prefix+'\uffff'),cursor?gt(providerCache.key,cursor):undefined)).orderBy(providerCache.key).limit(pageSize);records.push(...batch);if(records.length>1000)throw new Error('El historial excede el límite de jugadores.');if(batch.length<pageSize)break;cursor=batch.at(-1)!.key;}
 if(!records.length)throw new Error('La temporada no tiene registros disponibles.');
 const result=buildDashboard(records,meta,selected,seasons,competition,profiles,!catalog);
 dashboardCache.set(competition+':'+selected+(catalog?':catalog':''),{prefix:meta.prefix,profileVersion,value:result});if(dashboardCache.size>6)dashboardCache.delete(dashboardCache.keys().next().value!);return result;
}

export async function loadCalendar(){const [record]=await getDb().select().from(providerCache).where(eq(providerCache.key,'nba_calendar'));return record?JSON.parse(record.payload):null;}

function buildDashboard(records:{key:string;payload:string;traitsPayload?:string|null}[],meta:{prefix:string;fetchedAt:string;teamGames?:TeamGame[]},selected:number,seasons:number[],competition:Competition,profiles:Record<string,PlayerProfile>={},withContext=true){
 const players:Player[]=records.map(r=>{const p=JSON.parse(r.payload) as Snapshot['players'][number];const sums=Object.fromEntries(Object.keys(markets).map(m=>[m,{sum:0,n:0}])) as Record<Market,{sum:number;n:number}>;for(const g of p.games){if(!g.played||g.minutes<=0)continue;for(const m of Object.keys(markets) as Market[]){const v=value(g,m);if(v!==null){sums[m].sum+=v;sums[m].n++;}}}const lines=Object.fromEntries(Object.entries(sums).map(([m,{sum,n}])=>[m,Math.max(.5,Math.round(n?sum/n:0)-.5)])) as Record<Market,number>;return {id:String(p.id),name:p.name,team:p.team??'—',position:profiles[String(p.id)]?.position??'',profile:profiles[String(p.id)]??null,traits:r.traitsPayload?JSON.parse(r.traitsPayload):null,color:['#91b9ed','#c7f464','#d7a6f8','#ee9a55'][p.id%4],base:[0,0,0,0],lines,games:p.games};});
 if(withContext&&players.length>1){const rows=players.map(p=>{const games=p.games.filter(g=>g.played&&g.minutes>0);return {id:p.id,n:games.length,minutes:games.reduce((s,g)=>s+g.minutes,0),points:games.reduce((s,g)=>s+g.points,0),rebounds:games.reduce((s,g)=>s+g.rebounds,0),assists:games.reduce((s,g)=>s+g.assists,0),threes:games.reduce((s,g)=>s+g.threes,0)};});for(const p of players)p.leagueContext={playerId:p.id,season:selected,competition,fetchedAt:meta.fetchedAt,metrics:rankMetrics(rows,p.id)};}
 return {teamGames:meta.teamGames??[],mode:'historical',source:'NBA.com vía nba_api',season:selected,seasons,competition,supportedMarkets:Object.keys(markets).filter(m=>players.some(p=>p.games.some(g=>value(g,m as Market)!==null))),fetchedAt:meta.fetchedAt,lastGameDate:players.reduce<string|null>((last,p)=>p.games.reduce<string|null>((date,g)=>!date||g.date>date?g.date:date,last),null),players};
}

// Resolve the active generation on every read so imports invalidate cached data.
export async function loadPlayerDashboard(id:string,season?:number,competition:Competition='regular',allSeasons=false){
 const db=getDb(),pointers=await db.all<{key:string;prefix:string;fetchedAt:string;playerPayload:string|null;profilePayload:string|null;traitsPayload:string|null}>(sql`select meta.key as key, json_extract(meta.payload,'$.prefix') as prefix, json_extract(meta.payload,'$.fetchedAt') as fetchedAt, player.payload as playerPayload, (select payload from provider_cache where key=${'nba_profile:'+id}) as profilePayload, (select payload from provider_cache where key='nba_traits:' || ${competition} || ':' || substr(meta.key,-4) || ':' || ${id}) as traitsPayload from provider_cache meta left join provider_cache player on player.key = json_extract(meta.payload,'$.prefix') || ${id} where meta.key like ${competitions[competition].namespace+':20__'}`);
 const seasons=pointers.filter(r=>/^[a-z_]+:\d{4}$/.test(r.key)).map(r=>Number(r.key.split(':')[1])).sort((a,b)=>b-a),selected=season??seasons[0];
 if(!selected||!seasons.includes(selected))throw Error('No hay historial para esta temporada.');
 const chosen=pointers.filter(r=>allSeasons||r.key===snapshotKey(selected,competition)),metas=chosen.map(r=>({prefix:r.prefix,fetchedAt:r.fetchedAt}));
 const records=chosen.flatMap(r=>r.playerPayload?[{key:r.key,payload:r.playerPayload}]:[]);
 const merged=records.map(r=>JSON.parse(r.payload) as Snapshot['players'][number]).sort((a,b)=>(b.games[0]?.date??'').localeCompare(a.games[0]?.date??''));
 const games=merged.flatMap(p=>p.games).sort((a,b)=>b.date.localeCompare(a.date));const seen=new Set<string>();const unique=games.filter(g=>{const key=g.gameId??g.date;if(seen.has(key))return false;seen.add(key);return true;});
 const fetchedAt=metas.map(m=>m.fetchedAt).sort().at(-1)!;
 const result=buildDashboard(merged.length?[{key:id,payload:JSON.stringify({...merged[0],games:unique}),traitsPayload:pointers.find(r=>r.key===snapshotKey(selected,competition))?.traitsPayload}]:[],{prefix:'',fetchedAt,teamGames:[]},selected,seasons,competition,pointers[0]?.profilePayload?{[id]:JSON.parse(pointers[0].profilePayload)}:{});
 return {...result,historyScope:allSeasons?'all':'season',historySeasons:allSeasons?seasons:[selected]};
}
