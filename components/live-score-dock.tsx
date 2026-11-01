 'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useLiveScores} from '../lib/use-live-scores';
import TeamLogo from './team-logo';
export default function LiveScoreDock({currentId}:{currentId?:string}){
 const {feed,failed,now}=useLiveScores(),[collapsed,setCollapsed]=useState(false);
 const age=feed?.fetchedAt?now-Date.parse(feed.fetchedAt):Infinity;
 if(!feed?.games.length||age< -5000||age>=300000)return null;
 const stale=failed||feed.status!=='ready'||age>90000;
 return <nav className={'live-score-dock'+(collapsed?' is-collapsed':'')} aria-label="Partidos de la jornada"><button className="dock-toggle" onClick={()=>setCollapsed(v=>!v)} aria-expanded={!collapsed}>{collapsed?'Mostrar partidos':'Ocultar'}<small>{stale?'Lectura atrasada':'NBA · 5 s'}</small></button>{!collapsed&&<div className="dock-games">{feed.games.map(g=>{const body=<><span className="dock-phase">{stale?'Lectura atrasada':g.state==='scheduled'?new Date(g.startsAt).toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'})+' ARG':g.detail}</span><span><TeamLogo team={g.away} size={19}/><b>{g.away}</b><strong>{g.awayScore??'—'}</strong></span><span><TeamLogo team={g.home} size={19}/><b>{g.home}</b><strong>{g.homeScore??'—'}</strong></span></>;return g.nbaId?<Link href={'/partidos/'+g.nbaId+'?matchTab=live'} key={g.id} className={g.nbaId===currentId?'selected':''} aria-current={g.nbaId===currentId?'page':undefined}>{body}</Link>:<div key={g.id}>{body}</div>;})}</div>}</nav>;
}
