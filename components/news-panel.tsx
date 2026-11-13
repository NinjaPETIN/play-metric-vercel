'use client';
import {useEffect,useState} from 'react';
import {ExternalLink,Newspaper,RefreshCw} from 'lucide-react';
import {distinctNewsStories,newsImageUrl,type NewsArticle,type NewsCategory,type NewsFeed} from '../lib/news';
import './news-panel.css';
const categories:Record<NewsCategory,string>={general:'NBA',availability:'Disponibilidad',rotation:'Rotación',roster:'Plantillas'};
const date=(s:string)=>new Date(s).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
export default function NewsPanel({playerId,expanded=false}:{playerId?:string;expanded?:boolean}){
 const [stored,setStored]=useState<{playerId?:string;feed:NewsFeed}|null>(null),[fetching,setBusy]=useState(true),[category,setCategory]=useState<NewsCategory|'all'>('all'),[reload,setReload]=useState(0),[more,setMore]=useState(false);
 const feed=stored?.playerId===playerId?stored?.feed??null:null,busy=fetching||(stored!==null&&stored.playerId!==playerId);
 useEffect(()=>{const c=new AbortController();fetch('/api/news'+(playerId?'?player='+encodeURIComponent(playerId):''),{signal:c.signal,cache:'no-store'}).then(r=>r.json() as Promise<NewsFeed>).then(d=>{if(!Array.isArray(d.articles))throw Error('Índice no válido');if(!c.signal.aborted)setStored(previous=>d.status==='unavailable'&&previous&&previous.playerId===playerId&&previous.feed.articles.length?{playerId,feed:{...previous.feed,status:'stale',lastAttempt:'failed'}}:{playerId,feed:d});}).catch(()=>{if(!c.signal.aborted)setStored(previous=>previous&&previous.playerId===playerId&&previous.feed.articles.length?{playerId,feed:{...previous.feed,status:'stale',lastAttempt:'failed'}}:{playerId,feed:{articles:[],fetchedAt:null,checkedAt:null,status:'unavailable',provider:'GDELT',lastAttempt:'failed'}});}).finally(()=>{if(!c.signal.aborted)setBusy(false);});return()=>c.abort();},[playerId,reload]);
 const articles=distinctNewsStories((feed?.articles??[]).filter(a=>category==='all'||a.category===category));
 return <section id="news-context" className="card catalog-radar news-panel" aria-label="Noticias y contexto"><div className="card-title"><h3><Newspaper size={18}/>Noticias y contexto</h3><button className="icon" aria-label="Consultar noticias" disabled={busy} onClick={()=>{setBusy(true);setReload(n=>n+1);}}><RefreshCw size={14}/></button></div><p className="catalog-radar-note">{playerId?'Titulares que mencionan a este jugador.':'Titulares de medios externos; leé la nota original.'} La categoría indica el tema, no confirma una baja.</p><div className="news-tabs" role="group" aria-label="Categorías de noticias">{(['all','availability','rotation','roster'] as const).map(c=><button key={c} aria-pressed={category===c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c==='all'?'Todas':c==='availability'?'Lesiones':categories[c]}</button>)}</div><div aria-live="polite">{busy&&!articles.length?<p className="muted">Consultando titulares…</p>:<>{busy&&<p className="muted">Actualizando noticias…</p>}{feed?.status==='stale'&&<p className="news-warning">No pudimos actualizar la fuente. Estos titulares pueden estar desactualizados.</p>}{!articles.length&&<p className="muted">{feed?.status==='unavailable'?'La fuente de noticias no está disponible ahora.':playerId?'No encontramos titulares recientes que mencionen a este jugador.':'Sin titulares recientes para esta categoría.'}</p>}{articles.slice(0,expanded||more?40:3).map((a,index)=><NewsStory key={a.id} article={a} featured={index===0}/>)}</>}</div>{!expanded&&articles.length>3&&<button className="card-link" aria-expanded={more} onClick={()=>setMore(v=>!v)}>{more?'Mostrar menos':'Ver más noticias'} →</button>}{feed?.provider==='Currents'&&<small className="news-attribution"><a href="https://currentsapi.services/" target="_blank" rel="noopener noreferrer">Currents</a></small>}</section>;
}

function NewsStory({article:a,featured}:{article:NewsArticle;featured:boolean}){
 const image=newsImageUrl(a.imageUrl),[failed,setFailed]=useState<string|null>(null),showImage=!!image&&failed!==image;
 return <article className={'news-item news-story'+(featured?' news-story-featured':'')+(showImage?'':' news-story-text-only')}>
  {showImage&&<div className="news-story-media">
   {/* Images are supplied by the news provider; no article scraping or server-side proxy. */}
   {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image} alt="" width={480} height={270} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(image)}/>
  </div>}
  <div className="news-story-copy"><div className="news-story-meta"><span>{a.source}</span>{a.category!=='general'&&<span className={'news-category '+a.category}>{categories[a.category]}</span>}</div><a className="news-story-title" href={a.url} target="_blank" rel="noopener noreferrer"><strong>{a.title}</strong><ExternalLink size={13} aria-hidden="true"/></a><time dateTime={a.publishedAt??a.indexedAt}>{date(a.publishedAt??a.indexedAt)} ARG</time></div>
 </article>;
}
