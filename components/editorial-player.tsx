'use client';
import {type ReactNode,useState} from 'react';
import type {Player} from '../lib/data';
import type {PlayerProfile} from '../lib/player-profile';
import {PlayerUpcoming} from './design-schedule';
import TeamLogo from './team-logo';
import {teamNames} from '../lib/team-overview';
export default function EditorialPlayer({player,profile,status,action,season,competition}:{player:Player;profile:PlayerProfile|null;status:'loading'|'ready'|'unavailable';action:ReactNode;season?:number;competition?:string}){
 const [loaded,setLoaded]=useState(false);
 const [failed,setFailed]=useState(false),[lowResolution,setLowResolution]=useState(false);
 const words=player.name.trim().split(' ');
 const currentTeam=player.currentTeam??null;
 const position=profile?.position?.split('-').map(p=>({Guard:'Base / Escolta',Forward:'Alero',Center:'Pívot'}[p.trim()]??p.trim())).join(' / ');
 return <section className="editorial-player" aria-label={`Ficha de ${player.name}`}>
  {currentTeam&&<div className="profile-team-watermark" aria-hidden="true"><TeamLogo team={currentTeam} size={290}/></div>}
  <div className="editorial-portrait">{(!loaded||failed)&&<span className="portrait-fallback" aria-hidden="true">{words.map(w=>w[0]).slice(0,2).join('')}</span>}{!failed&&<img src={`https://cdn.nba.com/headshots/nba/latest/${lowResolution?'260x190':'1040x760'}/${player.id}.png`} alt={player.name} fetchPriority="high" width={1040} height={760} decoding="async" onLoad={()=>setLoaded(true)} style={{opacity:loaded?1:0}} onError={()=>{if(!lowResolution)setLowResolution(true);else setFailed(true);}}/>}</div>
  <div className="editorial-identity"><h2>{player.name}</h2><div className="editorial-team"><TeamLogo team={currentTeam??'—'} size={24}/><b>{currentTeam?(teamNames[currentTeam]??currentTeam):'Sin equipo confirmado'}</b>{position&&<span>· {position}</span>}</div>
   <PlayerUpcoming team={currentTeam}/>
   <div className="identity-provenance"><span>Equipo actual: <b>{currentTeam??'Sin confirmar'}</b></span><span>Historial: {season?season+'/'+String(season+1).slice(-2):'temporada seleccionada'} · {competition==='preseason'?'Pretemporada':competition==='playoffs'?'Playoffs':'Temporada regular'} · {Array.from(new Set(player.games.map(g=>g.team??player.team))).join(' / ')||'Sin partidos'}</span></div>
   <details className="player-identity-details"><summary>Ficha y plantillas</summary><div>{profile?.birthYear&&<span>Nacimiento: {profile.birthYear}</span>}{profile?.country&&<span>País de origen: {profile.country}</span>}{status!=='ready'&&<span>{status==='loading'?'Consultando ficha NBA…':'Ficha biográfica pendiente.'}</span>}{player.games.length>0&&<span>Equipos en este historial: {Array.from(new Set(player.games.map(g=>g.team??player.team))).map(t=>teamNames[t]??t).join(' · ')}</span>}</div></details>
  </div><div className="editorial-follow">{action}<span>Seguir</span></div>
 </section>;
}
