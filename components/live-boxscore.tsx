'use client';
import {useEffect,useState} from 'react';
import {Flag,ArrowRightLeft,CircleX,Pause} from 'lucide-react';
import {boxFeedSchema,type BoxFeed,type BoxData} from '../lib/live-boxscore';
import type {ScheduledGame} from './calendar-panel';
import Portrait from './match-player-portrait';
import TeamLogo from './team-logo';
import {LIVE_POLL_MS} from '../lib/live-refresh';
import {courtKnown,playerGroups} from '../lib/boxscore-display';
import MatchPreview from './match-preview';
import {recentCourt} from '../lib/recent-court';
type Person=BoxData['teams'][number]['players'][number];
const fields=['minutes','points','rebounds','assists','fieldGoals','threes','freeThrows','steals','blocks','turnovers','fouls','plusMinus'] as const;
const headings=['MIN','PTS','REB','AST','TC','3P','TL','ROB','BLQ','PÉR','FAL','+/−'];
const compactFields=['points','rebounds','assists','minutes','fouls'] as const;
type StatField=typeof fields[number];
export default function LiveBoxscore({match,initialFeed=null,onHistorical,onPlayers}:{match:ScheduledGame;initialFeed?:BoxFeed|null;onHistorical?:()=>void;onPlayers?:()=>void}){
 const [expanded,setExpanded]=useState(true);
 const [section,setSection]=useState<'summary'|'stats'|'plays'|'preview'>('summary');
 useEffect(()=>{const requested=new URLSearchParams(window.location.search).get('liveSection');const timer=setTimeout(()=>{if(requested==='plays'||requested==='stats')setSection(requested);},0);return()=>clearTimeout(timer);},[]);
 
 const [feed,setFeed]=useState<BoxFeed|null>(initialFeed),[failed,setFailed]=useState(false),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  let active=true,busy=false;let controller:AbortController|undefined;
  async function update(){if(document.visibilityState==='hidden'||busy)return;busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),25000);
   try{const r=await fetch('/api/nba/live/'+match.id,{cache:'no-store',credentials:'omit',signal:controller.signal});if(!r.ok)throw Error();const data=boxFeedSchema.parse(await r.json());if(active){setFeed(data);setFailed(data.status==='unavailable');setNow(Date.now());}}
   catch{if(active){setFailed(true);setNow(Date.now());}}finally{clearTimeout(timeout);busy=false;}
  }
  const first=setTimeout(()=>void update(),0),timer=setInterval(()=>void update(),LIVE_POLL_MS),resume=()=>{if(document.visibilityState==='visible')void update();};document.addEventListener('visibilitychange',resume);
  return()=>{active=false;controller?.abort();clearTimeout(first);clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
 },[match.id]);
 const age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity,data=age>=-5000&&age<300000&&feed?.data?.game.nbaId===match.id?feed.data:null,stale=failed||feed?.status!=='ready'||age>90000;
 const navigation=<div className="segmented live-tracking-tabs" aria-label="Seguimiento del partido">{([['summary','Resumen'],['stats','Estadísticas'],['plays','Jugadas'],['preview','Previa']] as const).map(([id,label])=><button key={id} className={section===id?'selected':''} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</div>;
 if(section==='preview')return <section className="live-boxscore">{navigation}<MatchPreview match={match} onHistorical={onHistorical} onPlayers={onPlayers}/></section>;
 if(!data)return <>{navigation}<section className="card live-box-empty" aria-label="Estadísticas del partido en vivo"><h2>Estadísticas del partido</h2><p role="status">{!feed&&!failed?'Consultando las estadísticas de ambos equipos…':'Todavía no hay estadísticas verificadas disponibles para este partido. Se reintentará automáticamente.'}</p></section></>;
 const game=data.game,columns:readonly StatField[]=section==='summary'?['points','rebounds','assists','minutes']:section==='stats'&&expanded?fields:compactFields;
 const resting=/entretiempo|descanso|fin del/i.test(game.detail);
 const unavailableCourt=game.state==='final'?'Finalizado':stale?'Sin confirmar':resting?'En descanso':'Sin confirmar';
 return <section className="live-boxscore" aria-label="Estadísticas del partido en vivo">
  {navigation}
  {stale&&<p className="live-delayed-notice" role="status">Datos demorados · Última lectura {new Date(feed!.fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG</p>}
  {section==='plays'?<LivePlays data={data}/>:<div className={'live-game-layout '+(section==='summary'?'is-overview':'is-boxscore')}>
   {section==='summary'&&<aside className="live-game-timeline"><LiveRecent data={data} onFull={()=>setSection('plays')}/></aside>}
   <div className="live-game-main"><div className="live-game-top"><LiveSummary data={data} compact={section==='summary'}/>
  <div className="live-box-leaders">{data.teams.map(t=>{const p=[...t.players].filter(p=>!p.didNotPlay).sort((a,b)=>(b.points??0)-(a.points??0))[0];return <article className="card" key={t.code}><TeamLogo team={t.code} size={34}/>{p&&<><Portrait person={p}/><div><small>Líder en puntos · {t.code}</small><strong>{p.name}</strong><span>{p.points} PTS · {p.rebounds} REB · {p.assists} AST</span></div></>}</article>;})}</div>
</div>
  <div className="live-box-format">{section==='stats'&&<div className="segmented" aria-label="Formato de estadísticas"><button className={!expanded?'selected':''} aria-pressed={!expanded} onClick={()=>setExpanded(false)}>Vista compacta</button><button className={expanded?'selected':''} aria-pressed={expanded} onClick={()=>setExpanded(true)}>Todas las estadísticas</button></div>}<small>* Titular · Estado en cancha según la última lectura de ESPN</small></div>
  <div className={'live-box-teams live-box-paired '+(section==='stats'&&expanded?'is-expanded':'is-compact')}>{data.teams.map(t=><section className="card live-box-team" key={t.code}><div className="live-box-team-title"><TeamLogo team={t.code} size={32}/><h3>{t.name}</h3><strong>{t.score}</strong></div><div className="live-box-scroll" tabIndex={0} aria-label={`Deslizar estadísticas de ${t.name}`}><table><caption className="sr-only">Estadísticas individuales de {t.name}; titulares y suplentes</caption><thead><tr><th scope="col">Jugador</th>{columns.map(f=><th scope="col" key={f}>{headings[fields.indexOf(f)]}</th>)}</tr></thead><tbody>{playerGroups(t,game.state,stale).map(group=><Group key={group.title} players={group.players} title={group.title} columns={columns} showCourt={courtKnown(t,game.state,stale)} unavailableCourt={unavailableCourt}/>)}<tr className="live-box-totals"><th scope="row">Total del equipo</th>{columns.map(f=><td key={f}>{['points','rebounds','assists','steals','blocks','turnovers','fouls'].includes(f)?t.players.reduce((n,p)=>n+(typeof p[f]==='number'?Number(p[f]):0),0):'—'}</td>)}</tr></tbody></table></div></section>)}</div>
</div></div>}

 </section>;
}
function Group({players,title,columns,showCourt,unavailableCourt}:{players:Person[];title:string;columns:readonly StatField[];showCourt:boolean;unavailableCourt:string}){if(!players.length)return null;return <><tr className="live-box-group"><th colSpan={columns.length+1} scope="colgroup">{title}</th></tr>{players.map(p=><tr key={p.id} className={(p.didNotPlay?'live-box-dnp':'')+(showCourt&&p.onCourt?' live-box-on-court':'')}><th scope="row"><span className="live-box-identity"><span className="live-box-name" title={p.name}>{p.name}</span>{p.starter&&<span className="live-box-starter" aria-label="Titular" title="Titular">*</span>}</span><small className={"live-box-court-label"+(showCourt&&p.onCourt?"":" is-inactive")}>{showCourt&&p.onCourt?<><i aria-hidden="true"/>En cancha</>:showCourt?"Banco":unavailableCourt}</small>{p.didNotPlay&&<small>No participó</small>}</th>{columns.map(f=><td className={['points','rebounds','assists'].includes(f)?'live-box-primary':''} key={f}>{p[f]??'—'}</td>)}</tr>)}</>;}

function LiveSummary({data,compact=false}:{data:BoxData;compact?:boolean}){
 const periods=data.context?.periods??[],count=Math.max(0,...periods.map(t=>t.scores.length));
 const rates=data.teams.map(t=>['fieldGoals','threes','freeThrows'].map(key=>{let made=0,attempted=0;for(const p of t.players){const v=p[key as 'fieldGoals']?.split('-').map(Number);if(v){made+=v[0];attempted+=v[1];}}return attempted?Math.round(made/attempted*1000)/10:null;}));
 const totals=data.teams.map(t=>['rebounds','turnovers'].map(key=>t.players.reduce((sum,p)=>sum+(p[key as 'rebounds']??0),0)));
 return <><section className="card live-summary"><h3>Marcador por cuartos</h3>{count>0?<div className="table-scroll"><table className="history"><thead><tr><th>Equipo</th>{Array.from({length:count},(_,i)=><th key={i}>{i<4?'C'+(i+1):'TE'+(i-3)}</th>)}<th>Total</th></tr></thead><tbody>{data.teams.map(t=><tr key={t.code}><th><TeamLogo team={t.code} size={24}/>{t.code}</th>{Array.from({length:count},(_,i)=><td key={i}>{periods.find(p=>p.team===t.code)?.scores[i]??'—'}</td>)}<td>{t.score}</td></tr>)}</tbody></table></div>:<p>Los parciales todavía no están publicados por la fuente.</p>}</section><section className="card live-comparison"><h3 className="live-comparison-title">Comparativa de equipos</h3><div className="live-rate-comparison">{['Tiros de campo','Triples','Tiros libres','Rebotes','Pérdidas'].map((label,i)=>({label,i})).filter(({i})=>!compact||[0,3,4].includes(i)).map(({label,i})=>{const a=i<3?rates[0][i]:totals[0][i-3],b=i<3?rates[1][i]:totals[1][i-3],max=Math.max(a??0,b??0,1);return <div key={label}><strong>{data.teams[0].code} · {a===null?'—':a+(i<3?'%':'')}<meter min={0} max={i<3?100:max} value={a??0} aria-label={data.teams[0].code+' '+label}/></strong><span>{label}</span><strong>{data.teams[1].code} · {b===null?'—':b+(i<3?'%':'')}<meter min={0} max={i<3?100:max} value={b??0} aria-label={data.teams[1].code+' '+label}/></strong></div>;})}</div></section></>;
}
function LivePlays({data,compact=false}:{data:BoxData;compact?:boolean}){
 const all=data.context?.plays??[],plays=compact?all.slice(-12):all,periods=Array.from(new Set(plays.map(p=>p.period))).sort((a,b)=>a-b);
 return <section className="card live-play-feed"><h3>{compact?'Últimas jugadas':'Jugada a jugada'}</h3><p>Descripción original de ESPN · La última jugada aparece primero.</p>{!plays.length?<p>La fuente todavía no publicó las jugadas de este partido.</p>:periods.map(period=><details key={period} open={data.game.state==='live'&&period===data.game.period}><summary className="quarter-heading"><svg className="quarter-toggle" width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden="true"><path d="m4 6 3-3 3 3m-6 6 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="quarter-title">{period<=4?'Cuarto '+period:'Tiempo extra '+(period-4)}</span>{data.teams.map(t=><span className="quarter-team" key={t.code}><TeamLogo team={t.code} size={24}/><span className="quarter-team-name">{t.name}</span><span className="quarter-team-code">{t.code}</span><b>{data.context?.periods.find(q=>q.team===t.code)?.scores[period-1]??'—'}</b></span>)}</summary><ol>{plays.filter(p=>p.period===period).slice().reverse().map(p=><li key={p.id} className={all.indexOf(p)>0&&(p.awayScore>all[all.indexOf(p)-1].awayScore||p.homeScore>all[all.indexOf(p)-1].homeScore)?'is-scoring':''}><time>{p.clock}</time>{p.team?<TeamLogo team={p.team} size={24}/>:<span/>}<span>{p.text}</span><strong>{p.awayScore}–{p.homeScore}</strong></li>)}</ol></details>)}</section>;
}

function LiveRecent({data,onFull}:{data:BoxData;onFull:()=>void}){
 const [tab,setTab]=useState<'plays'|'teams'>('plays');
 const all=data.context?.plays??[],ordered=all.slice().reverse(),{action,timeout,timeoutTeam}=recentCourt(all,data.teams.map(t=>t.code)),recent=ordered.filter(p=>p.id!==action?.id).slice(0,12);
 const person=action?.athleteId?data.teams.flatMap(t=>t.players).find(p=>p.id===action.athleteId):null;
 return <section className="live-recent-panel" aria-label="Jugadas recientes"><div className="recent-panel-heading"><h3>Jugada a jugada</h3><small>Más reciente primero</small></div><header className={'recent-feature'+(action?.pointsAdded?' is-scoring':'')}><time>{action?.clock??'—'}<small>{action?.period?'C'+action.period:''}</small></time>{person?<Portrait person={person}/>:action?.team?<TeamLogo team={action.team} size={44}/>:<Pause size={30} aria-hidden="true"/>}<div>{action&&<EventMark play={action}/>}<p>{action?.text??'Esperando las primeras jugadas.'}</p><small>{action?data.game.away+' '+action.awayScore+' – '+data.game.home+' '+action.homeScore:''}</small></div></header>
 <div className={"recent-court"+(timeout?" is-timeout":"")}><svg viewBox="0 0 94 50" role="img" aria-label={timeout?"Cancha en tiempo muerto":action?.shotLocation?"Ubicación aproximada del tiro respecto del aro, orientación de referencia":"Esquema de cancha, sin posición confirmada de la acción"}><rect width="94" height="50" rx="1" fill="currentColor"/><g fill="none" stroke="white" strokeWidth=".45" opacity=".85"><rect x="3" y="2" width="88" height="46"/><path d="M47 2v46"/><circle cx="47" cy="25" r="6"/><path d="M3 17h18v16H3M91 17H73v16h18"/><circle cx="21" cy="25" r="6"/><circle cx="73" cy="25" r="6"/><path d="M3 5h10a24 24 0 0 1 0 40H3M91 5H81a24 24 0 0 0 0 40h10"/><path d="M6 22v6m82-6v6"/><circle cx="7" cy="25" r=".8"/><circle cx="87" cy="25" r=".8"/></g>{!timeout&&action?.shotLocation&&<circle cx={5.25+action.shotLocation.y} cy={action.shotLocation.x} r="1.5" fill={action.pointsAdded?'#199f79':'#e15b75'} stroke="white" strokeWidth=".5"/>}<text x="47" y="26" textAnchor="middle" fill="white" fontSize="3" fontWeight="700">STATLANE</text></svg>{timeout&&<div className="court-timeout" role="status">{timeoutTeam&&<TeamLogo team={timeoutTeam} size={44}/>}<strong>TIMEOUT</strong><span>{timeoutTeam?data.teams.find(t=>t.code===timeoutTeam)?.name:"Tiempo muerto"} · {action?.clock}</span></div>}<small>{timeout?"Tiempo muerto · Según la última jugada publicada":action?.shotLocation?'Tiro aproximado · Aro a la izquierda como referencia':'Cancha de referencia · Sin ubicación confirmada'}</small></div>
 <div className="recent-switch" role="group" aria-label="Contenido del seguimiento reciente"><button className={tab==='plays'?'selected':''} aria-pressed={tab==='plays'} onClick={()=>setTab('plays')}>Jugadas</button><button className={tab==='teams'?'selected':''} aria-pressed={tab==='teams'} onClick={()=>setTab('teams')}>Equipos</button></div>
 {tab==='plays'?<><ol className="recent-action-list">{recent.map(p=>{const player=data.teams.flatMap(t=>t.players).find(player=>player.id===p.athleteId);return <li key={p.id} className={p.pointsAdded?'is-scoring':''}><time>{p.clock}<small>{p.period<=4?'C'+p.period:'TE'+(p.period-4)}</small></time>{player?<Portrait person={player}/>:p.team?<TeamLogo team={p.team} size={36}/>:<span/>}<div><EventMark play={p}/><span>{p.text}</span></div></li>;})}</ol>{!recent.length&&<p className="muted">Las jugadas todavía no están disponibles.</p>}<button className="button recent-full" onClick={onFull}>Ver todas las jugadas →</button></>:<div className="recent-team-stats">{['points','rebounds','assists','steals','blocks','turnovers'].map(key=><div key={key}><b>{data.teams[0].players.reduce((sum,p)=>sum+(Number(p[key as 'points'])||0),0)}</b><span>{{points:'Puntos',rebounds:'Rebotes',assists:'Asistencias',steals:'Robos',blocks:'Bloqueos',turnovers:'Pérdidas'}[key]}</span><b>{data.teams[1].players.reduce((sum,p)=>sum+(Number(p[key as 'points'])||0),0)}</b></div>)}<small>{data.teams[0].code} · {data.teams[1].code} · Totales individuales registrados</small></div>}
 </section>;
}
function EventMark({play}:{play:NonNullable<BoxData['context']>['plays'][number]}){
 if(play.pointsAdded)return <b className="recent-event-mark is-score" aria-label={play.pointsAdded+' puntos anotados'}>+{play.pointsAdded}</b>;
 if(/\bfoul\b/i.test(play.text))return <span className="recent-event-mark is-foul" title="Falta"><Flag size={20}/></span>;
 if(/\bmisses\b/i.test(play.text))return <span className="recent-event-mark is-miss" title="Tiro fallado"><CircleX size={20}/></span>;
 if(/enters the game/i.test(play.text))return <span className="recent-event-mark" title="Cambio"><ArrowRightLeft size={20}/></span>;
 return null;
}
