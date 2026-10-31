'use client';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {Radio,ChevronRight} from 'lucide-react';
import {useLiveScores} from '../lib/use-live-scores';
import TeamLogo from './team-logo';
export default function LiveScoreStrip({children}:{children:ReactNode}){
 const {feed,failed,now}=useLiveScores();
 const age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 const available=feed&&feed.games.length>0&&age>=-5000&&age<300000;
 const stale=failed||feed?.status!=='ready'||age>90000;
 if(!available)return <>{children}{failed&&<p className="arena-live-source arena-live-warning" role="status">Marcador en vivo no disponible. El calendario muestra la última importación histórica.</p>}</>;
 const inProgress=feed.games.some(g=>g.state==='live');
 const day=new Date(feed.games[0].startsAt).toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short'});
 return <>
  <section className={'arena-schedule arena-live'+(stale?' arena-live-stale':'')} aria-label="Marcadores NBA en vivo">
   <div className="arena-schedule-label"><Radio size={17}/><strong>{stale?'Última lectura':inProgress?'NBA en vivo':'Jornada NBA'}</strong><small>{day}</small></div>
   <div className="arena-match-strip" tabIndex={0} aria-label="Deslizar para ver marcadores">
    {feed.games.map(g=>{
     const label=`${g.awayName} contra ${g.homeName}, ${g.homeScore!==null?`${g.awayScore} a ${g.homeScore}, `:''}${g.detail}${stale?', lectura atrasada':''}`;
     const body=<><span><TeamLogo team={g.away} size={28}/><b>{g.away}</b></span><span className="arena-match-state"><strong>{g.homeScore!==null?`${g.awayScore} – ${g.homeScore}`:new Date(g.startsAt).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'})}</strong><small>{g.state==='live'&&!stale&&<i aria-hidden="true"/>}{g.state==='scheduled'?'ARG':g.detail}</small></span><span><TeamLogo team={g.home} size={28}/><b>{g.home}</b></span></>;
     const cls='arena-match'+(g.state==='live'?' arena-match-live':'');
     return g.nbaId?<Link className={cls} key={g.id} href={'/partidos/'+g.nbaId} aria-label={label}>{body}</Link>:<div className={cls} key={g.id} aria-label={label}>{body}</div>;
    })}
   </div>
   <Link className="arena-calendar-link" href="/?view=calendar">Ver calendario<ChevronRight size={15}/></Link>
  </section>
  <p className={'arena-live-source'+(stale?' arena-live-warning':'')} role="status">{stale?'Actualización atrasada · Última lectura':'Fuente: ESPN · Consultado'} {new Date(feed.fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',second:'2-digit'})} ARG · Consulta cada 15 s con la pestaña visible; puede haber demora del proveedor. El reloj corresponde a esa lectura.</p>
 </>;
}
