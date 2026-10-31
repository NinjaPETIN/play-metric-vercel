import {LIVE_CACHE_MS} from './live-refresh';
import {database} from './database-env';
import {boxFeed,normalizeLiveBoxscore,type BoxData} from './live-boxscore';
import type {LiveGame} from './live-scores';
import {linkLiveCalendar} from './live-scores';
import {readLiveScores} from './live-scores-store';
import type {Calendar} from './nba-snapshot';
export async function readRecentNbaBoxscore(id:string,calendar:Calendar|null){
 const match=calendar?.games.find(g=>g.id===id);
 if(!match||Math.abs(Date.parse(match.startsAt??match.date)-Date.now())>48*3600000)return null;
 const feed=await readLiveScores(),game=linkLiveCalendar(feed.games,calendar).find(g=>g.nbaId===id);
 return game?readLiveBoxscore(game):null;
}
type Saved={data:BoxData|null;fetchedAt:string|null;checkedAt:string|null;failed:boolean};
export async function readLiveBoxscore(game:LiveGame){
 const key='pm:box:v1:'+game.id,lease=key+':lease';
 const row=await database.prepare('select payload from provider_cache where key=?').bind(key).first<{payload:string}>();let saved:Saved=row?JSON.parse(row.payload):{data:null,fetchedAt:null,checkedAt:null,failed:false};const at=new Date().toISOString();
 if(!saved.checkedAt||Date.now()-Date.parse(saved.checkedAt)>=LIVE_CACHE_MS){
  const lock=await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set expires_at=excluded.expires_at where provider_cache.expires_at<=?').bind(lease,'{}',new Date(Date.now()+LIVE_CACHE_MS).toISOString(),at).run();
  if(lock.meta.changes){
   try{
    const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event='+game.id,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});if(!r.ok||!r.headers.get('content-type')?.includes('json'))throw Error();
    const reader=r.body?.getReader();if(!reader)throw Error();const chunks:Uint8Array[]=[];let size=0;for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>2000000){await reader.cancel();throw Error();}chunks.push(p.value);}
    saved={data:normalizeLiveBoxscore(JSON.parse(Buffer.concat(chunks).toString('utf8')),game),fetchedAt:new Date().toISOString(),checkedAt:at,failed:false};
   }catch{saved={...saved,checkedAt:at,failed:true};}
   await database.prepare("insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at where json_extract(provider_cache.payload,'$.checkedAt')<=json_extract(excluded.payload,'$.checkedAt')").bind(key,JSON.stringify(saved),new Date(Date.now()+3*86400000).toISOString()).run();
  }
 }
 return boxFeed(saved);
}
