import TeamLogo from './team-logo';
import {competitions} from '../lib/competitions';
import type {ScheduledGame} from './calendar-panel';
export default function MatchHero({match}:{match:ScheduledGame}){
 const when=new Date(match.startsAt??match.date+'T12:00:00Z').toLocaleString('es-AR',{weekday:'long',day:'numeric',month:'long',...(match.startsAt?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'America/Argentina/Buenos_Aires'});
 return <section className="match-page-hero" aria-label="Ficha del partido"><div className="match-page-team"><TeamLogo team={match.away} size={68}/><div><small>Visitante</small><h2>{match.awayName}</h2><span>{match.away}</span></div></div><div className="match-page-center"><small>{competitions[match.competition].label}</small><strong>{match.status===1?'VS':`${match.awayScore??'—'} : ${match.homeScore??'—'}`}</strong><span>{match.status===3?'Final':match.status===2?'En juego · última consulta':'Programado'}</span><p>{when} · ARG</p></div><div className="match-page-team home"><TeamLogo team={match.home} size={68}/><div><small>Local</small><h2>{match.homeName}</h2><span>{match.home}</span></div></div></section>;
}
