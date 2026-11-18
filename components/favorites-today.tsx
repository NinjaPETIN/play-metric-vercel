'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {followedAgenda} from '../lib/followed-agenda';
import {markets,type Market} from '../lib/analytics';
import {loadCachedData} from '../lib/client-data-cache';
import type {Calendar} from '../lib/nba-snapshot';
import type {Player} from '../lib/data';
import {useReadingPreferences} from './reading-preferences';
import {useWatchlist} from './watchlist-provider';
import Portrait from './match-player-portrait';
import {playerPath} from '../lib/player-path';
export default function FavoritesToday({players,favorites,onOpen}:{players:Player[];favorites:string[];onOpen:(p:Player,m:Market)=>void}){
 const {watch}=useWatchlist(),{now}=useReadingPreferences();
 const [calendar,setCalendar]=useState<Calendar|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false);
 const ids=[...watch.players.filter(id=>id.startsWith('nba:')),...favorites];
 const hasPlayers=ids.length>0;
 useEffect(()=>{if(!hasPlayers)return;let active=true;loadCachedData<Calendar>('/api/nba/calendar',retry>0).then(data=>{if(active){setCalendar(data);setError(false);}}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[hasPlayers,retry]);
 if(!hasPlayers)return null;
 const rows=followedAgenda(players,ids,calendar,now),today=rows.filter(r=>r.today).length;
 return <section className="card favorites-agenda" aria-label="La jornada de tus jugadores"><header><div><span className="eyebrow">TU JORNADA</span><h2>{today?`${today} de tus jugadores juegan hoy`:'Tus próximos partidos'}</h2></div><span>{rows.length} jugadores</span></header>{error&&<p role="status">No pudimos cargar los horarios. <button className="button subtle" onClick={()=>setRetry(n=>n+1)}>Reintentar</button></p>}<div className="favorites-agenda-grid">{rows.slice(0,expanded?undefined:6).map(({player,game,today})=>{const saved=favorites.filter(id=>id.startsWith(player.id+':')).map(id=>id.split(':')[1]).filter((m):m is Market=>Object.hasOwn(markets,m));return <article key={player.id}><Portrait person={player}/><div><Link className="favorites-agenda-name" href={playerPath(player)}>{player.name}</Link>{game?<Link className="favorites-agenda-fixture" href={'/partidos/'+game.id}>{game.away} vs. {game.home}<b>{game.status===2?'● En vivo':game.status===3?'Final':(today?'Hoy · ':new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short'}).format(new Date(game.startsAt!))+' · ')+new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'}).format(new Date(game.startsAt!))+' ARG'}</b></Link>:<small>{calendar?'Sin próximo partido confirmado':'Cargando horarios…'}</small>}<div className="favorites-agenda-stats">{saved.length?saved.map(m=><button key={m} onClick={()=>onOpen(player,m)}>{markets[m]} →</button>):<button onClick={()=>onOpen(player,'points')}>Ver estadísticas →</button>}</div></div></article>;})}</div>{rows.length>6&&<button className="button subtle" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?'Mostrar menos':'Ver todos mis jugadores'}</button>}</section>;
}
