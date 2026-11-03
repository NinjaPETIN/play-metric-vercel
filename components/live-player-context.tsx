'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {loadCachedData} from '../lib/client-data-cache';
import {livePlayerBaseline} from '../lib/live-player-baseline';
import {nbaPlayerId} from '../lib/player-identity';
import type {Competition} from '../lib/competitions';
import type {Player} from '../lib/data';
import type {BoxData} from '../lib/live-boxscore';
type Person=BoxData['teams'][number]['players'][number];
const fmt=(v:number|null)=>v===null?'—':v.toLocaleString('es-AR',{maximumFractionDigits:1});
export default function LivePlayerContext({person,data,competition='regular',nbaId}:{nbaId?:string|null;person:Person;data:BoxData;competition?:Competition}){
 const start=new Date(data.game.startsAt),year=Number(new Intl.DateTimeFormat('en',{timeZone:'America/New_York',year:'numeric'}).format(start)),month=Number(new Intl.DateTimeFormat('en',{timeZone:'America/New_York',month:'numeric'}).format(start)),season=month>=(competition==='preseason'?9:10)?year:year-1;
 const id=nbaId===undefined?nbaPlayerId(person.name):nbaId,[baseline,setBaseline]=useState<ReturnType<typeof livePlayerBaseline>|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!id)return;let active=true;loadCachedData<{players:Player[]}>('/api/v1/players/'+id+'?format=compact&competition='+competition+'&season='+season).then(result=>{const p=result.players.find(p=>p.id===id);if(active){if(!p)throw Error('No encontramos historial para este jugador.');setBaseline(livePlayerBaseline(p.games,data.game.nbaId??'',data.game.startsAt));}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id,data.game.nbaId,data.game.startsAt,competition,season]);
 const max=Math.max(1,person.points??0,...(baseline?.recent.map(g=>g.points)??[]));
 return <section className="sl-player-context card" aria-label={'Contexto de '+person.name}><header><h3>{person.name}</h3><span>{data.game.state==='final'?'Partido finalizado':'Partido en curso'}</span></header>{!id?<p>Este jugador todavía no tiene una correspondencia confirmada en el historial NBA.</p>:error?<p role="status">{error} <Link href={'/jugadores/'+id}>Abrir perfil</Link></p>:!baseline?<p>Consultando el historial del jugador…</p>:<><div className="sl-context-numbers">{([['points','Puntos'],['rebounds','Rebotes'],['assists','Asistencias'],['minutes','Minutos']] as const).map(([key,label])=><div key={key}><span>{label}</span><b>{key==='minutes'?(person.minutes??'—'):person[key]??'—'}</b><small>Promedio {baseline.n} PJ: {fmt(baseline[key])}</small></div>)}</div><h4>Últimos {baseline.n} partidos anteriores a este encuentro</h4>{baseline.n>0?<div className="sl-context-bars" role="img" aria-label={'Puntos de los últimos '+baseline.n+' partidos: '+baseline.recent.map(g=>g.points).join(', ')}>{baseline.recent.map(g=><div key={g.date}><b>{g.points}</b><i style={{height:Math.max(3,g.points/max*130)}}/><small>{new Date(g.date+'T12:00:00Z').toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</small></div>)}<div className="is-current"><b>{person.points??'—'}</b><i style={{height:Math.max(3,(person.points??0)/max*130)}}/><small>Hoy{data.game.state!=='final'?' · en curso':''}</small></div></div>:<p>No hay partidos anteriores registrados en esta temporada.</p>}<small>El encuentro actual no se incluye en el promedio histórico.</small></>}</section>;
}
