'use client';

import {useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import {X} from 'lucide-react';
import type {BoxData} from '../lib/live-boxscore';
import {playerShots} from '../lib/match-player-shots';
import Portrait from './match-player-portrait';
import TeamLogo from './team-logo';
import {FollowButton} from './watchlist-provider';

type Person = BoxData['teams'][number]['players'][number];
type Attempts = [number,number];

function pair(value: string | null): Attempts | null {
 const match = /^(\d+)[/-](\d+)$/.exec(value ?? '');
 return match ? [Number(match[1]),Number(match[2])] : null;
}

function subtract(total: Attempts | null, part: Attempts | null): Attempts | null {
 if (!total || !part) return null;
 const made = total[0]-part[0], attempted = total[1]-part[1];
 return made >= 0 && attempted >= made ? [made,attempted] : null;
}

function tally(shots: ReturnType<typeof playerShots>, value?: number): Attempts {
 const attempts = shots.filter(({shot}) => value === undefined ? shot.value > 1 : shot.value === value);
 return [attempts.filter(({shot}) => shot.made).length, attempts.length];
}

export default function MatchPlayerSheet({data,person,team,status,profileId,followKey,onCompare,onClose}: {
 data: BoxData; person: Person; team: string; status: string; profileId: string | null;
 followKey: string; onCompare?: (id: string) => void; onClose: () => void;
}) {
 const dialog = useRef<HTMLDialogElement>(null);
 const title = useId();
 const [quarter,setQuarter] = useState<number | null>(null);
 useEffect(() => {
  const sheet = dialog.current;
  sheet?.showModal();
  return () => {sheet?.close();};
 },[]);
 const plays = data.context?.plays ?? [];
 const periods = Math.max(data.game.period,...plays.map(p=>p.period),...(data.context?.periods??[]).map(p=>p.scores.length));
 const shots = playerShots(plays,person.id,null);
 const selected = quarter === null ? shots : shots.filter(p=>p.period===quarter);
 const marks = selected.filter(p=>p.shot.value>1 && p.shotLocation);
 const periodAvailable = quarter !== null && plays.some(play=>play.period===quarter);
 const confirmedTally = (value: string | null, type?: number) => {
  const recorded = pair(value);
  if (quarter === null) return recorded;
  const observed = tally(shots,type);
  return periodAvailable && recorded?.[0] === observed[0] && recorded?.[1] === observed[1] ? tally(selected,type) : null;
 };
 const fg = confirmedTally(person.fieldGoals);
 const threes = confirmedTally(person.threes,3);
 const ft = confirmedTally(person.freeThrows,1);
 const scored = (attempts: typeof shots) => attempts.reduce((sum,{shot})=>sum+(shot.made?shot.value:0),0);
 const points = quarter === null ? person.points : periodAvailable && scored(shots) === person.points ? scored(selected) : null;
 const stats = [
  ['Puntos',points],
  ...(quarter === null ? [['Minutos jugados',person.minutes],['Rebotes',person.rebounds],['Asistencias',person.assists]] : []),
  ['Tiros de campo',fg?.join('/')],['Tiros de 2 puntos',subtract(fg,threes)?.join('/')],
  ['Triples',threes?.join('/')],['Tiros libres',ft?.join('/')],
 ];
 return <dialog ref={dialog} className="match-player-sheet" aria-labelledby={title}
  onCancel={event=>{event.preventDefault();onClose();}}
  onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className="match-player-sheet-content">
   <header>
    <Portrait person={person}/>
    <div><h2 id={title}>{person.name}</h2><p><TeamLogo team={team} size={22}/> {team} · {status}</p></div>
    <FollowButton item={followKey} name={person.name}/>
    <button className="icon" type="button" onClick={onClose} aria-label="Cerrar ficha"><X size={20}/></button>
   </header>
   {profileId&&<div className="match-player-sheet-actions">
    <Link className="button" href={'/jugadores/'+profileId}>Ver perfil</Link>
    {onCompare&&<button className="button" type="button" onClick={()=>onCompare(profileId)}>Comparar</button>}
   </div>}
   <div className="segmented match-player-periods" aria-label="Período del partido">
    {[null,...Array.from({length:periods},(_,i)=>i+1)].map(period=><button type="button" key={period??'all'}
     className={quarter===period?'selected':''} aria-pressed={quarter===period} onClick={()=>setQuarter(period)}>
     {period===null?'Todos':period<=4?'C'+period:'TE'+(period-4)}
    </button>)}
   </div>
   <figure className="match-player-court">
    <svg viewBox="0 0 50 46" role="img" aria-label={`Mapa de tiros. ${marks.filter(p=>p.shot.made).length} convertidos y ${marks.filter(p=>!p.shot.made).length} fallados con ubicación.`}>
     <g className="match-player-court-lines">
      <rect x=".5" y=".5" width="49" height="45"/>
      <path d="M17 .5V19h16V.5 M22 3.8h6 M3 .5V14a23.75 23.75 0 0 0 44 0V.5 M19 45.5a6 6 0 0 1 12 0"/>
      <circle cx="25" cy="5.25" r=".75"/><circle cx="25" cy="19" r="6"/>
     </g>
     {marks.map(({id,shot,shotLocation})=>{
      const {x,y}=shotLocation!;
      return shot.made ? <circle key={id} className="match-shot-made" cx={x} cy={y+5.25} r="1"/>
       : <path key={id} className="match-shot-missed" transform={`translate(${x} ${y+5.25})`} d="M-.75 -.75l1.5 1.5m0-1.5-1.5 1.5"/>;
     })}
    </svg>
    <figcaption>{marks.length>0?<><span className="shot-made-label">● Convertido</span><span className="shot-missed-label">× Fallado</span></>:'Sin tiros con ubicación disponible'}</figcaption>
   </figure>
   <h3>{quarter===null?'Estadísticas del partido':'Estadísticas del período'}</h3>
   {quarter!==null&&(!fg||!threes||!ft||points===null)&&<p className="muted">Algunas estadísticas del período siguen sin confirmar.</p>}
   <dl>{stats.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'—'}</dd></div>)}</dl>
  </div>
 </dialog>;
}
