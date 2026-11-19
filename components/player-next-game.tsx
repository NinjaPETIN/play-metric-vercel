'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {loadCachedData} from '../lib/client-data-cache';
import {normalizeSearch} from '../lib/player-search';
import {offerIsCurrent} from '../lib/market-reference';
import type {Player} from '../lib/data';
import type {Calendar} from '../lib/nba-snapshot';
import type {MatchAvailability} from '../lib/match-availability';
import type {MarketLine,MarketLines} from '../lib/market-lines';
import {markets,type Market} from '../lib/analytics';
import {useReadingPreferences} from './reading-preferences';
import TeamLogo from './team-logo';
const marketKeys:Partial<Record<Market,MarketLine['market']>>={points:'player_points',rebounds:'player_rebounds',assists:'player_assists',threes:'player_threes'};
const time=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export default function PlayerNextGame({player,market,onUseLine}:{player:Player;market:Market;onUseLine?:(offer:MarketLine)=>void}){
 const {reduced,now}=useReadingPreferences();
 const [calendar,setCalendar]=useState<Calendar|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const [availability,setAvailability]=useState<{id:string;data:MatchAvailability|null}|null>(null),[prices,setPrices]=useState<{id:string;data:MarketLines}|null>(null),[lineFailed,setLineFailed]=useState(false),[showLines,setShowLines]=useState(false);
 const [enabled,setEnabled]=useState(false),[frequency,setFrequency]=useState(15),[notice,setNotice]=useState('');
 const baseline=useRef<{scope:string;status:string|null;line:string|null}|null>(null),lastNotice=useRef(0);
 const preferenceKey='statlane:player-alerts:'+player.id;
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;try{const value=JSON.parse(localStorage.getItem(preferenceKey)??'null');setEnabled(value?.enabled===true);if([5,15,60].includes(value?.frequency))setFrequency(value.frequency);}catch{}});return()=>{active=false;};},[preferenceKey]);
 function preferences(next:boolean,minutes:number){setEnabled(next);setFrequency(minutes);try{localStorage.setItem(preferenceKey,JSON.stringify({enabled:next,frequency:minutes}));}catch{setNotice('No se pudo recordar esta preferencia.');}}
 useEffect(()=>{let active=true;loadCachedData<Calendar>('/api/nba/calendar',retry>0).then(data=>{if(active){setCalendar(data);setFailed(false);}}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[player.id,retry]);
 const team=player.currentTeam===undefined?player.team:player.currentTeam;
 const game=calendar?.games.filter(g=>g.status===1&&!!team&&(g.home===team||g.away===team)&&g.startsAt&&Date.parse(g.startsAt)>now-600_000).sort((a,b)=>a.startsAt!.localeCompare(b.startsAt!))[0],gameId=game?.id;
 useEffect(()=>{
  if(!gameId)return;
  let active=true,busy=false;
  async function refresh(force=false){
   if(document.hidden||busy)return;busy=true;
   try{
    const [availabilityRead,oddsRead]=await Promise.allSettled([
     loadCachedData<{data:MatchAvailability|null}>('/api/nba/availability/'+gameId,force),
     showLines&&!reduced&&marketKeys[market]?loadCachedData<MarketLines>('/api/nba/market-lines/'+gameId,force):Promise.resolve(null),
    ]);
    if(!active)return;
    const feed=availabilityRead.status==='fulfilled'?availabilityRead.value.data:null,odds=oddsRead.status==='fulfilled'?oddsRead.value:null;
    if(availabilityRead.status==='fulfilled')setAvailability({id:gameId!,data:feed});
    if(odds)setPrices({id:gameId!,data:odds});
    setLineFailed(showLines&&!reduced&&!!marketKeys[market]&&!odds);
    const status=feed&&!feed.dataStale?feed.teams.find(t=>t.code===team)?.injuries?.find(p=>normalizeSearch(p.name)===normalizeSearch(player.name))?.status??null:null;
    const lines=odds?.state==='ready'&&!odds.dataStale?odds.lines.filter(r=>normalizeSearch(r.player)===normalizeSearch(player.name)&&r.market===marketKeys[market]&&offerIsCurrent(r,Date.now())).map(r=>r.book+':'+r.side+':'+r.line).sort().join('|'):null;
    const scope=gameId+':'+market,previous=baseline.current;
    if(enabled&&!reduced&&previous?.scope===scope&&Date.now()-lastNotice.current>=frequency*60_000){
     const changes=[];if(status&&previous.status&&status!==previous.status)changes.push('Disponibilidad: '+status);if(lines&&previous.line&&lines!==previous.line)changes.push('Cambió una línea de mercado');
     if(changes.length){setNotice(changes.join(' · '));lastNotice.current=Date.now();}
    }
    baseline.current={scope,status:status??(previous?.scope===scope?previous.status:null),line:lines??(previous?.scope===scope?previous.line:null)};
   }finally{busy=false;}
  }
  void refresh(retry>0);const timer=setInterval(()=>void refresh(true),180_000),resume=()=>void refresh();document.addEventListener('visibilitychange',resume);
  return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
 },[gameId,team,player.name,market,showLines,enabled,frequency,reduced,retry]);
 const feed=availability&&availability.id===gameId?availability.data:null,lines=prices&&prices.id===gameId?prices.data:null;
 const injury=feed&&!feed.dataStale?feed.teams.find(t=>t.code===team)?.injuries?.find(p=>normalizeSearch(p.name)===normalizeSearch(player.name)):undefined;
 const rival=game?(game.home===team?game.away:game.home):null;
 const offers=lines?.lines.filter(r=>normalizeSearch(r.player)===normalizeSearch(player.name)&&r.market===marketKeys[market])??[];
 const recent=player.games.filter(g=>g.played&&g.minutes>0).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5),minutes=recent.length?recent.reduce((sum,g)=>sum+g.minutes,0)/recent.length:null;
 return <section className="card ux-next-game"><small className="eyebrow">PRÓXIMO PARTIDO</small><h3>{rival?<><TeamLogo team={rival} size={27}/>{game?.home===team?'vs.':'@'} {rival}</>:'Previa del jugador'}</h3>{game?<><p><time dateTime={game.startsAt!}>{time.format(new Date(game.startsAt!))} ARG</time></p><div className="ux-preview-facts"><div><small>Disponibilidad</small><strong>{injury?.status??'Sin estado individual publicado'}</strong></div><div><small>Minutos recientes · {recent.length} PJ</small><strong>{minutes===null?'—':minutes.toLocaleString('es-AR',{maximumFractionDigits:1})+' min'}</strong></div></div><Link className="button subtle" href={'/partidos/'+game.id+'?matchTab=live&liveSection=preview'}>Ver previa y alineaciones →</Link>
 {!reduced&&<details className="player-market-offers" onToggle={e=>setShowLines(e.currentTarget.open)}><summary>{markets[market]} · Líneas de mercado</summary>{showLines&&<>{!marketKeys[market]?<p>Esta estadística no tiene cuotas disponibles.</p>:offers.length?<ul className="ux-offers">{offers.map(r=>{const fresh=offerIsCurrent(r,now,lines?.dataStale||lineFailed);return <li key={r.book+r.side+r.line}><div><strong>{r.book}</strong><span>{r.side==='Over'?'Más de':'Menos de'} {r.line.toLocaleString('es-AR')}</span><small>Cuota decimal {r.price.toLocaleString('es-AR',{maximumFractionDigits:2})}</small><time dateTime={r.updatedAt}>Actualizada {time.format(new Date(r.updatedAt))} ARG</time>{!fresh&&<small className="offer-stale">Pendiente de actualización</small>}</div>{onUseLine&&<button type="button" className="button subtle" disabled={!fresh} onClick={()=>onUseLine(r)}>Aplicar al análisis</button>}</li>;})}</ul>:<p role="status">{lineFailed?'No pudimos actualizar las líneas.':!lines?'Consultando cuotas…':lines.state==='unconfigured'?'Cuotas de mercado no disponibles. Podés usar una línea manual para analizar el historial.':'No hay cuotas publicadas para este jugador y estadística.'}</p>}{marketKeys[market]&&<><p className="muted">La casa, la cuota y la hora identifican cada oferta. La frecuencia del historial no equivale a su probabilidad.</p><button className="button subtle" type="button" onClick={()=>setRetry(n=>n+1)}>Actualizar cuotas</button></>}</>}</details>}
 {!reduced&&<details className="ux-alert-controls"><summary>Avisos de cambios</summary><label><input type="checkbox" checked={enabled} onChange={e=>preferences(e.target.checked,frequency)}/> Avisarme en esta ficha</label><label>Frecuencia máxima<select value={frequency} onChange={e=>preferences(enabled,Number(e.target.value))}>{[5,15,60].map(n=><option key={n} value={n}>Un aviso cada {n} minutos</option>)}</select></label><p>Recibí avisos en esta ficha sobre cambios de disponibilidad y líneas.</p></details>}</>:<p role="status">{failed?'No pudimos consultar el calendario.':!calendar?'Consultando próximo partido…':!team?'Equipo actual sin confirmar.':'Sin próximo partido publicado.'}{failed&&<button className="button subtle" type="button" onClick={()=>setRetry(n=>n+1)}>Reintentar</button>}</p>}{notice&&<div className="ux-change-notice" role="status">{notice}<button type="button" className="icon" aria-label="Cerrar aviso" onClick={()=>setNotice('')}>×</button></div>}</section>;
}
