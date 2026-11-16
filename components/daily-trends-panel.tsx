'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { loadCachedData } from '../lib/client-data-cache';
import { dailyMarkets, type DailyTrendRow, type DailyTrends } from '../lib/daily-trends';
import { markets } from '../lib/analytics';
import { dailyDate, dailyNumber, dailyPercent, drawDailyCard } from '../lib/daily-trends-card';
import type { DefenseMetric } from '../lib/team-defense';
import { playerPath } from '../lib/player-path';
import TeamLogo from './team-logo';

export default function DailyTrendsPanel({day}:{day:string}) {
 const [open,setOpen]=useState(false);
 const [state,setState]=useState<{day:string;data:DailyTrends|null}|null>(null);
 const [market,setMarket]=useState<DefenseMetric>('points');
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!open) return;
  let active=true;
  void loadCachedData<DailyTrends>('/api/nba/daily-trends?day='+day)
   .then(data=>{if(active)setState({day,data});})
   .catch(()=>{if(active)setState({day,data:null});});
  return ()=>{active=false;};
 },[open,day]);
 const current=state?.day===day?state:null;
 const data=current?.data;
 const rows=data?.reports?.[market]??[];
 const leader=rows[0];

 async function download() {
  if(!data||!leader)return;
  setBusy(true);
  setStatus('');
  try {
   const portrait=new Image();
   portrait.src='/api/nba/headshot/'+leader.id;
   await Promise.allSettled([document.fonts.load('800 36px Poppins'),Promise.race([portrait.decode(),new Promise(resolve=>setTimeout(resolve,3000))])]);
   const canvas=document.createElement('canvas');
   drawDailyCard(canvas,data,market,rows,portrait.complete&&portrait.naturalWidth?portrait:undefined);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw Error();
   const url=URL.createObjectURL(blob);
   const link=document.createElement('a');
   link.href=url;
   link.download='statlane-jornada-'+day+'-'+market+'.png';
   link.click();
   setTimeout(()=>URL.revokeObjectURL(url),5000);
   setStatus('Imagen descargada.');
  } catch { setStatus('No pudimos descargar la imagen.'); }
  finally {setBusy(false);}
 }

 return <details className="card daily-trends" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary>Tendencias de la jornada <time dateTime={day}>{dailyDate(day)}</time></summary>
  {open&&<>
   {!current?<p role="status">Preparando tendencias…</p>:!data?<p role="status">Tendencias no disponibles. Volvé a abrir el panel para reintentar.</p>:!data.games?<p>No hay partidos de temporada regular para esta fecha.</p>:<>
    <div className="daily-trends-controls">
     <div className="segmented" aria-label="Estadística">{dailyMarkets.map(metric=><button type="button" key={metric} className={market===metric?'selected':''} aria-pressed={market===metric} onClick={()=>{setMarket(metric);setStatus('');}}>{markets[metric]}</button>)}</div>
     <button className="button subtle" type="button" disabled={!rows.length||busy} onClick={()=>void download()}><Download size={17}/> Descargar imagen</button>
    </div>
    {leader ? <>
     <article className="daily-leader">
      <div className="daily-leader-identity"><img src={'/api/nba/headshot/'+leader.id} alt="" width="140" height="105" onError={event=>{event.currentTarget.hidden=true;}}/><div><small>{data.games} partidos · {markets[market]}</small><h3><a href={playerPath(leader)}>{leader.name}</a></h3><span><TeamLogo team={leader.team} size={20}/> {leader.team} {leader.home?'vs.':'@'} {leader.opponent}</span></div></div>
      <div className="daily-leader-result"><strong>{dailyPercent(leader.form)}</strong><span>{leader.form.hits}/{leader.form.n} · L20</span><small>Más de {dailyNumber.format(leader.line)} · Cruce {leader.grade??'—'}</small></div>
      <Spark row={leader} large/>
     </article>
     <div className="table-scroll"><table className="daily-trends-table">
      <thead><tr><th>#</th><th>Jugador y referencia</th><th>Últimos 10</th><th>L20</th><th>Temporada</th><th>Vs. rival</th><th>Cruce</th></tr></thead>
      <tbody>{rows.map((row,index)=><tr key={row.id}><td>{index+1}</td><th scope="row"><TeamLogo team={row.team} size={22}/> <a href={playerPath(row)}>{row.name}</a><small>{row.team} {row.home?'vs.':'@'} {row.opponent} · Más de {dailyNumber.format(row.line)}</small></th><td><Spark row={row}/></td>{[row.form,row.season,row.versus].map((sample,i)=><td key={i}><strong>{dailyPercent(sample)}</strong>{sample.n>0&&<small>{sample.hits}/{sample.n}</small>}</td>)}<td>{row.grade??'—'}</td></tr>)}</tbody>
     </table></div>
    </>:<p>Sin jugadores con al menos 10 partidos válidos para esta estadística.</p>}
    <p className="daily-trends-note">Referencias de Statlane. Cada porcentaje corresponde al historial mostrado. La nota del cruce se basa en la defensa del rival.</p>
   </>}
   {status&&<p role="status">{status}</p>}
  </>}
 </details>;
}

function Spark({row,large=false}:{row:DailyTrendRow;large?:boolean}) {
 const max=Math.max(1,row.line,...row.recent.map(game=>game.value??0))*1.15;
 const labels=row.recent.map(game=>game.opponent+' '+(game.value??'sin dato')).join(', ');
 return <div className={'daily-spark'+(large?' is-large':'')} role="img" aria-label={labels}>
  {row.recent.map((game,index)=><span key={index} title={game.opponent+' · '+(game.value??'Sin dato')}>
   {large&&<b>{game.value??'—'}</b>}<i data-result={game.value===null?'missing':game.value===row.line?'equal':game.value>row.line?'hit':'miss'} style={{height:Math.max(3,(game.value??0)/max*100)+'%'}}/>
  </span>)}
  <em style={{bottom:row.line/max*100+'%'}}/>
 </div>;
}
