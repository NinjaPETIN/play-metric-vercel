import {database} from './database-env';
import directory from './player-directory.json';
import {normalizeNews,newsFeedStatus,type NewsFeed,type NewsProvider} from './news';
import {requestCurrents,requestGdelt,NewsProviderError} from './news-providers';
const key='pm:news:v1',interval=15*60_000;
type Saved=Omit<NewsFeed,'status'>&{configuredProvider?:NewsProvider;nextRefreshAt?:string;failures?:number;lastError?:string};
const desired=():NewsProvider=>process.env.CURRENTS_API_KEY?'Currents':'GDELT';
const empty=():Saved=>({articles:[],fetchedAt:null,checkedAt:null,lastAttempt:null,provider:'GDELT',configuredProvider:'GDELT'});
async function save(saved:Saved){
 const articles=saved.articles.filter(a=>Date.parse(a.publishedAt??a.indexedAt)>Date.now()-7*86400_000);
 await database.prepare("insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at where json_extract(provider_cache.payload,'$.checkedAt') is null or json_extract(provider_cache.payload,'$.checkedAt')<=json_extract(excluded.payload,'$.checkedAt')").bind(key,JSON.stringify({...saved,articles}),new Date(Date.now()+7*86400_000).toISOString()).run();
}
async function read():Promise<Saved>{const row=await database.prepare('select payload from provider_cache where key=?').bind(key).first<{payload:string}>();if(!row)return empty();try{const d=JSON.parse(row.payload);return Array.isArray(d.articles)?{...empty(),...d,configuredProvider:d.configuredProvider??d.provider??'GDELT'}:empty();}catch{return empty();}}
export async function ingestNews(raw:unknown){
 const articles=normalizeNews(raw,directory);if(!articles.length)throw Error('Sin titulares verificables');const now=new Date().toISOString(),provider:NewsProvider=(raw as {provider?:string})?.provider==='Currents'?'Currents':'GDELT';
 await save({articles,fetchedAt:now,checkedAt:now,lastAttempt:'ready',provider,configuredProvider:desired(),failures:0,nextRefreshAt:new Date(Date.now()+interval).toISOString()});
 await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set expires_at=excluded.expires_at').bind('pm:news:lease:v2:'+desired(),'{}',new Date(Date.now()+interval).toISOString()).run();return {ok:true,articles:articles.length,fetchedAt:now};
}
// Public reads and scheduled jobs share one persistent budget: at most two Currents calls per 15 minutes.
export async function readNews():Promise<NewsFeed>{
 let saved=await read();const at=Date.now(),now=new Date(at).toISOString(),configured=desired(),switched=saved.configuredProvider!==configured;
 const last=Date.parse(saved.checkedAt??''),next=Date.parse(saved.nextRefreshAt??'');
 const due=switched||!Number.isFinite(last)||at>=(Number.isFinite(next)?next:last+interval);
 if(due){
  const lease='pm:news:lease:v2:'+configured,lock=await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at where provider_cache.expires_at<=?').bind(lease,'{}',new Date(at+interval).toISOString(),now).run();
  if(lock.meta.changes){
   let articles:NewsFeed['articles']=[],provider:NewsProvider='GDELT',retry=interval,lastError='empty_feed';
   if(configured==='Currents'){
    const candidates:unknown[]=[];provider='Currents';
    for(const language of ['es','en'] as const){
     try{const raw=await requestCurrents(process.env.CURRENTS_API_KEY!,language,at);candidates.push(...raw.articles);articles=normalizeNews({articles:candidates},directory,at);if(articles.length>=5)break;}
     catch(e){const error=e instanceof NewsProviderError?e:new NewsProviderError('Currents','invalid_articles');retry=Math.max(retry,error.retryMs);lastError=lastError==='empty_feed'?error.message:lastError+'; '+error.message;if(error.code==='http_429'||error.code==='http_401'||error.code==='http_403')break;}
    }
   }
   if(!articles.length){try{const raw=await requestGdelt(at);articles=normalizeNews(raw,directory,at);if(articles.length)provider='GDELT';else lastError='GDELT: empty_feed';}catch(e){const error=e instanceof NewsProviderError?e:new NewsProviderError('GDELT','invalid_articles');retry=Math.max(retry,error.retryMs);lastError=lastError==='empty_feed'?error.message:lastError+'; '+error.message;}}
   if(articles.length)saved={articles,fetchedAt:new Date().toISOString(),checkedAt:now,lastAttempt:'ready',provider,configuredProvider:configured,failures:0,nextRefreshAt:new Date(at+retry).toISOString()};
   else{const failures=(saved.failures??0)+1,delay=Math.max(retry,Math.min(6*60*60_000,interval*2**Math.min(failures-1,5)));saved={...saved,checkedAt:now,lastAttempt:'failed',configuredProvider:configured,failures,lastError,nextRefreshAt:new Date(at+delay).toISOString()};console.warn('News refresh unavailable:',lastError);}
   // Do not overwrite an upload that completed after this refresh began.
   const latest=await read();if(latest.checkedAt&&Date.parse(latest.checkedAt)>at)saved=latest;else {await save(saved);saved=await read();}
   await database.prepare("update provider_cache set expires_at=? where key=? and (select json_extract(payload,'$.checkedAt') from provider_cache where key=?)=?").bind(saved.nextRefreshAt??new Date(at+interval).toISOString(),lease,key,saved.checkedAt).run();
  }
 }
 const articles=saved.articles.filter(a=>Date.parse(a.publishedAt??a.indexedAt)>Date.now()-7*86400_000);
 if(articles.length!==saved.articles.length)await save({...saved,articles});
 return {articles,fetchedAt:saved.fetchedAt,checkedAt:saved.checkedAt,lastAttempt:saved.lastAttempt,provider:saved.provider,status:articles.length?newsFeedStatus(saved):'unavailable'};
}
