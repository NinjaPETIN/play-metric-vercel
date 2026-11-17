'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,CalendarDays,ChevronRight} from 'lucide-react';
import {calendarSchema,type Calendar} from '../lib/nba-snapshot';
import {arenaSchedule} from '../lib/arena-schedule';
import {loadCachedData} from '../lib/client-data-cache';
import TeamLogo from './team-logo';
import LiveScoreStrip from './live-score-strip';

export default function ArenaHome({guest=false}:{guest?:boolean}){
 const [calendar,setCalendar]=useState<Calendar|null>(null),[now,setNow]=useState<string|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const update=()=>setNow(new Date().toISOString());
  const initial=setTimeout(update,0),timer=setInterval(update,60000);
  let active=true;
  loadCachedData<unknown>('/api/nba/calendar').then(raw=>{if(active)setCalendar(calendarSchema.parse(raw));}).catch(()=>{if(active)setFailed(true);});
  return()=>{active=false;clearTimeout(initial);clearInterval(timer);};
 },[]);
 const selection=calendar&&now?arenaSchedule(calendar,now):null;
 const day=selection?.day?new Date(selection.day+'T12:00:00Z').toLocaleDateString('es-AR',{day:'numeric',month:'short'}):null;
 return <div className="arena-opening">
  <LiveScoreStrip><section className="arena-schedule" aria-label="Partidos NBA del calendario">
   <div className="arena-schedule-label"><CalendarDays size={17}/><strong>{selection?.today?'Partidos del día':'Próxima jornada'}</strong><small>{day??'Calendario NBA'}</small></div>
   <div className="arena-match-strip" tabIndex={0} aria-label="Deslizar para ver partidos">
    {!selection&&!failed&&<p role="status">Consultando calendario…</p>}
    {failed&&<p>No pudimos consultar el calendario. Podés reintentarlo en Partidos.</p>}
    {selection&&!selection.games.length&&<p>No hay próximos partidos en el calendario disponible.</p>}
    {selection?.games.map(g=><Link className="arena-match" key={g.id} href={'/partidos/'+g.id} aria-label={`${g.awayName} contra ${g.homeName}, ${day}`}>
     <span><TeamLogo team={g.away} size={28}/><b>{g.away}</b></span>
     <span className="arena-match-state"><strong>{g.status===3&&g.awayScore!==null&&g.homeScore!==null?`${g.awayScore} – ${g.homeScore}`:g.startsAt?new Date(g.startsAt).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'}):'A confirmar'}</strong><small>{g.status===3?'Final':g.status===2?'En juego*':'ARG'}</small></span>
     <span><TeamLogo team={g.home} size={28}/><b>{g.home}</b></span>
    </Link>)}
   </div>
   <Link className="arena-calendar-link" href="/?view=calendar">Ver calendario<ChevronRight size={15}/></Link>
  </section>
  {calendar&&<p className="arena-schedule-source">Calendario consultado {new Date(calendar.fetchedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} ARG · Horarios sujetos a cambios. *Estado de la última importación; el marcador en vivo se consulta por separado.</p>}</LiveScoreStrip>
  <section className="arena-hero" aria-labelledby="arena-title">
   <div className="arena-hero-content"><span className="arena-eyebrow">NBA · EL JUEGO, EN DATOS</span><h1 id="arena-title">El juego, en contexto<span>.</span></h1><p>Estadísticas, tendencias y noticias para entender más que el resultado.</p><div className="arena-hero-links"><a className="arena-context-link" href="#news-context">Noticias y contexto<ArrowUpRight size={16}/></a>{guest&&<Link className="arena-join-link" href="/login?return_to=%2F">Crear cuenta gratis<ChevronRight size={14}/></Link>}</div></div>
   <span className="arena-hero-mark" aria-hidden="true">STAT<br/>LANE</span>
  </section>
 </div>;
}
