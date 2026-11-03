'use client';
import {useId,useState} from 'react';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import {useLiveScores} from '../lib/use-live-scores';
import {orderScoreboardGames} from '../lib/scoreboard-order';
import TeamLogo from './team-logo';
export default function LiveScoreDock({currentId}:{currentId?:string}){
 const {feed,failed,now}=useLiveScores(),[collapsed,setCollapsed]=useState(false),gamesId=useId();
 const age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 if(!feed?.games.length||age< -5000||age>=300000)return null;
 const stale=failed||feed.status!=='ready'||age>90000,games=orderScoreboardGames(feed.games);
 return <nav className={'live-score-dock'+(collapsed?' is-collapsed':'')} aria-label="Partidos de la jornada"><button className="dock-toggle" onClick={()=>setCollapsed(v=>!v)} aria-expanded={!collapsed} aria-controls={gamesId} aria-label={collapsed?'Mostrar partidos':'Ocultar partidos'} title={collapsed?'Mostrar partidos':'Ocultar partidos'}><ChevronDown size={20} aria-hidden="true"/></button><div id={gamesId} className="dock-games" inert={collapsed} aria-hidden={collapsed}>{games.map(g=>{const body=<><span className="dock-phase">{g.state==='live'&&!stale&&<i className="dock-live-dot" aria-hidden="true"/>}{stale?'Lectura atrasada':g.state==='scheduled'?new Date(g.startsAt).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'})+' ARG':g.detail}</span><span><TeamLogo team={g.away} size={19}/><b>{g.away}</b><strong>{g.awayScore??'—'}</strong></span><span><TeamLogo team={g.home} size={19}/><b>{g.home}</b><strong>{g.homeScore??'—'}</strong></span></>;const cls=(g.nbaId===currentId?'selected ':'')+(g.state==='live'&&!stale?'is-live':'');return g.nbaId?<Link href={'/partidos/'+g.nbaId+'?matchTab=live'} key={g.id} className={cls} aria-current={g.nbaId===currentId?'page':undefined}>{body}</Link>:<div key={g.id} className={cls}>{body}</div>;})}</div></nav>;
}
