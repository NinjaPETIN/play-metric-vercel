// Cache only raw NBA data. Authentication, quota and plan checks run per request.
const reads=new Map<string,{at:number;bytes:number;value:unknown}>();
const inFlight=new Map<string,Promise<unknown>>();
const FRESH_MS=60_000,STALE_MS=15*60_000,MAX_ENTRY=8_000_000,MAX_BYTES=24_000_000;
export function clearNbaReadCache(){reads.clear()}
export async function cachedNbaRead<T>(key:string,read:()=>Promise<T>,force=false):Promise<T>{
 const existing=reads.get(key),now=Date.now();
 if(!force&&existing&&now-existing.at<FRESH_MS){reads.delete(key);reads.set(key,existing);return existing.value as T}
 const active=inFlight.get(key);if(active)return active as Promise<T>;
 const job=read().then(value=>{const bytes=Buffer.byteLength(JSON.stringify(value));if(bytes<MAX_ENTRY){reads.delete(key);reads.set(key,{at:Date.now(),bytes,value});let total=Array.from(reads.values()).reduce((n,r)=>n+r.bytes,0);while(reads.size>24||total>MAX_BYTES){const first=reads.keys().next().value!;total-=reads.get(first)!.bytes;reads.delete(first)}}return value}).catch(error=>{
  // Never mask invalid requests, permissions, quota failures or missing players.
  const status=(error as {status?:number})?.status;
  if(existing&&Date.now()-existing.at<STALE_MS&&(!status||status>=500))return (typeof existing.value==='object'&&existing.value!==null?{...existing.value,dataStale:true}:existing.value) as T;
  throw error;
 }).finally(()=>inFlight.delete(key));
 inFlight.set(key,job);return job;
}
