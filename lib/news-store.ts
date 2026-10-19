import {database} from './database-env';
import directory from './player-directory.json';
import {normalizeNews,newsFeedStatus,type NewsFeed} from './news';
const key='pm:news:v1',lease='pm:news:lease:v1';
type Saved=Omit<NewsFeed,'status'|'provider'>;
const empty=():Saved=>({articles:[],fetchedAt:null,checkedAt:null,lastAttempt:null});
async function save(saved:Saved){await database.prepare("insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at where json_extract(provider_cache.payload,'$.checkedAt') is null or json_extract(provider_cache.payload,'$.checkedAt')<=json_extract(excluded.payload,'$.checkedAt')").bind(key,JSON.stringify(saved),'2099-01-01T00:00:00.000Z').run();}
export async function ingestNews(raw:unknown){const articles=normalizeNews(raw,directory);if(!articles.length)throw Error('Sin titulares verificables');const now=new Date().toISOString();await save({articles,fetchedAt:now,checkedAt:now,lastAttempt:'ready'});await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set expires_at=excluded.expires_at').bind(lease,'{}',new Date(Date.now()+15*60_000).toISOString()).run();return {ok:true,articles:articles.length,fetchedAt:now};}
async function read():Promise<Saved>{const row=await database.prepare('select payload from provider_cache where key=?').bind(key).first<{payload:string}>();if(!row)return empty();try{const d=JSON.parse(row.payload);return Array.isArray(d.articles)?d:empty();}catch{return empty();}}
// Every visitor and every player shares one persistent refresh budget, across serverless instances.
export async function readNews():Promise<NewsFeed>{
 let saved=await read();const now=new Date().toISOString();
 if(!saved.checkedAt||Date.now()-Date.parse(saved.checkedAt)>15*60_000){
  const lock=await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at where provider_cache.expires_at<=?').bind(lease,'{}',new Date(Date.now()+15*60_000).toISOString(),now).run();
  if(lock.meta.changes){
   try{
    const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');url.search=new URLSearchParams({query:'NBA (domain:nba.com OR domain:espn.com OR domain:cbssports.com OR domain:apnews.com OR domain:sportingnews.com OR domain:as.com OR domain:marca.com)',mode:'artlist',format:'json',timespan:'24h',maxrecords:'50',sort:'datedesc'}).toString();
    const response=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw Error('Fuente no disponible');
    const reader=response.body?.getReader();if(!reader)throw Error('Respuesta vacía');let size=0;const chunks:Uint8Array[]=[];for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>750_000){await reader.cancel();throw Error('Respuesta demasiado grande');}chunks.push(part.value);}
    const text=Buffer.concat(chunks).toString('utf8'),articles=normalizeNews(JSON.parse(text),directory);
    // An empty valid feed must not silently replace the last useful cache.
    if(!articles.length)throw Error('Sin titulares verificables');
    saved={articles,fetchedAt:now,checkedAt:now,lastAttempt:'ready'};
   }catch{saved={...saved,checkedAt:now,lastAttempt:'failed'};}
   // A scheduled upload may have succeeded while this network request was in flight.
   const latest=await read();if(latest.checkedAt&&Date.parse(latest.checkedAt)>Date.parse(now))saved=latest;else {await save(saved);saved=await read();}
  }
 }
 // Expire individual indexed articles even if the provider remains unavailable.
 return {...saved,articles:saved.articles.filter(a=>Date.parse(a.indexedAt)>Date.now()-7*86400_000),provider:'GDELT',status:newsFeedStatus(saved)};
}
