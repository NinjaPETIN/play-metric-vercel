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
const maxEntries=12;
const prefix='pm:read:v5:';
const entries=new Map<string,Entry>();
const pending=new Map<string,Promise<unknown>>();
const sensitive=(url:string)=>/^\/api\/v1\/players\/\d+(?:[/?]|$)/.test(url);

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
   if(now-timestamp>=ttl)sessionStorage.removeItem(key);
   else keys.push({key,at:timestamp});
  }
  keys.sort((a,b)=>a.at-b.at);
  for(const {key} of keys.slice(0,Math.max(0,keys.length-maxEntries+1)))sessionStorage.removeItem(key);
  sessionStorage.setItem(storageKey,raw);
 } catch { /* The memory cache also works with storage disabled. */ }
}

export function readCachedData<T>(url:string):T|null {
 if(sensitive(url))return null;
 const cached=entries.get(url);
 const now=Date.now();
 if(cached&&now-cached.at<ttl){
  remember(url,cached);
  return cached.value as T;
 }
 entries.delete(url);
 if(typeof window==='undefined')return null;
 try {
  const raw=sessionStorage.getItem(prefix+url);
  if(!raw)return null;
  const saved:Entry=JSON.parse(raw);
  if(!Number.isFinite(saved?.at)||now-saved.at>=ttl)return null;
  const restored={value:expandDashboard(saved.value),at:saved.at};
  remember(url,restored);
  return restored.value as T;
 } catch {return null;}
}

export function seedCachedData(url:string,value:unknown) {
 if(sensitive(url))return;
 const entry={value,at:Date.now()};
 remember(url,entry);
 persist(url,entry);
}

export async function loadCachedData<T>(url:string,force=false):Promise<T> {
 const isSensitive=sensitive(url);
 const refresh=force||isSensitive;
 if(!refresh){
  const cached=readCachedData<T>(url);
  if(cached!==null)return cached;
  const active=pending.get(url);
  if(active)return active as Promise<T>;
 }
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),20_000);
 const request=fetch(url,{signal:controller.signal,cache:refresh?'no-store':'default',...(refresh?{headers:{'x-playmetric-refresh':'1'}}:{})})
  .then(async response=>{
   if(!response.ok){
    const body=await response.json().catch(()=>null) as {error?:unknown}|null;
    throw new DataReadError(response.status,typeof body?.error==='string'?body.error:'No pudimos consultar el historial. Intentá nuevamente.');
   }
   const value=expandDashboard(await response.json());
   if(!isSensitive&&pending.get(url)===request){
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
 if(!isSensitive)pending.set(url,request);
 return request;
}
