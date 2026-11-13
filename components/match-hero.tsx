'use client';
import {useEffect,useRef,useState} from 'react';
import {useLiveScores} from '../lib/use-live-scores';
import {recordWithResult,type MatchRecords} from '../lib/match-team-record';
import TeamLogo from './team-logo';
import type {BoxFeed} from '../lib/live-boxscore';
import {competitions} from '../lib/competitions';
import type {ScheduledGame} from './calendar-panel';
import type {CSSProperties} from 'react';
import {teamColors as colors} from '../lib/team-colors';
export default function MatchHero({match,initialFeed=null,records=null}:{records?:MatchRecords|null;match:ScheduledGame;initialFeed?:BoxFeed|null}){
 const {feed,failed,now}=useLiveScores(),age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 const initial=initialFeed?.data?.game.nbaId===match.id&&initialFeed.fetchedAt&&(now===0||now-Date.parse(initialFeed.fetchedAt)<300000)?initialFeed.data.game:null;
 const live=(age>=-5000&&age<300000?feed?.games.find(g=>g.nbaId===match.id):null)??initial;
 const fetchedAt=feed?.fetchedAt??initialFeed?.fetchedAt;
 const stale=failed||(feed?feed.status!=='ready'||age>90000:initialFeed?.status!=='ready');
 const scheduled=live?live.state==='scheduled':match.status===1;
 const startsAt=live?.startsAt??match.startsAt,zone='America/Argentina/Buenos_Aires';
 const startLabel=startsAt?((new Date(startsAt).toLocaleDateString('en-CA',{timeZone:zone})===new Date(now).toLocaleDateString('en-CA',{timeZone:zone})?'HOY · ':new Date(startsAt).toLocaleDateString('es-AR',{timeZone:zone,day:'numeric',month:'short'})+' · ')+new Date(startsAt).toLocaleTimeString('es-AR',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false})+' ARG'):'Horario a confirmar';
 const score=live&&live.homeScore!==null?`${live.awayScore} - ${live.homeScore}`:match.status===1?'VS':`${match.awayScore??'—'} - ${match.homeScore??'—'}`;
 const label=live?`${live.detail}${!stale&&live.state==='live'?' · En vivo':''}`:match.status===3?'Final · historial importado':'Calendario · sin lectura en vivo';
 const when=new Date(match.startsAt??match.date+'T12:00:00Z').toLocaleString('es-AR',{weekday:'long',day:'numeric',month:'long',...(match.startsAt?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'America/Argentina/Buenos_Aires'});
 const heroRef=useRef<HTMLElement>(null),[compact,setCompact]=useState(false);
 useEffect(()=>{const el=heroRef.current;if(!el)return;const observer=new IntersectionObserver(([entry])=>setCompact(!entry.isIntersecting&&entry.boundingClientRect.bottom<=0));observer.observe(el);return()=>observer.disconnect();},[]);
 const final=live?live.state==='final':match.status===3;
 const awayScore=live?.awayScore??match.awayScore,homeScore=live?.homeScore??match.homeScore;
 const awayRecord=records&&(final?recordWithResult(records.away,awayScore,homeScore):records.away);
 const homeRecord=records&&(final?recordWithResult(records.home,homeScore,awayScore):records.home);
 const playing=live?.state==='live'&&!stale;
 return <><div className="match-score-anchor">{compact&&!scheduled&&<div className="match-sticky-score" aria-label="Marcador del partido"><span><TeamLogo team={match.away} size={28}/><b>{match.away}</b></span><strong>{score}</strong><span><b>{match.home}</b><TeamLogo team={match.home} size={28}/></span><small>{label}</small></div>}</div><section ref={heroRef} className={'match-page-hero match-broadcast'+(scheduled?' is-pregame':'')} style={{'--away-color':colors[match.away]??'#2364a4','--home-color':colors[match.home]??'#087f8c'} as CSSProperties} aria-label="Ficha del partido">
  <div className="match-watermark away" aria-hidden="true"><TeamLogo team={match.away} size={300}/></div><div className="match-watermark home" aria-hidden="true"><TeamLogo team={match.home} size={300}/></div>
  <div className="match-page-team"><TeamLogo team={match.away} size={80}/><div><small>Visitante · {match.away}</small><h2>{match.awayName}</h2>{awayRecord&&<span className="match-team-record" title="Récord de temporada regular">{awayRecord.wins} V · {awayRecord.losses} D</span>}</div></div>
  <div className="match-page-center"><small>{competitions[match.competition].label}</small>{scheduled?<><span className="prematch-vs">VS</span><strong className="prematch-start">{startLabel}</strong><span className="broadcast-status">Por comenzar</span><span className="prematch-start-note">Inicio programado · Hora de Argentina</span></>:<><strong className="broadcast-score">{score}</strong><span className={'broadcast-status'+(playing?' is-live':'')}>{playing&&<i aria-hidden="true"/>}{label}</span></>}</div>
  <div className="match-page-team home"><TeamLogo team={match.home} size={80}/><div><small>Local · {match.home}</small><h2>{match.homeName}</h2>{homeRecord&&<span className="match-team-record" title="Récord de temporada regular">{homeRecord.wins} V · {homeRecord.losses} D</span>}</div></div>
  <footer className="broadcast-meta"><span>{when} · ARG</span>{live&&<span>ESPN · Lectura {new Date(fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG · Consulta cada 5 s</span>}</footer>
 </section></>;
}
