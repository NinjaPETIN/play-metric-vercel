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
 const [section,setSection]=useState<'summary'|'stats'|'plays'>('stats');
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
 const resting=/entretiempo|descanso|fin del/i.test(game.detail);
 const unavailableCourt=game.state==='final'?'Finalizado':stale?'Sin confirmar':resting?'En descanso':'Sin confirmar';
 return <section className="live-boxscore" aria-label="Estadísticas del partido en vivo">
  <div className="live-box-heading"><div><h2>El partido, jugador por jugador</h2><p>{game.state==='final'?'Resultado final':game.detail} · {stale?'Lectura atrasada':'Fuente: ESPN'}</p></div><span className={'live-box-badge'+(stale?' is-stale':'')}>{stale?'Sin actualizar':game.state==='final'?'Final':resting?game.detail:'En vivo'}</span></div>
  <p className="live-box-source" role="status">Última lectura: {new Date(feed!.fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG · Consulta cada 15 s con la pestaña visible. Puede haber demora del proveedor.</p><button className="button subtle live-box-refresh" disabled={updating} onClick={()=>setRevision(n=>n+1)}>{updating?'Consultando…':'Actualizar ahora'}</button>
  <div className="segmented live-tracking-tabs" aria-label="Seguimiento del partido">{([['summary','Resumen'],['stats','Estadísticas'],['plays','Jugadas']] as const).map(([id,label])=><button key={id} className={section===id?'selected':''} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</div>
  {section==='summary'&&<LiveSummary data={data}/>}
  {section==='plays'&&<LivePlays data={data}/>}
  {section!=='plays'&&<div className="live-box-leaders">{data.teams.map(t=>{const p=[...t.players].filter(p=>!p.didNotPlay).sort((a,b)=>(b.points??0)-(a.points??0))[0];return <article className="card" key={t.code}><TeamLogo team={t.code} size={34}/>{p&&<><Portrait person={p}/><div><small>Líder en puntos · {t.code}</small><strong>{p.name}</strong><span>{p.points} PTS · {p.rebounds} REB · {p.assists} AST</span></div></>}</article>;})}</div>}
  {section==='stats'&&<><div className="live-box-format"><div className="segmented" aria-label="Formato de estadísticas"><button className={!expanded?'selected':''} aria-pressed={!expanded} onClick={()=>setExpanded(false)}>Resumen</button><button className={expanded?'selected':''} aria-pressed={expanded} onClick={()=>setExpanded(true)}>Todas las estadísticas</button></div><small>* Titular · Estado en cancha según la última lectura de ESPN</small></div>
  <div className={'live-box-teams live-box-paired '+(expanded?'is-expanded':'is-compact')}>{data.teams.map(t=><section className="card live-box-team" key={t.code}><div className="live-box-team-title"><TeamLogo team={t.code} size={32}/><h3>{t.name}</h3><strong>{t.score}</strong></div><div className="live-box-scroll" tabIndex={0} aria-label={`Deslizar estadísticas de ${t.name}`}><table><caption className="sr-only">Estadísticas individuales de {t.name}; titulares y suplentes</caption><thead><tr><th scope="col">Jugador</th>{columns.map(f=><th scope="col" key={f}>{headings[fields.indexOf(f)]}</th>)}</tr></thead><tbody>{playerGroups(t,game.state,stale).map(group=><Group key={group.title} players={group.players} title={group.title} columns={columns} showCourt={courtKnown(t,game.state,stale)} unavailableCourt={unavailableCourt}/>)}<tr className="live-box-totals"><th scope="row">Total del equipo</th>{columns.map(f=><td key={f}>{['points','rebounds','assists','steals','blocks','turnovers','fouls'].includes(f)?t.players.reduce((n,p)=>n+(typeof p[f]==='number'?Number(p[f]):0),0):'—'}</td>)}</tr></tbody></table></div></section>)}</div>
  </>}
  <p className="live-box-source">{resting?'El partido está en descanso: el quinteto se confirmará cuando se reanude el juego. ':data.teams.some(t=>!courtKnown(t,game.state,stale))&&game.state==='live'?'La fuente todavía no confirma quién está en cancha; se reintentará automáticamente. ':''}TC: tiros de campo · 3P: triples · TL: tiros libres · PÉR: pérdidas · FAL: faltas. MIN: tiempo jugado publicado por ESPN; puede venir redondeado a minutos enteros. * indica titular. En cancha/Banco solo se muestra con cinco activos confirmados por equipo, durante el juego y con una lectura reciente; no se deduce por ser titular. Los datos en curso no modifican el historial ni los promedios.</p>
 </section>;
}
function Group({players,title,columns,showCourt,unavailableCourt}:{players:Person[];title:string;columns:readonly StatField[];showCourt:boolean;unavailableCourt:string}){if(!players.length)return null;return <><tr className="live-box-group"><th colSpan={columns.length+1} scope="colgroup">{title}</th></tr>{players.map(p=><tr key={p.id} className={(p.didNotPlay?'live-box-dnp':'')+(showCourt&&p.onCourt?' live-box-on-court':'')}><th scope="row"><span className="live-box-identity"><span className="live-box-name" title={p.name}>{p.name}</span>{p.starter&&<span className="live-box-starter" aria-label="Titular" title="Titular">*</span>}</span><small className={"live-box-court-label"+(showCourt&&p.onCourt?"":" is-inactive")}>{showCourt&&p.onCourt?<><i aria-hidden="true"/>En cancha</>:showCourt?"Banco":unavailableCourt}</small>{p.didNotPlay&&<small>No participó</small>}</th>{columns.map(f=><td className={['points','rebounds','assists'].includes(f)?'live-box-primary':''} key={f}>{p[f]??'—'}</td>)}</tr>)}</>;}

function LiveSummary({data}:{data:BoxData}){
 const periods=data.context?.periods??[],count=Math.max(0,...periods.map(t=>t.scores.length));
 const rates=data.teams.map(t=>['fieldGoals','threes','freeThrows'].map(key=>{let made=0,attempted=0;for(const p of t.players){const v=p[key as 'fieldGoals']?.split('-').map(Number);if(v){made+=v[0];attempted+=v[1];}}return attempted?Math.round(made/attempted*1000)/10:null;}));
 return <section className="card live-summary"><h3>El partido en números</h3>{count>0?<div className="table-scroll"><table className="history"><thead><tr><th>Equipo</th>{Array.from({length:count},(_,i)=><th key={i}>{i<4?'C'+(i+1):'TE'+(i-3)}</th>)}<th>Total</th></tr></thead><tbody>{data.teams.map(t=><tr key={t.code}><th>{t.code}</th>{Array.from({length:count},(_,i)=><td key={i}>{periods.find(p=>p.team===t.code)?.scores[i]??'—'}</td>)}<td>{t.score}</td></tr>)}</tbody></table></div>:<p>Los parciales todavía no están publicados por la fuente.</p>}<div className="live-rate-comparison">{['Tiros de campo','Triples','Tiros libres'].map((label,i)=><div key={label}><strong>{data.teams[0].code} · {rates[0][i]===null?'—':rates[0][i]+'%'}</strong><span>{label}</span><strong>{data.teams[1].code} · {rates[1][i]===null?'—':rates[1][i]+'%'}</strong></div>)}</div></section>;
}
function LivePlays({data}:{data:BoxData}){
 const plays=data.context?.plays??[],periods=Array.from(new Set(plays.map(p=>p.period))).sort((a,b)=>b-a);
 return <section className="card live-play-feed"><h3>Jugada a jugada</h3><p>Descripción original de ESPN · La última jugada aparece primero.</p>{!plays.length?<p>La fuente todavía no publicó las jugadas de este partido.</p>:periods.map((period,i)=><details key={period} open={i===0}><summary>{period<=4?'Cuarto '+period:'Tiempo extra '+(period-4)}</summary><ol>{plays.filter(p=>p.period===period).slice().reverse().map(p=><li key={p.id}><time>{p.clock}</time>{p.team?<TeamLogo team={p.team} size={24}/>:<span/>}<span>{p.text}</span><strong>{p.awayScore}–{p.homeScore}</strong></li>)}</ol></details>)}</section>;
}
