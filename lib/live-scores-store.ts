import {LIVE_CACHE_MS,LIVE_LEASE_MS} from './live-refresh';
import {database} from './database-env';
import {liveFeed,normalizeLiveScores,type LiveGame} from './live-scores';
const key='pm:live:espn:v1',lease='pm:live:lease:v1';
type Saved={games:LiveGame[];fetchedAt:string|null;checkedAt:string|null;failed:boolean};
async function read():Promise<Saved>{const row=await database.prepare('select payload from provider_cache where key=?').bind(key).first<{payload:string}>();return row?JSON.parse(row.payload):{games:[],fetchedAt:null,checkedAt:null,failed:false};}
// Five-second freshness, with a longer in-flight lease to cover slow provider responses.
export async function readLiveScores(){
 let saved=await read();const at=new Date().toISOString(),leaseUntil=new Date(Date.now()+LIVE_LEASE_MS).toISOString();
 if(!saved.checkedAt||Date.now()-Date.parse(saved.checkedAt)>=LIVE_CACHE_MS){
  const lock=await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set expires_at=excluded.expires_at where provider_cache.expires_at<=?').bind(lease,'{}',leaseUntil,at).run();
  if(lock.meta.changes){
   try{
    const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
    if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw Error('Marcadores no disponibles');
    const reader=response.body?.getReader();if(!reader)throw Error('Respuesta vacía');const chunks:Uint8Array[]=[];let size=0;
    for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1000000){await reader.cancel();throw Error('Respuesta demasiado grande');}chunks.push(part.value);}
    const games=normalizeLiveScores(JSON.parse(Buffer.concat(chunks).toString('utf8'))),fetchedAt=new Date().toISOString();saved={games,fetchedAt,checkedAt:at,failed:false};
   }catch{saved={...saved,checkedAt:at,failed:true};}
   await database.prepare("insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at where json_extract(provider_cache.payload,'$.checkedAt')<=json_extract(excluded.payload,'$.checkedAt')").bind(key,JSON.stringify(saved),'2099-01-01T00:00:00.000Z').run();
   await database.prepare('update provider_cache set expires_at=? where key=? and expires_at=?').bind(new Date(Math.max(Date.now(),Date.parse(at)+LIVE_CACHE_MS)).toISOString(),lease,leaseUntil).run();
  }
 }
 return liveFeed(saved);
}
