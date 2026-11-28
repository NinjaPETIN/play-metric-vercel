'use client';

import {useState} from 'react';
import type {BoxData} from '../lib/live-boxscore';
import type {recentCourt} from '../lib/recent-court';
import TeamLogo from './team-logo';
import styles from './recent-court-graphic.module.css';

const coordinateNumber = new Intl.NumberFormat('es-AR', {maximumFractionDigits: 2});

export default function RecentCourtGraphic({event,teams}:{event:ReturnType<typeof recentCourt>;teams:BoxData['teams']}){
 const {action,timeout,timeoutTeam,shot}=event;
 const [replay,setReplay]=useState(0),[perspective,setPerspective]=useState(true);
 const location=shot?.value===1?null:shot?.play.shotLocation;
 // The feed measures X across the court and Y from the basket.
 const startX=location?7+.92*location.y:17;
 const startY=location?2+.92*location.x:17;
 const coordinates=location?`X: ${coordinateNumber.format(location.x)} · Y: ${coordinateNumber.format(location.y)} pies`:null;
 const outcome=shot?(shot.value===1?'Tiro libre ': 'Tiro ')+(shot.made?'anotado':'fallado'):'Cancha de referencia';
 const clock=shot?.play.clock;
 const timeoutName=teams.find(team=>team.code===timeoutTeam)?.name;
 const trajectory=shot?.made
  ? `M ${startX} ${startY} Q ${Math.max(startX,11)} ${Math.min(startY,25)-9} 7 25 L 5 27`
  : `M ${startX} ${startY} Q ${Math.max(startX,13)} ${Math.min(startY,22)-9} 9 24 Q 12 20 15 16`;

 return <figure className={'recent-court'+(timeout?' is-timeout':'')}>
  <div className={styles.cameraControls} role="group" aria-label="Vista de la cancha"><button type="button" aria-pressed={perspective} onClick={()=>setPerspective(true)}>Perspectiva</button><button type="button" aria-pressed={!perspective} onClick={()=>setPerspective(false)}>Desde arriba</button></div>
  <div className={styles.stage+(perspective?' '+styles.perspective:'')}>
  <svg key={shot?`${shot.play.id}:${shot.made}:${startX}:${startY}:${replay}`:'court-idle'} viewBox="0 0 94 50" role="img" aria-label={timeout?'Cancha durante el tiempo muerto':[outcome,coordinates].filter(Boolean).join(' · ')}>
   <rect width="94" height="50" rx="1" fill="#14253d"/><rect x="3" y="17" width="18" height="16" fill="#545ce255"/><rect x="73" y="17" width="18" height="16" fill="#18b9a355"/>
   <g fill="none" stroke="white" strokeWidth=".45" opacity=".85">
    <rect x="3" y="2" width="88" height="46"/><path d="M47 2v46"/><circle cx="47" cy="25" r="6"/>
    <path d="M3 17h18v16H3M91 17H73v16h18"/><circle cx="21" cy="25" r="6"/><circle cx="73" cy="25" r="6"/>
    <path d="M3 5h10a24 24 0 0 1 0 40H3M91 5H81a24 24 0 0 0 0 40h10M6 22v6m82-6v6"/>
    <circle cx="7" cy="25" r=".8"/><circle cx="87" cy="25" r=".8"/>
   </g>
   <text x="47" y="26" textAnchor="middle" fill="white" fontSize="3" fontWeight="700">STATLANE</text>
   {shot&&<g key={shot.play.id+':'+shot.made} className={shot.made?'court-shot-made':'court-shot-missed'}>
    {location&&<>
     <path d={trajectory} fill="none" stroke="currentColor" strokeWidth=".38" strokeDasharray="1.15 1.1" opacity=".75"/>
     <circle cx={startX} cy={startY} r="1.7" fill="currentColor" stroke="white" strokeWidth=".55"/>
    </>}
    {shot.made?<circle cx="7" cy="25" r="2.9" fill="none" stroke="currentColor" strokeWidth=".65"/>:
     <path d="m11 22 3 3m0-3-3 3" fill="none" stroke="currentColor" strokeWidth=".85" strokeLinecap="round"/>}
    <circle className="court-flight-ball" r="1.25" fill="#ffac59" stroke="#fff1df" strokeWidth=".25">
     <animateMotion path={trajectory} dur="1.1s" fill="freeze"/>
     <animate attributeName="opacity" values="1;1;0" keyTimes="0;.93;1" dur="1.1s" fill="freeze"/>
    </circle>
   </g>}
  </svg>
  {timeout&&<div className="court-timeout" role="status">
   {timeoutTeam&&<TeamLogo team={timeoutTeam} size={44}/>}<strong>TIEMPO MUERTO</strong>
   <span>{[timeoutName,action?.clock].filter(Boolean).join(' · ')}</span>
  </div>}
  </div>
  <figcaption className={styles.caption}>
   {action&&!timeout&&/foul|end of|start of|enters the game/i.test(action.text)&&<strong>{/foul/i.test(action.text)?'Falta':/enters/i.test(action.text)?'Cambio de jugador':'Cambio de período'} · {action.clock}</strong>}
   <span aria-live="polite">
    {timeout?'Tiempo muerto':shot?<><strong>{outcome}{shot.made?' · +'+shot.value:''}</strong>{clock?' · '+clock:''}
     <span className={styles.location}>{coordinates?`Origen del tiro · ${coordinates}`:'Animación ilustrativa · sin coordenadas del tiro'}</span>
    </>:'Esperando un tiro o un tiempo muerto.'}
   </span>
   {shot&&<button type="button" className={styles.replay} onClick={()=>setReplay(value=>value+1)}>Repetir tiro</button>}
  </figcaption>
 </figure>;
}
