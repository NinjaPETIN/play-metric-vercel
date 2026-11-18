import type {BoxData} from '../lib/live-boxscore';
import type {recentCourt} from '../lib/recent-court';
import TeamLogo from './team-logo';

export default function RecentCourtGraphic({event,teams}:{event:ReturnType<typeof recentCourt>;teams:BoxData['teams']}){
 const {action,timeout,timeoutTeam,shot}=event;
 const location=shot?.value===1?null:shot?.play.shotLocation;
 const startX=location?Math.max(3,Math.min(47,7+location.y)):17;
 const startY=location?Math.max(2,Math.min(48,location.x)):17;
 const outcome=shot?(shot.value===1?'Tiro libre ': 'Tiro ')+(shot.made?'anotado':'fallado'):'Cancha de referencia';
 const clock=shot?.play.clock;
 const timeoutName=teams.find(team=>team.code===timeoutTeam)?.name;
 const trajectory=shot?.made
  ? `M ${startX} ${startY} Q ${Math.max(startX,11)} ${Math.min(startY,25)-9} 7 25 L 5 27`
  : `M ${startX} ${startY} Q ${Math.max(startX,13)} ${Math.min(startY,22)-9} 9 24 Q 12 20 15 16`;

 return <figure className={'recent-court'+(timeout?' is-timeout':'')}>
  <svg viewBox="0 0 94 50" role="img" aria-label={timeout?'Cancha durante el tiempo muerto':outcome}>
   <rect width="94" height="50" rx="1" fill="currentColor"/>
   <g fill="none" stroke="white" strokeWidth=".45" opacity=".85">
    <rect x="3" y="2" width="88" height="46"/><path d="M47 2v46"/><circle cx="47" cy="25" r="6"/>
    <path d="M3 17h18v16H3M91 17H73v16h18"/><circle cx="21" cy="25" r="6"/><circle cx="73" cy="25" r="6"/>
    <path d="M3 5h10a24 24 0 0 1 0 40H3M91 5H81a24 24 0 0 0 0 40h10M6 22v6m82-6v6"/>
    <circle cx="7" cy="25" r=".8"/><circle cx="87" cy="25" r=".8"/>
   </g>
   <text x="47" y="26" textAnchor="middle" fill="white" fontSize="3" fontWeight="700">STATLANE</text>
   {shot&&<g key={shot.play.id+':'+shot.made} className={shot.made?'court-shot-made':'court-shot-missed'}>
    {location&&<circle cx={startX} cy={startY} r="1.25" fill="currentColor" stroke="white" strokeWidth=".35"/>}
    {shot.made?<circle cx="7" cy="25" r="2.9" fill="none" stroke="currentColor" strokeWidth=".65"/>:
     <path d="m11 22 3 3m0-3-3 3" fill="none" stroke="currentColor" strokeWidth=".85" strokeLinecap="round"/>}
    <circle className="court-flight-ball" r="1.25" fill="#ffac59" stroke="#fff1df" strokeWidth=".25">
     <animateMotion path={trajectory} dur=".72s" fill="remove"/>
     <animate attributeName="opacity" values="1;1;0" keyTimes="0;.9;1" dur=".72s" fill="freeze"/>
    </circle>
   </g>}
  </svg>
  {timeout&&<div className="court-timeout" role="status">
   {timeoutTeam&&<TeamLogo team={timeoutTeam} size={44}/>}<strong>TIEMPO MUERTO</strong>
   <span>{[timeoutName,action?.clock].filter(Boolean).join(' · ')}</span>
  </div>}
  <figcaption aria-live="polite">
   {timeout?'Tiempo muerto':shot?<><strong>{outcome}{shot.made?' · +'+shot.value:''}</strong>{clock?' · '+clock:''} · {location?'Ubicación aproximada · aro izquierdo de referencia':'Animación ilustrativa · sin coordenadas del tiro'}</>:'Esperando un tiro o un tiempo muerto.'}
  </figcaption>
 </figure>;
}
