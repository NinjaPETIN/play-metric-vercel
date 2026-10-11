// Public NBA data only; account-specific favorites never pass through this cache.
const reads=new Map<string,{at:number;bytes:number;value:unknown}>();
const inFlight=new Map<string,Promise<unknown>>();
export async function cachedNbaRead<T>(key:string,read:()=>Promise<T>,force=false):Promise<T>{
 const existing=reads.get(key);
 if(!force&&existing&&Date.now()-existing.at<30_000)return existing.value as T;
 const active=inFlight.get(key);if(active)return active as Promise<T>;
 const job=read().then(value=>{const bytes=JSON.stringify(value).length;if(bytes<1_000_000){reads.set(key,{at:Date.now(),bytes,value});while(reads.size>24||Array.from(reads.values()).reduce((n,r)=>n+r.bytes,0)>4_000_000)reads.delete(reads.keys().next().value!);}return value;}).finally(()=>inFlight.delete(key));
 inFlight.set(key,job);return job;
}
