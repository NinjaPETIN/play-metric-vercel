'use client';
import {useEffect,useState} from 'react';
import {useReadingPreferences} from './reading-preferences';
import type {BoxData} from '../lib/live-boxscore';

const labels={points:'Puntos',rebounds:'Rebotes',assists:'Asistencias'} as const;
type Metric=keyof typeof labels;
type Rule={player:string;metric:Metric;target:number;reached:boolean};

export default function MatchPlayerAlerts({data,fresh}:{data:BoxData;fresh:boolean}){
 const key='statlane:alerts:'+data.game.id;
 const preferenceKey=key+':mode';
 const {reduced,now}=useReadingPreferences();
 const [mode,setMode]=useState<{off:boolean;mutedUntil:number}>({off:false,mutedUntil:0});
 const muted=mode.off||mode.mutedUntil>now;
 useEffect(()=>{
  function read() {
   try {
    const saved=JSON.parse(localStorage.getItem(preferenceKey)??'null');
    setMode({off:saved?.off===true,mutedUntil:Number.isFinite(saved?.mutedUntil)?saved.mutedUntil:0});
   } catch {}
  }
  const timeout=window.setTimeout(read,0);
  window.addEventListener('storage',read);
  return()=>{clearTimeout(timeout);window.removeEventListener('storage',read);};
 },[preferenceKey]);
 function setAlertMode(off:boolean,mutedUntil:number) {
  const next={off,mutedUntil};
  setMode(next);
  setNotice('');
  try {localStorage.setItem(preferenceKey,JSON.stringify(next));} catch {}
 }
 const [rules,setRules]=useState<Rule[]>([]);
 const [metric,setMetric]=useState<Metric>('points');
 const [target,setTarget]=useState('20');
 const [playerId,setPlayerId]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  if (!muted && !reduced) return;
  const timer=window.setTimeout(()=>setNotice(''),0);
  return ()=>window.clearTimeout(timer);
 },[muted,reduced]);
 useEffect(()=>{
  try{
   const saved:unknown=JSON.parse(localStorage.getItem(key)??'[]');
   if(Array.isArray(saved))queueMicrotask(()=>setRules(saved.filter((r):r is Rule=>r&&typeof r.player==='string'&&Object.hasOwn(labels,r.metric)&&Number.isInteger(r.target)&&r.target>0&&typeof r.reached==='boolean').slice(0,30)));
  }catch{}
 },[key]);
 const players=data.teams.flatMap(t=>t.players);
 function save(next:Rule[]){
  setRules(next);
  try{localStorage.setItem(key,JSON.stringify(next));}catch{}
 }
 useEffect(()=>{
  if(!fresh||!['live','final'].includes(data.game.state))return;
  const byId=new Map(data.teams.flatMap(t=>t.players.map(p=>[p.id,p] as const)));
  const next=rules.map(rule=>{
   const value=byId.get(rule.player)?.[rule.metric];
   return !rule.reached&&value!=null&&value>=rule.target?{...rule,reached:true}:rule;
  });
  if(next.some((r,i)=>r!==rules[i]))queueMicrotask(()=>{
   setRules(next);
   if(!muted&&!reduced)setNotice(next.filter((r,i)=>r!==rules[i]).map(r=>byId.get(r.player)?.name+' alcanzó '+r.target+' '+labels[r.metric].toLowerCase()).join(' · '));
   try{localStorage.setItem(key,JSON.stringify(next));}catch{}
  });
 },[data,fresh,key,rules,muted,reduced]);
 if(reduced||data.game.state!=='live'&&!rules.length)return null;
 return <><p role="status" hidden={!notice||muted}>{notice}</p><details className="card match-alerts">
  <summary>Alertas del partido{rules.length?' · '+rules.filter(r=>r.reached).length+' alcanzadas':''}</summary>
  <div className="reading-actions match-alert-actions">
   {muted ? <button type="button" className="button subtle" onClick={()=>setAlertMode(false,0)}>Reactivar alertas</button> : <>
    <button type="button" className="button subtle" onClick={()=>{
     const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});
     setAlertMode(false,Date.parse(today+'T00:00:00-03:00')+86400000);
    }}>Silenciar hasta mañana</button>
    <button type="button" className="button subtle" onClick={()=>setAlertMode(true,0)}>Desactivar alertas</button>
   </>}
   {muted&&<span role="status">{mode.off?'Alertas desactivadas':'Alertas silenciadas hasta mañana'}</span>}
  </div>
  {!muted&&data.game.state==='live'&&<form onSubmit={event=>{
   event.preventDefault();
   const value=Number(target);
   if(!players.some(p=>p.id===playerId)||!Number.isInteger(value)||value<1||value>300||rules.length>=30||rules.some(r=>r.player===playerId&&r.metric===metric&&r.target===value))return;
   save([...rules,{player:playerId,metric,target:value,reached:false}]);
  }}>
   <label>Jugador <select required value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">Elegir jugador</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label>Estadística <select value={metric} onChange={e=>setMetric(e.target.value as Metric)}>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <label>Umbral <input type="number" min="1" max="300" required value={target} onChange={e=>setTarget(e.target.value)}/></label>
   <button type="submit" className="button">Agregar alerta</button>
  </form>}
  <ul aria-live="polite">{rules.map(rule=><li key={rule.player+rule.metric+rule.target}>
   {players.find(p=>p.id===rule.player)?.name} · {rule.target} {labels[rule.metric].toLowerCase()} · {rule.reached?'Alcanzado':data.game.state==='final'?'Partido finalizado':'Pendiente'}
   <button type="button" className="button subtle" onClick={()=>save(rules.filter(r=>r!==rule))}>Quitar</button>
  </li>)}</ul>
 </details></>;
}
