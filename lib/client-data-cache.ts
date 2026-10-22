import {compactDashboard,expandDashboard} from './compact-dashboard';
// NBA histories contain no account data. Keep navigation reads in memory and
// store compact histories across navigation; authenticated reads stay no-store.
export class DataReadError extends Error{constructor(public status:number,message:string){super(message);this.name='DataReadError';}}
function pack(value:any){return value&&Array.isArray(value.players)?compactDashboard(value):value;}
const sensitive=(url:string)=>/^\/api\/v1\/players\/\d+(?:[/?]|$)/.test(url);
const entries=new Map<string,{value:unknown;at:number}>();
const pending=new Map<string,Promise<unknown>>();
export function readCachedData<T>(url:string):T|null{if(sensitive(url))return null;let item=entries.get(url);if(!item&&typeof window!=='undefined'){try{const raw=sessionStorage.getItem('pm:read:v5:'+url);if(raw){const saved=JSON.parse(raw);if(Date.now()-saved.at<5*60_000){const restored={value:expandDashboard(saved.value),at:Number(saved.at)};item=restored;entries.set(url,restored);}}}catch{}}return item&&Date.now()-item.at<5*60_000?item.value as T:null;}
export function seedCachedData(url:string,value:unknown){
 if(sensitive(url))return;const entry={value,at:Date.now()};entries.set(url,entry);
 try{if(typeof window!=='undefined'){const raw=JSON.stringify({...entry,value:pack(entry.value)});if(raw.length<2000000)sessionStorage.setItem('pm:read:v5:'+url,raw);}}catch{}
}
export async function loadCachedData<T>(url:string,force=false):Promise<T>{
 if(sensitive(url))force=true;const cached=readCachedData<T>(url);if(cached&&!force)return cached;
 const existing=pending.get(url);if(existing&&!force)return existing as Promise<T>;
 const promise=fetch(url,{cache:force?'no-store':'default',...(force?{headers:{'x-playmetric-refresh':'1'}}:{})}).then(async r=>{if(!r.ok){const body=await r.json().catch(()=>null) as {error?:unknown}|null;throw new DataReadError(r.status,typeof body?.error==='string'?body.error:'No pudimos consultar el historial. Intentá nuevamente.');}const value=expandDashboard(await r.json());const entry={value,at:Date.now()};if(sensitive(url)||pending.get(url)!==promise)return value;entries.set(url,entry);if(typeof window!=='undefined'&&/^\/api\/(v1\/|nba\/calendar)/.test(url)){try{const raw=JSON.stringify({...entry,value:pack(entry.value)});if(raw.length<2000000){for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith('pm:read:v5:')){const saved=JSON.parse(sessionStorage.getItem(key)!);if(Date.now()-saved.at>=5*60_000)sessionStorage.removeItem(key);}}const keys=Object.keys(sessionStorage).filter(k=>k.startsWith('pm:read:v5:')).sort((a,b)=>JSON.parse(sessionStorage.getItem(a)!).at-JSON.parse(sessionStorage.getItem(b)!).at);while(keys.length>=12)sessionStorage.removeItem(keys.shift()!);sessionStorage.setItem('pm:read:v5:'+url,raw);}}catch{}}if(entries.size>12)entries.delete(entries.keys().next().value!);return value;}).finally(()=>{if(pending.get(url)===promise)pending.delete(url);});
 pending.set(url,promise);return promise as Promise<T>;
}
