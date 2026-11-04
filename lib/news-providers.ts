import type {NewsProvider} from './news';
export class NewsProviderError extends Error{
 constructor(public provider:NewsProvider,public code:string,public retryMs=15*60_000){super(provider+': '+code);}
}
export function retryAfterMs(value:string|null,now=Date.now(),fallback=60*60_000){
 const seconds=value&&/^\d+$/.test(value.trim())?Number(value)*1000:NaN,delay=Number.isFinite(seconds)?seconds:value?Date.parse(value)-now:NaN;
 return Math.min(24*60*60_000,Math.max(15*60_000,Number.isFinite(delay)?delay:fallback));
}
async function request(url:URL,provider:NewsProvider,headers:Record<string,string>,now:number){
 let r:Response;try{r=await fetch(url,{headers:{Accept:'application/json',...headers},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(7000)});}catch{throw new NewsProviderError(provider,'network_or_timeout');}
 if(!r.ok)throw new NewsProviderError(provider,'http_'+r.status,r.status===429||r.status===503?retryAfterMs(r.headers.get('retry-after'),now):15*60_000);
 if(!r.headers.get('content-type')?.includes('json'))throw new NewsProviderError(provider,'invalid_content_type');
 const reader=r.body?.getReader();if(!reader)throw new NewsProviderError(provider,'empty_body');const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>750_000){await reader.cancel();throw new NewsProviderError(provider,'response_too_large');}chunks.push(part.value);}return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string,unknown>;}catch(e){if(e instanceof NewsProviderError)throw e;throw new NewsProviderError(provider,'invalid_json');}
}
export async function requestGdelt(now=Date.now()){
 const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');url.search=new URLSearchParams({query:'NBA (domain:nba.com OR domain:espn.com OR domain:cbssports.com OR domain:apnews.com OR domain:sportingnews.com OR domain:as.com OR domain:marca.com)',mode:'artlist',format:'json',timespan:'3d',maxrecords:'50',sort:'datedesc'}).toString();
 return request(url,'GDELT',{},now);
}
function publication(value:unknown){
 if(typeof value!=='string'||value.length>50)return null;
 const normalized=value.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,'$1T$2$3:$4');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(normalized))return null;
 const at=Date.parse(normalized);return Number.isFinite(at)?new Date(at).toISOString():null;
}
export async function requestCurrents(key:string,language:'es'|'en',now=Date.now()){
 // Keys are sent only in Authorization to the fixed provider origin, never in URLs or logs.
 if(!key||key.length<16||/[\r\n]/.test(key))throw new NewsProviderError('Currents','invalid_configuration',60*60_000);
 const url=new URL('https://api.currentsapi.services/v1/search');url.search=new URLSearchParams({keywords:'NBA',language,page_size:'20',start_date:new Date(now-3*86400_000).toISOString(),end_date:new Date(now).toISOString()}).toString();
 const raw=await request(url,'Currents',{Authorization:'Bearer '+key},now);
 if(raw.status!=='ok'||!Array.isArray(raw.news))throw new NewsProviderError('Currents','invalid_payload');
 const detected=new Date(now).toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
 return {articles:raw.news.slice(0,20).flatMap((item:unknown)=>{if(!item||typeof item!=='object')return [];const a=item as Record<string,unknown>,publishedAt=publication(a.published);return publishedAt?[{title:a.title,url:a.url,publishedAt,seendate:detected,language:a.language==='es'?'Spanish':a.language==='en'?'English':a.language}]:[];})};
}
