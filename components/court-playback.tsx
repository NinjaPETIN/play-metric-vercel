'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {BoxData} from '../lib/live-boxscore';
import {courtShot,playbackFrame,type CourtSelection,type CourtPlay} from '../lib/court-playback';
import {recentCourt} from '../lib/recent-court';
import RecentCourtGraphic from './recent-court-graphic';
import styles from './court-playback.module.css';
export default function CourtPlayback({data,selection,onSelect,onPlayer}:{data:BoxData;selection:CourtSelection|null;onSelect:(p:CourtPlay|null)=>void;onPlayer:(id:string)=>void}){
 const [athlete,setAthlete]=useState('all'),[period,setPeriod]=useState('all'),[limit,setLimit]=useState(40),[expanded,setExpanded]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),expandButton=useRef<HTMLButtonElement>(null);
 const all=data.context?.plays??[],frame=playbackFrame(all,selection),active=frame.action;
 const filtered=all.filter(p=>(athlete==='all'||p.athleteId===athlete)&&(period==='all'||p.period===Number(period)));
 const frameIds=new Set(frame.plays.map(p=>p.id));
 const visible=selection?filtered.filter(p=>frameIds.has(p.id)):filtered;
 const shots=visible.flatMap(p=>{const shot=courtShot(p);return shot?[{play:p,...shot}]:[];}),located=shots.filter(s=>s.value!==1&&s.play.shotLocation);
 const index=active?filtered.findIndex(p=>p.id===active.id):-1,quarters=[...new Set(all.map(p=>p.period))];
 const game=selection&&active?{...data.game,awayScore:active.awayScore,homeScore:active.homeScore,clock:active.clock,period:active.period,state:'live' as const}:data.game;
 useEffect(()=>{if(!expanded)return;const el=dialog.current;el?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el?.close();document.body.style.overflow=previous;};},[expanded]);
 const closeExpanded=()=>{setExpanded(false);requestAnimationFrame(()=>expandButton.current?.focus());};
 const content=<div className={styles.workspace}>
 <header className={styles.toolbar}><strong>{selection?'Revisando jugada':data.game.state==='final'?'Última jugada':'En vivo'}</strong><div>{selection&&<button type="button" onClick={()=>onSelect(null)}>Volver al {data.game.state==='final'?'final':'directo'}</button>}{expanded?<button type="button" onClick={closeExpanded}>Cerrar cancha</button>:<button type="button" ref={expandButton} onClick={()=>setExpanded(true)}>Ampliar cancha</button>}</div></header>
 <div className={styles.layout}><div className={styles.visual}>
 <div className={styles.filters}><label>Jugador<select aria-label="Filtrar tiros por jugador" value={athlete} onChange={e=>{setAthlete(e.target.value);setLimit(40);onSelect(all.filter(p=>(e.target.value==='all'||p.athleteId===e.target.value)&&(period==='all'||p.period===Number(period))&&(e.target.value==='all'||!!courtShot(p))).at(-1)??null);}}><option value="all">Todos los jugadores</option>{data.teams.map(t=><optgroup key={t.code} label={t.name}>{t.players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>)}</select></label><label>Cuarto<select aria-label="Filtrar tiros por cuarto" value={period} onChange={e=>{setPeriod(e.target.value);setLimit(40);onSelect(all.filter(p=>(athlete==='all'||p.athleteId===athlete)&&(e.target.value==='all'||p.period===Number(e.target.value))&&(athlete==='all'||!!courtShot(p))).at(-1)??null);}}><option value="all">Todos</option>{quarters.map(p=><option key={p} value={p}>{p<=4?'C'+p:'TE'+(p-4)}</option>)}</select></label></div>
 <RecentCourtGraphic event={recentCourt(selection?frame.plays:frame.plays.filter(p=>(athlete==='all'||p.athleteId===athlete)&&(period==='all'||p.period===Number(period))),data.teams.map(t=>t.code))} teams={data.teams} game={game} onPlayer={id=>{setExpanded(false);onPlayer(id);}} frame={{plays:frame.plays,throughId:active?.id??''}} markers={located} onSelect={onSelect}/>
 {selection&&index<0&&<p className={styles.note}>La jugada elegida está fuera de estos filtros. <button type="button" onClick={()=>{setAthlete('all');setPeriod('all');}}>Quitar filtros</button></p>}
 <div className={styles.transport}><button type="button" disabled={index<=0} onClick={()=>onSelect(filtered[index-1])}>← Anterior</button><span>{active?`C${active.period} · ${active.clock}`:'Sin jugadas'}</span><button type="button" disabled={index<0||index>=filtered.length-1} onClick={()=>onSelect(filtered[index+1])}>Siguiente →</button></div>
 <p className={styles.summary}>{shots.filter(s=>s.made).length}/{shots.length} tiros convertidos{shots.length?' · '+Math.round(shots.filter(s=>s.made).length/shots.length*100)+'%':''} · {located.length} con ubicación. Verde: convertido; rojo: fallado. Tiros libres incluidos en el conteo.{selection?' Hasta la jugada seleccionada.':''}</p>
 {selection&&<p className={styles.note} role="status">La selección se mantiene mientras se actualiza el partido.{frame.missing?' Esta jugada se conserva desde tu selección.':''}</p>}
 </div><div className={styles.history}><h4>Historial de jugadas <small>{filtered.length}</small></h4><ol>{filtered.slice(-limit).reverse().map(p=>{const s=courtShot(p);return <li key={p.id}><button type="button" aria-pressed={selection?.id===p.id} onClick={()=>onSelect(p)}><time>C{p.period} · {p.clock}</time><span>{s&&<b className={s.made?styles.made:styles.missed}>{s.made?'+'+s.value:'×'}</b>}{p.text}</span><small>{p.awayScore}–{p.homeScore}</small></button></li>;})}</ol>{!filtered.length&&<p>No hay jugadas con estos filtros.</p>}{filtered.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+80)}>Mostrar jugadas anteriores</button>}</div></div></div>;
 return <section aria-label="Reproducción de jugadas" className={styles.root}>{expanded?<><button type="button" onClick={()=>setExpanded(false)}>Volver a la cancha del partido</button>{createPortal(<dialog ref={dialog} className={styles.dialog} aria-label="Cancha ampliada" onCancel={closeExpanded}>{content}</dialog>,document.body)}</>:content}</section>;
}
