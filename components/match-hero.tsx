'use client';
import {useEffect,useRef,useState} from 'react';
import {useLiveScores} from '../lib/use-live-scores';
import TeamLogo from './team-logo';
import type {BoxFeed} from '../lib/live-boxscore';
import {competitions} from '../lib/competitions';
import type {ScheduledGame} from './calendar-panel';
import type {CSSProperties} from 'react';
const colors:Record<string,string>={ATL:'#c9253d',BOS:'#098448',BKN:'#343434',CHA:'#087f8c',CHI:'#b51f38',CLE:'#812f48',DAL:'#1468b3',DEN:'#254674',DET:'#b92842',GSW:'#175fae',HOU:'#c32242',IND:'#244a77',LAC:'#bd2941',LAL:'#6d429a',MEM:'#41628c',MIA:'#963040',MIL:'#286747',MIN:'#224b72',NOP:'#364769',NYK:'#1763a2',OKC:'#157ab1',ORL:'#1469b2',PHI:'#2364a4',PHX:'#654187',POR:'#b9303a',SAC:'#67418c',SAS:'#555c63',TOR:'#b5233d',UTA:'#55418c',WAS:'#254d76'};
export default function MatchHero({match,initialFeed=null}:{match:ScheduledGame;initialFeed?:BoxFeed|null}){
 const {feed,failed,now}=useLiveScores(),age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 const initial=initialFeed?.data?.game.nbaId===match.id&&initialFeed.fetchedAt&&(now===0||now-Date.parse(initialFeed.fetchedAt)<300000)?initialFeed.data.game:null;
 const live=(age>=-5000&&age<300000?feed?.games.find(g=>g.nbaId===match.id):null)??initial;
 const fetchedAt=feed?.fetchedAt??initialFeed?.fetchedAt;
 const stale=failed||(feed?feed.status!=='ready'||age>90000:initialFeed?.status!=='ready');
 const score=live&&live.homeScore!==null?`${live.awayScore} : ${live.homeScore}`:match.status===1?'VS':`${match.awayScore??'—'} : ${match.homeScore??'—'}`;
 const label=live?`${live.detail}${stale?' · Lectura atrasada':live.state==='live'?' · En vivo':''}`:match.status===3?'Final · historial importado':'Calendario · sin lectura en vivo';
 const when=new Date(match.startsAt??match.date+'T12:00:00Z').toLocaleString('es-AR',{weekday:'long',day:'numeric',month:'long',...(match.startsAt?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'America/Argentina/Buenos_Aires'});
 const heroRef=useRef<HTMLElement>(null),[compact,setCompact]=useState(false);
 useEffect(()=>{const el=heroRef.current;if(!el)return;const observer=new IntersectionObserver(([entry])=>setCompact(!entry.isIntersecting&&entry.boundingClientRect.bottom<=0));observer.observe(el);return()=>observer.disconnect();},[]);
 const playing=live?.state==='live'&&!stale;
 return <>{compact&&<div className="match-sticky-score" aria-label="Marcador del partido"><span><TeamLogo team={match.away} size={28}/><b>{match.away}</b></span><strong>{score}</strong><span><b>{match.home}</b><TeamLogo team={match.home} size={28}/></span><small>{label}</small></div>}<section ref={heroRef} className="match-page-hero match-broadcast" style={{'--away-color':colors[match.away]??'#2364a4','--home-color':colors[match.home]??'#087f8c'} as CSSProperties} aria-label="Ficha del partido">
  <div className="match-watermark away" aria-hidden="true"><TeamLogo team={match.away} size={300}/></div><div className="match-watermark home" aria-hidden="true"><TeamLogo team={match.home} size={300}/></div>
  <div className="match-page-team"><TeamLogo team={match.away} size={80}/><div><small>Visitante · {match.away}</small><h2>{match.awayName}</h2></div></div>
  <div className="match-page-center"><small>{competitions[match.competition].label}</small><strong className="broadcast-score">{score}</strong><span className={`broadcast-status${playing?' is-live':''}`}>{playing&&<i aria-hidden="true"/>}{label}</span></div>
  <div className="match-page-team home"><TeamLogo team={match.home} size={80}/><div><small>Local · {match.home}</small><h2>{match.homeName}</h2></div></div>
  <footer className="broadcast-meta"><span>{when} · ARG</span>{live&&<span>ESPN · Lectura {new Date(fetchedAt!).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG · Consulta cada 5 s</span>}</footer>
 </section></>;
}
