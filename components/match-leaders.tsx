'use client';
import {useState} from 'react';
import type {BoxData} from '../lib/live-boxscore';
import {periodLabel} from '../lib/match-period-stats';
import TeamLogo from './team-logo';

const labels={points:'Puntos',rebounds:'Rebotes',assists:'Asistencias',threes:'Triples'} as const;
type Team=BoxData['teams'][number];

export default function MatchLeaders({teams,onOpen,period}:{teams:Team[];period:number|null;onOpen:(id:string)=>void}){
 const [metric,setMetric]=useState<keyof typeof labels>('points');
 const ranked=teams.flatMap(team=>team.players.flatMap(player=>{
  const value=metric==='threes'?(player.threes===null?null:Number(player.threes.split('-')[0])):player[metric];
  return player.didNotPlay||value===null?[]:[{id:player.id,name:player.name,team:team.code,value}];
 })).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,5);
 return <section className="card match-leaders">
  <header><h3>{period===null?'Top 5 del partido':'Top 5 · '+periodLabel(period)}</h3><div className="segmented" aria-label="Estadística del ranking">
   {(Object.keys(labels) as Array<keyof typeof labels>).map(key=><button key={key} type="button" className={key===metric?'selected':''} aria-pressed={key===metric} onClick={()=>setMetric(key)}>{labels[key]}</button>)}
  </div></header>
  {ranked.length?<ol>{ranked.map(p=><li key={p.id}><button type="button" aria-haspopup="dialog" onClick={()=>onOpen(p.id)}><TeamLogo team={p.team} size={22}/><span>{p.name}</span><strong>{p.value}</strong></button></li>)}</ol>:<p>No hay cifras confirmadas para esta selección.</p>}
 </section>;
}
