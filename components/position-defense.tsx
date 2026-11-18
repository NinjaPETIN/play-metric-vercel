'use client';

import {useEffect,useState} from 'react';
import {markets} from '../lib/analytics';
import {loadCachedData} from '../lib/client-data-cache';
import type {Competition} from '../lib/competitions';
import {positionLabels,type DefensePeriod,type PositionDefense,type PositionGroup} from '../lib/position-defense';

const periods={game:'Partido completo',q1:'Primer cuarto',h1:'Primera mitad'} as const;
const number=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});

export default function PositionDefenseView({opponent,season,competition,before}:{opponent:string;season:number;competition:Competition;before?:string}){
 const [open,setOpen]=useState(false);
 const [position,setPosition]=useState<PositionGroup>('guard');
 const [period,setPeriod]=useState<DefensePeriod>('game');
 const [result,setResult]=useState<{key:string;positions:PositionDefense|null}|null>(null);
 const params=new URLSearchParams({season:String(season),competition,period});
 if(before)params.set('before',before);
 const key=String(params);
 useEffect(()=>{
  if(!open)return;
  let active=true;
  loadCachedData<{positions:PositionDefense}>('/api/nba/team-defense?'+key).then(data=>{
   if(active)setResult({key,positions:data.positions});
  }).catch(()=>{if(active)setResult({key,positions:null});});
  return()=>{active=false;};
 },[open,key]);
 const current=result?.key===key?result:null;
 const rows=current?.positions?.[position]?.[opponent]??[];
 return <details className="position-defense" onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary>Defensa de {opponent} por posición</summary>
  {open&&<>
   <div className="nba-context-controls">
    <label>Posición<select value={position} onChange={e=>setPosition(e.target.value as PositionGroup)}>{Object.entries(positionLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Período<select value={period} onChange={e=>setPeriod(e.target.value as DefensePeriod)}>{Object.entries(periods).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   </div>
   {rows.length?<dl className="position-defense-results">{rows.map(r=><div key={r.metric}><dt>{markets[r.metric]}</dt><dd><strong>{number.format(r.average)}</strong> por partido · {r.rank}.º de {r.teams} · {r.games} PJ</dd></div>)}</dl>:
    <p role="status">{!current?'Consultando la defensa…':current.positions?'Muestra insuficiente para este rival y período.':'La defensa por posición no está disponible.'}</p>}
   <small>El 1.º permite menos. Se usan posiciones registradas y partidos con datos del período.</small>
  </>}
 </details>;
}
