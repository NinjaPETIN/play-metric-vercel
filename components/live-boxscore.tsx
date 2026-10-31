'use client';
import {useEffect,useState} from 'react';
import {boxFeedSchema,type BoxFeed,type BoxData} from '../lib/live-boxscore';
import type {ScheduledGame} from './calendar-panel';
import directory from '../lib/player-directory.json';
import TeamLogo from './team-logo';
import {LIVE_POLL_MS} from '../lib/live-refresh';
import {courtKnown,playerGroups} from '../lib/boxscore-display';
const nameKey=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const ids=new Map<string,string|null>();for(const p of directory){const key=nameKey(p.name);ids.set(key,ids.has(key)?null:String(p.id));}
type Person=BoxData['teams'][number]['players'][number];
const fields=['minutes','points','rebounds','assists','fieldGoals','threes','freeThrows','steals','blocks','turnovers','fouls','plusMinus'] as const;
const headings=['MIN','PTS','REB','AST','TC','3P','TL','ROB','BLQ','PÉR','FAL','+/−'];
const compactFields=['points','rebounds','assists','minutes','fouls'] as const;
type StatField=typeof fields[number];
function Portrait({person}:{person:Person}){const id=ids.get(nameKey(person.name));return <span className="live-box-portrait"><span>{person.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span>{id&&<img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>}</span>;}
export default function LiveBoxscore({match,initialFeed=null}:{match:ScheduledGame;initialFeed?:BoxFeed|null}){
 const [expanded,setExpanded]=useState(false);
 const [revision,setRevision]=useState(0),[updating,setUpdating]=useState(false);
 const [feed,setFeed]=useState<BoxFeed|null>(initialFeed),[failed,setFailed]=useState(false),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  let active=true,busy=false;let controller:AbortController|undefined;
  async function update(){if(document.visibilityState==='hidden'||busy)return;busy=true;setUpdating(true);controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),25000);
   try{const r=await fetch('/api/nba/live/'+match.id,{cache:'no-store',credentials:'omit',signal:controller.signal});if(!r.ok)throw Error();const data=boxFeedSchema.parse(await r.json());if(active){setFeed(data);setFailed(data.status==='unavailable');setNow(Date.now());}}
   catch{if(active){setFailed(true);setNow(Date.now());}}finally{clearTimeout(timeout);busy=false;if(active)setUpdating(false);}
  }
  const first=setTimeout(()=>void update(),0),timer=setInterval(()=>void update(),LIVE_POLL_MS),resume=()=>{if(document.visibilityState==='visible')void update();};document.addEventListener('visibilitychange',resume);
  return()=>{active=false;controller?.abort();clearTimeout(first);clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
 },[match.id,revision]);
 const age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity,data=age>=-5000&&age<300000&&feed?.data?.game.nbaId===match.id?feed.data:null,stale=failed||feed?.status!=='ready'||age>90000;
 if(!data)return <section className="card live-box-empty" aria-label="Estadísticas del partido en vivo"><h2>Estadísticas del partido</h2><p role="status">{!feed&&!failed?'Consultando las estadísticas de ambos equipos…':'Todavía no hay estadísticas verificadas disponibles para este partido. Se reintentará automáticamente.'}</p><button className="button subtle" disabled={updating} onClick={()=>setRevision(n=>n+1)}>{updating?'Consultando…':'Actualizar ahora'}</button><small>Esta vista cubre la jornada actual. Para partidos anteriores, abrí Resumen histórico. Los promedios de temporada se consultan por separado.</small></section>;
 const game=data.game,columns:readonly StatField[]=expanded?fields:compactFields;
 return <section className="live-boxscore" aria-label="Estadísticas del partido en vivo">
  <div className="live-box-heading"><div><h2>El partido, jugador por jugador</h2><p>{game.state==='final'?'Resultado final':game.detail} · {stale?'Lectura atrasada':'Fuente: ESPN'}</p></div><span className={'live-box-badge'+(stale?' is-stale':'')}>{stale?'Sin actualizar':game.state==='final'?'Final':'En vivo'}</span></div>
  <p className="live-box-source" role="status">Última lectura: {new Date(feed!.fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG · Consulta cada 15 s con la pestaña visible. Puede haber demora del proveedor.</p><button className="button subtle live-box-refresh" disabled={updating} onClick={()=>setRevision(n=>n+1)}>{updating?'Consultando…':'Actualizar ahora'}</button>
  <div className="live-box-leaders">{data.teams.map(t=>{const p=[...t.players].filter(p=>!p.didNotPlay).sort((a,b)=>(b.points??0)-(a.points??0))[0];return <article className="card" key={t.code}><TeamLogo team={t.code} size={34}/>{p&&<><Portrait person={p}/><div><small>Líder en puntos · {t.code}</small><strong>{p.name}</strong><span>{p.points} PTS · {p.rebounds} REB · {p.assists} AST</span></div></>}</article>;})}</div>
  <div className="live-box-format"><div className="segmented" aria-label="Formato de estadísticas"><button className={!expanded?'selected':''} aria-pressed={!expanded} onClick={()=>setExpanded(false)}>Resumen</button><button className={expanded?'selected':''} aria-pressed={expanded} onClick={()=>setExpanded(true)}>Todas las estadísticas</button></div><small>* Titular · En cancha: según la última lectura de ESPN</small></div>
  <div className={'live-box-teams live-box-paired '+(expanded?'is-expanded':'is-compact')}>{data.teams.map(t=><section className="card live-box-team" key={t.code}><div className="live-box-team-title"><TeamLogo team={t.code} size={32}/><h3>{t.name}</h3><strong>{t.score}</strong></div><div className="live-box-scroll" tabIndex={0} aria-label={`Deslizar estadísticas de ${t.name}`}><table><caption className="sr-only">Estadísticas individuales de {t.name}; titulares y suplentes</caption><thead><tr><th scope="col">Jugador</th>{columns.map(f=><th scope="col" key={f}>{headings[fields.indexOf(f)]}</th>)}</tr></thead><tbody>{playerGroups(t,game.state,stale).map(group=><Group key={group.title} players={group.players} title={group.title} columns={columns} showCourt={courtKnown(t,game.state,stale)}/>)}<tr className="live-box-totals"><th scope="row">Total del equipo</th>{columns.map(f=><td key={f}>{['points','rebounds','assists','steals','blocks','turnovers','fouls'].includes(f)?t.players.reduce((n,p)=>n+(typeof p[f]==='number'?Number(p[f]):0),0):'—'}</td>)}</tr></tbody></table></div></section>)}</div>
  <p className="live-box-source">TC: tiros de campo · 3P: triples · TL: tiros libres · PÉR: pérdidas · FAL: faltas. MIN: tiempo jugado publicado por ESPN; puede venir redondeado a minutos enteros. * indica titular. En cancha/Banco solo se muestra con cinco activos confirmados por equipo, durante el juego y con una lectura reciente; no se deduce por ser titular. Los datos en curso no modifican el historial ni los promedios.</p>
 </section>;
}
function Group({players,title,columns,showCourt}:{players:Person[];title:string;columns:readonly StatField[];showCourt:boolean}){if(!players.length)return null;return <><tr className="live-box-group"><th colSpan={columns.length+1} scope="colgroup">{title}</th></tr>{players.map(p=><tr key={p.id} className={(p.didNotPlay?'live-box-dnp':'')+(showCourt&&p.onCourt?' live-box-on-court':'')}><th scope="row"><span className="live-box-identity"><span className="live-box-name" title={p.name}>{p.name}</span>{p.starter&&<span className="live-box-starter" aria-label="Titular" title="Titular">*</span>}</span>{showCourt&&p.onCourt&&<small className="live-box-court-label"><i aria-hidden="true"/>En cancha</small>}{p.didNotPlay&&<small>No participó</small>}</th>{columns.map(f=><td className={['points','rebounds','assists'].includes(f)?'live-box-primary':''} key={f}>{p[f]??'—'}</td>)}</tr>)}</>;}
