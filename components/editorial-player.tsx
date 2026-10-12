'use client';
import {type ReactNode,useState} from 'react';
import type {Player} from '../lib/data';
import type {PlayerProfile} from '../lib/player-profile';
import TeamLogo from './team-logo';
import {teamNames} from '../lib/team-overview';
export default function EditorialPlayer({player,profile,status,action}:{player:Player;profile:PlayerProfile|null;status:'loading'|'ready'|'unavailable';action:ReactNode}){
 const [loaded,setLoaded]=useState(false);
 const [failed,setFailed]=useState(false),[lowResolution,setLowResolution]=useState(false);
 const words=player.name.trim().split(' '),first=words.slice(0,-1).join(' ')||words[0],last=words.length>1?words.at(-1):'';
 const position=profile?.position?.split('-').map(p=>({Guard:'Base / Escolta',Forward:'Alero',Center:'Pívot'}[p.trim()]??p.trim())).join(' / ');
 return <section className="editorial-player" aria-label={`Ficha de ${player.name}`}><div className="editorial-portrait"><span className="portrait-watermark" aria-hidden="true">PM</span>{!loaded&&!failed&&<span className="portrait-fallback" aria-hidden="true">{words.map(w=>w[0]).slice(0,2).join('')}</span>}{failed?<span className="portrait-fallback">{words.map(w=>w[0]).slice(0,2).join('')}</span>:<img src={`https://cdn.nba.com/headshots/nba/latest/${lowResolution?'260x190':'1040x760'}/${player.id}.png`} alt={player.name} fetchPriority="high" width={1040} height={760} decoding="async" onLoad={()=>setLoaded(true)} style={{opacity:loaded?1:0}} onError={()=>{if(!lowResolution)setLowResolution(true);else setFailed(true);}}/>}</div><div className="editorial-identity"><small className="eyebrow">NBA · PERFIL DEL JUGADOR</small><h2><span>{first}</span>{last&&<span>{last}</span>}</h2><div className="editorial-team"><TeamLogo team={player.team} size={44}/><div><b>{teamNames[player.team]??player.team}</b><span>{position??'Posición pendiente'}</span></div></div></div><div className="editorial-bio" aria-live="polite"><div className="editorial-follow">{action}<span>Seguimiento</span></div><dl><div><dt>Posición</dt><dd>{position??'—'}</dd></div><div><dt>Nacimiento</dt><dd>{profile?.birthYear??'—'}</dd></div><div><dt title="País informado por NBA; no confirma ciudadanía">País de origen</dt><dd>{profile?.country??'—'}</dd></div></dl>{status!=='ready'&&<small>{status==='loading'?'Consultando ficha NBA…':'Ficha biográfica pendiente.'}</small>}</div></section>;
}
