'use client';
import {useLiveScores} from '../lib/use-live-scores';
import TeamLogo from './team-logo';
import {competitions} from '../lib/competitions';
import type {ScheduledGame} from './calendar-panel';
export default function MatchHero({match}:{match:ScheduledGame}){
 const {feed,failed,now}=useLiveScores(),age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 const live=age>=-5000&&age<300000?feed?.games.find(g=>g.nbaId===match.id):null;
 const stale=failed||feed?.status!=='ready'||age>90000;
 const score=live&&live.homeScore!==null?`${live.awayScore} : ${live.homeScore}`:match.status===1?'VS':`${match.awayScore??'—'} : ${match.homeScore??'—'}`;
 const label=live?`${live.detail}${stale?' · Lectura atrasada':live.state==='live'?' · En vivo':''}`:match.status===3?'Final · historial importado':'Calendario · sin lectura en vivo';
 const when=new Date(match.startsAt??match.date+'T12:00:00Z').toLocaleString('es-AR',{weekday:'long',day:'numeric',month:'long',...(match.startsAt?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'America/Argentina/Buenos_Aires'});
 return <section className="match-page-hero" aria-label="Ficha del partido"><div className="match-page-team"><TeamLogo team={match.away} size={68}/><div><small>Visitante</small><h2>{match.awayName}</h2><span>{match.away}</span></div></div><div className="match-page-center"><small>{competitions[match.competition].label}</small><strong>{score}</strong><span>{label}</span><p>{when} · ARG</p>{live&&<small>ESPN · Lectura {new Date(feed!.fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG · Consulta cada 30 s</small>}</div><div className="match-page-team home"><TeamLogo team={match.home} size={68}/><div><small>Local</small><h2>{match.homeName}</h2><span>{match.home}</span></div></div></section>;
}
