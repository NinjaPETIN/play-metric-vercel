'use client';

import {useEffect,useState} from 'react';
import {loadCachedData} from '../lib/client-data-cache';
import type {MarketLines as Data,MarketLine} from '../lib/market-lines';

const labels:Record<MarketLine['market'],string>={player_points:'Puntos',player_rebounds:'Rebotes',player_assists:'Asistencias',player_threes:'Triples'};
const number=new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});
const time=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

export default function MatchMarketLines({id}:{id:string}){
 const [open,setOpen]=useState(false);
 const [data,setData]=useState<Data|null>(null);
 const [player,setPlayer]=useState('');
 const [market,setMarket]=useState<MarketLine['market']>('player_points');
 useEffect(()=>{
  if(!open)return;
  let active=true;
  const refresh=(force=false)=>{
   if(document.hidden)return;
   loadCachedData<Data>('/api/nba/market-lines/'+id,force).then(data=>{if(active)setData(data);})
    .catch(()=>{if(active)setData({state:'unavailable',lines:[]});});
  };
  refresh();
  const timer=setInterval(()=>refresh(true),180_000);
  const resume=()=>refresh();
  document.addEventListener('visibilitychange',resume);
  return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',resume);};
 },[id,open]);
 const names=[...new Set(data?.lines.filter(row=>row.market===market).map(row=>row.player))].sort((a,b)=>a.localeCompare(b,'es'));
 const selected=names.includes(player)?player:names[0];
 const rows=data?.lines.filter(row=>row.player===selected&&row.market===market)??[];
 return <details className="card match-market-lines" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Líneas de mercado</summary>
  {open&&(!rows.length&&data?.state!=='ready'?<p role="status">{!data?'Consultando líneas…':data.state==='unconfigured'?'El proveedor de líneas todavía no está configurado.':'No hay líneas disponibles para este partido.'}</p>:<>
   <div className="nba-context-controls">
    <label>Estadística<select value={market} onChange={e=>setMarket(e.target.value as MarketLine['market'])}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    {selected&&<label>Jugador<select value={selected} onChange={e=>setPlayer(e.target.value)}>{names.map(name=><option key={name}>{name}</option>)}</select></label>}
   </div>
   {rows.length?<div className="table-scroll"><table className="history"><thead><tr>{['Casa','Dirección','Primera observada','Actual','Cambio','Cuota decimal','Actualizada (ARG)'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
    {rows.map(row=><tr key={row.book+row.side}><th scope="row">{row.book}</th><td>{row.side==='Over'?'Más de':'Menos de'}</td>
     <td title={row.firstAt?time.format(new Date(row.firstAt))+' ARG':undefined}>{row.firstLine===null?'—':number.format(row.firstLine)}</td>
     <td>{number.format(row.line)}</td><td>{row.firstLine===null?'—':number.format(row.line-row.firstLine)}</td><td>{number.format(row.price)}</td><td>{time.format(new Date(row.updatedAt))}</td></tr>)}
   </tbody></table></div>:<p>Sin precios publicados para esta estadística.</p>}
   <small>Fuente: The Odds API · Casas de EE. UU. · La primera línea observada puede ser posterior a la apertura.</small>
   {data?.dataStale&&<p role="status">Mostrando la última lectura disponible.</p>}
  </>)}
 </details>;
}
