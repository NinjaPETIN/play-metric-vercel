import { expandDashboard, packDashboard } from './compact-dashboard';

// NBA histories contain no account data. Protected individual reads are never cached in the browser.
export class DataReadError extends Error {
 constructor(public status:number,message:string) {
  super(message);
  this.name='DataReadError';
 }
}

type Entry={value:unknown;at:number};
const ttl=5*60_000;
const retention=24*60*60_000;
const maxEntries=12;
const prefix='pm:read:v6:';
let legacyCleared=false;
function clearLegacy(){if(legacyCleared||typeof window==='undefined')return;legacyCleared=true;try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith('pm:read:v5:'))sessionStorage.removeItem(key);}}catch{}}
const entries=new Map<string,Entry>();
const pending=new Map<string,Promise<unknown>>();
export function publicDataUrl(url:string){
 if(!url.startsWith('/api/')||url.includes('#')||url.includes('\\'))return false;
 const path=url.split('?')[0];
 return path==='/api/v1/players'||path==='/api/v1/teams'||path==='/api/v1/seasons'||path==='/api/nba/calendar'||/^\/api\/nba\/(availability|market-lines)\/\d{10}$/.test(path);
}
export function safePublicPayload(url:string,value:unknown){
 if(!publicDataUrl(url)||!value||typeof value!=='object')return false;
 const body=value as Record<string,unknown>;
 if(['account','usage','favorites','watchlist','accessToken','refreshToken'].some(key=>Object.hasOwn(body,key)))return false;
 return !Array.isArray(body.players)||body.players.every(player=>{if(!player||typeof player!=='object')return false;const p=player as Record<string,unknown>;return (!Array.isArray(p.games)||p.games.length===0)&&!p.traits&&!p.leagueContext&&!p.profile;});
}
const sensitive=(url:string)=>!publicDataUrl(url);
export function canUseSavedRead(error:unknown){return !(error instanceof DataReadError)||error.status===408||error.status>=500&&error.status<600;}

function remember(url:string,entry:Entry) {
 entries.delete(url);
 entries.set(url,entry);
 if(entries.size>maxEntries)entries.delete(entries.keys().next().value!);
}

function persist(url:string,entry:Entry) {
 if(typeof window==='undefined')return;
 try {
  const raw=JSON.stringify({...entry,value:packDashboard(entry.value)});
  if(raw.length>=2_000_000)return;
  const storageKey=prefix+url;
  const now=Date.now();
  const keys:Array<{key:string;at:number}>=[];
  for(let index=sessionStorage.length-1;index>=0;index--){
   const key=sessionStorage.key(index);
   if(!key?.startsWith(prefix)||key===storageKey)continue;
   let timestamp=0;
   try { timestamp=Number(JSON.parse(sessionStorage.getItem(key)??'null')?.at)||0; } catch {}
   if(now-timestamp>=retention||now-timestamp< -5000)sessionStorage.removeItem(key);
   else keys.push({key,at:timestamp});
  }
  keys.sort((a,b)=>a.at-b.at);
  for(const {key} of keys.slice(0,Math.max(0,keys.length-maxEntries+1)))sessionStorage.removeItem(key);
  sessionStorage.setItem(storageKey,raw);
 } catch { /* The memory cache also works with storage disabled. */ }
}

export function readCachedData<T>(url:string,maxAge=ttl):T|null {
 clearLegacy();
 if(sensitive(url))return null;
 const cached=entries.get(url);
 const now=Date.now();
 if(cached&&safePublicPayload(url,cached.value)&&now-cached.at>=-5000&&now-cached.at<maxAge){
  remember(url,cached);
  return cached.value as T;
 }
 if(cached&&(now-cached.at>=retention||now-cached.at< -5000))entries.delete(url);
 if(typeof window==='undefined')return null;
 try {
  const raw=sessionStorage.getItem(prefix+url);
  if(!raw)return null;
  const saved:Entry=JSON.parse(raw);
  if(!Number.isFinite(saved?.at)||now-saved.at< -5000||now-saved.at>=Math.min(retention,maxAge))return null;
  const restored={value:expandDashboard(saved.value),at:saved.at};
  if(!safePublicPayload(url,restored.value)){sessionStorage.removeItem(prefix+url);return null;}
  remember(url,restored);
  return restored.value as T;
 } catch {return null;}
}

export function seedCachedData(url:string,value:unknown) {
 clearLegacy();
 if(!safePublicPayload(url,value))return;
 const entry={value,at:Date.now()};
 remember(url,entry);
 persist(url,entry);
}

export async function loadCachedData<T>(url:string,force=false):Promise<T> {
 const isSensitive=sensitive(url),path=url.split('?')[0],query=new URLSearchParams(url.split('?')[1]??'');
 const collection=path.startsWith('/api/v1/');
 const shared=!isSensitive&&(!collection||query.get('guest')==='1'||query.get('detail')==='list');
 const refresh=force||isSensitive||!shared;
 if(!refresh){
  const cached=readCachedData<T>(url);
  if(cached!==null)return cached;
  const active=pending.get(url);
  if(active)return active as Promise<T>;
 }
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),20_000);
 const request=fetch(url,{signal:controller.signal,cache:refresh?'no-store':'default',...(shared?{credentials:'omit' as const}:{}),...((force||isSensitive)?{headers:{'x-playmetric-refresh':'1'}}:{})})
  .then(async response=>{
   if(!response.ok){
    const body=await response.json().catch(()=>null) as {error?:unknown}|null;
    throw new DataReadError(response.status,typeof body?.error==='string'?body.error:'No pudimos consultar el historial. Intentá nuevamente.');
   }
   const value=expandDashboard(await response.json());
   if(!isSensitive&&safePublicPayload(url,value)&&(!shared||pending.get(url)===request)){
    const entry={value,at:Date.now()};
    remember(url,entry);
    if(/^\/api\/(v1\/|nba\/calendar)/.test(url))persist(url,entry);
   }
   return value as T;
  }).catch(error=>{
   if(controller.signal.aborted)throw new DataReadError(408,'La consulta está tardando más de lo esperado. Volvé a intentar.');
   throw error;
  }).finally(()=>{
   clearTimeout(timeout);
   if(pending.get(url)===request)pending.delete(url);
  });
 if(shared)pending.set(url,request);
 return request;
}
