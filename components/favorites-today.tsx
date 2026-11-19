'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {journeyDay,minutesChange} from '../lib/journey-day';
import {loadCachedData} from '../lib/client-data-cache';
import type {Calendar} from '../lib/nba-snapshot';
import type {Player} from '../lib/data';
import type {Market} from '../lib/analytics';
import {useReadingPreferences} from './reading-preferences';
import {useWatchlist} from './watchlist-provider';
import Portrait from './match-player-portrait';
import TeamLogo from './team-logo';
const clock=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'});
const date=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'long'});
const number=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});
export default function FavoritesToday({players,favorites,onOpen}:{players:Player[];favorites:string[];onOpen:(p:Player,m:Market)=>void}){
 const {watch}=useWatchlist(),{now}=useReadingPreferences();
 const [calendar,setCalendar]=useState<Calendar|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[onlyMine,setOnlyMine]=useState(false);
 useEffect(()=>{let active=true,busy=false;async function read(force=false){if(document.hidden||busy)return;busy=true;try{const data=await loadCachedData<Calendar>('/api/nba/calendar',force);if(active){setCalendar(data);setError(false);}}catch{if(active)setError(true);}finally{busy=false;}}
  void read(retry>0);const timer=setInterval(()=>void read(true),180_000),resume=()=>{if(!document.hidden)void read();};document.addEventListener('visibilitychange',resume);return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',resume);};},[retry]);
 const day=useMemo(()=>calendar&&now>0?journeyDay(calendar,players,[...watch.players.filter(id=>id.startsWith('nba:')),...favorites],watch.teams,now):null,[calendar,players,watch.players,watch.teams,favorites,now]);
 const games=day?.games.filter(row=>!onlyMine||row.following)??[],followed=day?.games.filter(row=>row.following).length??0;
 const changes=useMemo(()=>players.filter(p=>watch.players.includes('nba:'+p.id)||favorites.some(id=>id.startsWith(p.id+':'))).flatMap(player=>{const change=minutesChange(player);return change?[{player,...change}]:[];}).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,3),[players,watch.players,favorites]);
 return <section className="card journey-overview" aria-label="Tu jornada NBA"><header><div><span className="eyebrow">TU JORNADA NBA</span><h2>{now>0?date.format(new Date(now)):'Hoy'}</h2><p>{day?`${day.games.length} partidos · ${followed} en tu seguimiento`:'Preparando los partidos de hoy…'} · Horarios ARG</p></div><Link className="button subtle" href="/?view=calendar">Ver calendario →</Link></header>
  <div className="segmented" role="group" aria-label="Filtrar la jornada"><button aria-pressed={!onlyMine} className={!onlyMine?'selected':''} onClick={()=>setOnlyMine(false)}>Todos los partidos</button><button aria-pressed={onlyMine} className={onlyMine?'selected':''} onClick={()=>setOnlyMine(true)}>Mi seguimiento · {followed}</button></div>
  {error&&<p role="status">No pudimos actualizar la jornada. <button className="button subtle" onClick={()=>setRetry(n=>n+1)}>Reintentar</button></p>}
  {!calendar&&!error&&<p role="status">Consultando partidos…</p>}
  {calendar&&!games.length&&<div className="journey-empty"><strong>{onlyMine?'No tenés partidos seguidos para hoy':'Hoy no hay partidos en el calendario disponible'}</strong><p>{onlyMine?'Seguí jugadores o equipos con la estrella para reunir sus partidos acá.':'Podés consultar los próximos encuentros en el calendario.'}</p>{onlyMine&&<button className="button subtle" onClick={()=>setOnlyMine(false)}>Ver toda la jornada</button>}</div>}
  <div className="journey-game-grid">{games.map(({game,following,players:saved})=><article key={game.id} className={following?'is-followed':''}><header><span>{game.status===3?'Final':game.status===2?'En juego':game.startsAt?clock.format(new Date(game.startsAt))+' ARG':'Hora a confirmar'}</span>{following&&<small>En tu seguimiento</small>}</header><Link className="journey-fixture" href={'/partidos/'+game.id}><span><TeamLogo team={game.away} size={30}/><b>{game.away}</b></span><strong>{game.status===3&&game.awayScore!==null&&game.homeScore!==null?`${game.awayScore} – ${game.homeScore}`:'vs.'}</strong><span><TeamLogo team={game.home} size={30}/><b>{game.home}</b></span></Link>{saved.length>0&&<div className="journey-players">{saved.map(player=><button key={player.id} onClick={()=>onOpen(player,'points')}><Portrait person={player}/><span>{player.name}</span><span aria-hidden="true">→</span></button>)}</div>}<Link className="journey-game-link" href={'/partidos/'+game.id}>{game.status===3?'Ver resultado':'Ver partido y previa'} →</Link></article>)}</div>
  {changes.length>0&&<div className="journey-changes"><h3>Cambios en tus jugadores</h3>{changes.map(row=><button key={row.player.id} onClick={()=>onOpen(row.player,'points')}><Portrait person={row.player}/><span><strong>{row.player.name}</strong><small>{number.format(row.previous)} → {number.format(row.current)} min · Últimos 5 frente a 5 anteriores</small></span><b>{row.change>0?'+':''}{number.format(row.change)} min</b></button>)}</div>}
 </section>;
}
