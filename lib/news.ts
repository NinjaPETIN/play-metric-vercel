export type NewsCategory='availability'|'rotation'|'roster'|'general';
export type NewsArticle={id:string;title:string;url:string;source:string;indexedAt:string;language:string;category:NewsCategory;playerIds:string[]};
export type NewsFeed={articles:NewsArticle[];fetchedAt:string|null;checkedAt:string|null;status:'ready'|'stale'|'unavailable';provider:'GDELT';lastAttempt:'ready'|'failed'|null};
export const newsSources=['nba.com','espn.com','espndeportes.espn.com','cbssports.com','apnews.com','sportingnews.com','as.com','marca.com'];
export function newsSource(url:string){try{const u=new URL(url),host=u.hostname.toLowerCase().replace(/^www\./,'');if(u.protocol!=='https:'||u.username||u.password||u.port)return null;return newsSources.find(d=>host===d||host.endsWith('.'+d))?host:null;}catch{return null;}}
const words=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function newsCategory(title:string):NewsCategory{const t=words(title);if(/\b(injury|injuries|injured|questionable|ruled out|lesion|lesiones|lesionado|baja medica)\b/.test(t))return 'availability';if(/\b(trade|traded|signs|signed|waived|traspaso|fichaje|contrato|plantilla)\b/.test(t))return 'roster';if(/\b(rotation|starter|starting|minutes|bench|rotacion|titular|minutos|suplente)\b/.test(t))return 'rotation';return 'general';}
export function normalizeNews(input:unknown,directory:Array<{id:string;name:string}>,now=Date.now()):NewsArticle[]{
 if(!input||typeof input!=='object'||!Array.isArray((input as {articles?:unknown}).articles))throw Error('Respuesta de noticias no válida');
 const seen=new Set<string>(),titles=new Set<string>(),out:NewsArticle[]=[];
 const identities=new Map<string,string[]>();for(const p of directory){const name=words(p.name);identities.set(name,[...(identities.get(name)??[]),p.id]);}
 for(const raw of (input as {articles:unknown[]}).articles.slice(0,100)){
  if(!raw||typeof raw!=='object')continue;const r=raw as Record<string,unknown>;
  if(typeof r.url!=='string'||r.url.length>2000||typeof r.title!=='string'||r.title.length>1000||typeof r.seendate!=='string')continue;
  const source=newsSource(r.url),match=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(r.seendate);if(!source||!match)continue;
  const indexedAt=`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`,date=Date.parse(indexedAt);if(!Number.isFinite(date)||date>now+300_000||date<now-7*86400_000)continue;
  const title=r.title.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().slice(0,240);if(title.length<12)continue;
  const normalized=' '+words(title)+' ',playerIds=[...identities].filter(([name,ids])=>ids.length===1&&normalized.includes(' '+name+' ')).map(([,ids])=>ids[0]);
  // A broad article search may match NBA in the body only. Keep basketball relevance in the displayed headline.
  if(!playerIds.length&&!/\b(nba|basketball|baloncesto|lakers|celtics|knicks|76ers|warriors|nuggets|thunder|spurs|rockets|bucks|cavaliers|mavericks|timberwolves)\b/.test(normalized))continue;
  const u=new URL(r.url);u.hash='';for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid|gclid)/i.test(key))u.searchParams.delete(key);
  const url=u.toString(),titleKey=words(title);if(seen.has(url)||titles.has(titleKey))continue;seen.add(url);titles.add(titleKey);
  out.push({id:url,title,url,source,indexedAt,language:typeof r.language==='string'?r.language.slice(0,30):'',category:newsCategory(title),playerIds});
 }
 return out.sort((a,b)=>b.indexedAt.localeCompare(a.indexedAt)).slice(0,60);
}
export function newsFeedStatus(feed:{fetchedAt:string|null;lastAttempt:'ready'|'failed'|null},now=Date.now()):NewsFeed['status']{const at=feed.fetchedAt?Date.parse(feed.fetchedAt):NaN;return !Number.isFinite(at)?'unavailable':feed.lastAttempt==='failed'||now-at>60*60_000||at>now+300_000?'stale':'ready';}
