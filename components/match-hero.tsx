'use client';
import {useLiveScores} from '../lib/use-live-scores';
import TeamLogo from './team-logo';
import type {BoxFeed} from '../lib/live-boxscore';
import {competitions} from '../lib/competitions';
import type {ScheduledGame} from './calendar-panel';
export default function MatchHero({match,initialFeed=null}:{match:ScheduledGame;initialFeed?:BoxFeed|null}){
 const {feed,failed,now}=useLiveScores(),age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 const initial=initialFeed?.data?.game.nbaId===match.id&&initialFeed.fetchedAt&&(now===0||now-Date.parse(initialFeed.fetchedAt)<300000)?initialFeed.data.game:null;
 const live=(age>=-5000&&age<300000?feed?.games.find(g=>g.nbaId===match.id):null)??initial;
 const fetchedAt=feed?.fetchedAt??initialFeed?.fetchedAt;
 const stale=failed||(feed?feed.status!=='ready'||age>90000:initialFeed?.status!=='ready');
 const score=live&&live.homeScore!==null?`${live.awayScore} : ${live.homeScore}`:match.status===1?'VS':`${match.awayScore??'—'} : ${match.homeScore??'—'}`;
 const label=live?`${live.detail}${stale?' · Lectura atrasada':live.state==='live'?' · En vivo':''}`:match.status===3?'Final · historial importado':'Calendario · sin lectura en vivo';
 const when=new Date(match.startsAt??match.date+'T12:00:00Z').toLocaleString('es-AR',{weekday:'long',day:'numeric',month:'long',...(match.startsAt?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'America/Argentina/Buenos_Aires'});
 return <section className="match-page-hero" aria-label="Ficha del partido"><div className="match-page-team"><TeamLogo team={match.away} size={68}/><div><small>Visitante</small><h2>{match.awayName}</h2><span>{match.away}</span></div></div><div className="match-page-center"><small>{competitions[match.competition].label}</small><strong>{score}</strong><span>{label}</span><p>{when} · ARG</p>{live&&<small>ESPN · Lectura {new Date(fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG · Consulta cada 15 s</small>}</div><div className="match-page-team home"><TeamLogo team={match.home} size={68}/><div><small>Local</small><h2>{match.homeName}</h2><span>{match.home}</span></div></div></section>;
}
