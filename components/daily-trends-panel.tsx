'use client';
import NextImage from 'next/image';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { loadCachedData } from '../lib/client-data-cache';
import { dailyMarkets, minimumStreak, streakThresholds, type DailyTrendRow, type DailyTrends } from '../lib/daily-trends';
import { markets } from '../lib/analytics';
import { dailyDate, dailyNumber, dailyPercent } from '../lib/daily-trends-format';
import type { DefenseMetric } from '../lib/team-defense';
import { playerPath } from '../lib/player-path';
import { useReadingPreferences } from './reading-preferences';
import TeamLogo from './team-logo';

export default function DailyTrendsPanel({day}:{day:string}) {
 const { reduced } = useReadingPreferences();
 const [open,setOpen]=useState(false);
 const [state,setState]=useState<{day:string;data:DailyTrends|null}|null>(null);
 const [market,setMarket]=useState<DefenseMetric>('points');
 const [mode,setMode]=useState<'streaks'|'trends'>('streaks');
 const [threshold,setThreshold]=useState('');
 const [direction,setDirection]=useState<'atLeast'|'below'>('atLeast');
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);
 const filter=mode==='streaks'&&threshold?'&metric='+market+'&threshold='+threshold+'&side='+direction:'';
 const requestKey=day+filter;
 useEffect(()=>{
  if(!open||reduced) return;
  let active=true;
  void loadCachedData<DailyTrends>('/api/nba/daily-trends?day='+requestKey)
   .then(data=>{if(active)setState({day:requestKey,data});})
   .catch(()=>{if(active)setState({day:requestKey,data:null});});
  return ()=>{active=false;};
 },[open,requestKey,reduced]);
 const current=state?.day===requestKey?state:null;
 const data=current?.data;
 const rows=data?.reports?.[market]??[];
 const leader=rows[0];
 const streaks=data?.streaks?.[market]??[];
 const streakMode = mode === 'streaks';
 const featured = streakMode ? streaks[0] : leader;

 async function download() {
  if(!data||!featured)return;
  setBusy(true);
  setStatus('');
  try {
   const {drawDailyCard,drawStreakCard}=await import('../lib/daily-trends-card');
   const portrait=new Image();
   portrait.src='/api/nba/headshot/'+featured.id;
   const logos = streakMode ? [...new Set(streaks.map(row=>row.team))].map(team => {
    const image = new Image();
    image.src='/api/nba/team-logo/'+team;
    return [team,image] as const;
   }) : [];
   await Promise.race([Promise.allSettled([document.fonts.load('800 36px Poppins'),portrait.decode(),...logos.map(([,image])=>image.decode())]),new Promise(resolve=>setTimeout(resolve,3000))]);
   const canvas=document.createElement('canvas');
   if(streakMode) drawStreakCard(canvas,day,market,streaks,Object.fromEntries([...logos,['portrait',portrait]]),filter?direction:undefined);
   else drawDailyCard(canvas,data,market,rows,portrait.complete&&portrait.naturalWidth?portrait:undefined);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw Error();
   const url=URL.createObjectURL(blob);
   const link=document.createElement('a');
   link.href=url;
   link.download='statlane-'+(streakMode?'rachas-':'jornada-')+day+'-'+market+'.png';
   link.click();
   setTimeout(()=>URL.revokeObjectURL(url),5000);
   setStatus('Imagen descargada.');
  } catch { setStatus('No pudimos descargar la imagen.'); }
  finally {setBusy(false);}
 }

 if(reduced) return null;
 return <details className="card daily-trends" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary>Rachas y tendencias de la jornada <time dateTime={day}>{dailyDate(day)}</time></summary>
  {open&&<>
   <div className="daily-trends-controls">
    <div className="segmented" aria-label="Informe">{(['streaks','trends'] as const).map(option=><button key={option} type="button" aria-pressed={mode===option} onClick={()=>setMode(option)}>{option==='streaks'?'Rachas':'Tendencias'}</button>)}</div>
    <div className="segmented" aria-label="Estadística">{dailyMarkets.map(metric=><button key={metric} type="button" aria-pressed={market===metric} onClick={()=>{setMarket(metric);setThreshold('');setStatus('');}}>{markets[metric]}</button>)}</div>
    {streakMode&&<div className="daily-trends-controls">
     <label>Umbral común <select value={threshold} onChange={e=>{setThreshold(e.target.value);setStatus('');}}><option value="">Automático</option>{streakThresholds[market].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
     <label>Dirección <select disabled={!threshold} value={direction} onChange={e=>setDirection(e.target.value==='below'?'below':'atLeast')}><option value="atLeast">Al menos</option><option value="below">Menos de</option></select></label>
    </div>}
   </div>
   {!current?<p role="status">Preparando tendencias…</p>:!data?<p role="status">Tendencias no disponibles. Volvé a abrir el panel para reintentar.</p>:!data.games?<p>No hay partidos de temporada regular para esta fecha.</p>:<>
    <div className="daily-trends-controls">
     <button className="button subtle" type="button" disabled={!featured||busy} onClick={()=>void download()}><Download size={17}/> Descargar imagen</button>
    </div>
    {streakMode ? <>
     {streaks.length ? <div className="streak-board">
      <header><div><h3>Rachas de {markets[market].toLowerCase()}</h3><p>{dailyDate(day)} · {data.games} partidos programados</p></div><NextImage src={'/api/nba/headshot/'+streaks[0].id} alt="" width="172" height="126" onError={event=>{event.currentTarget.hidden=true;}}/></header>
      <ol>{streaks.map(row=><li key={row.id}><TeamLogo team={row.team} size={38}/><a href={playerPath(row)}>{row.name}<small>{row.team} · vs. {row.opponent}</small>{row.windows&&<small>{row.windows.map((sample,i)=>'L'+[5,10,20][i]+': '+(sample.n?sample.hits+'/'+sample.n:'—')).join(' · ')}</small>}</a><strong>{filter&&direction==='below'?'<'+row.threshold:row.threshold+'+'}</strong><b>{row.count} seguidos</b></li>)}</ol>
     </div> : <p>Sin rachas de al menos {minimumStreak} partidos para esta estadística.</p>}
     <p className="daily-trends-note">{filter?'Mismo umbral para todos. L5, L10 y L20 usan los partidos con datos de la temporada.':<>Por jugador se muestra el mayor umbral alcanzado en sus últimos {minimumStreak} partidos jugados y cuántos partidos consecutivos lleva cumpliéndolo.</>}</p>
    </> : leader ? <>
     <article className="daily-leader">
      <div className="daily-leader-identity"><NextImage src={'/api/nba/headshot/'+leader.id} alt="" width="140" height="105" onError={event=>{event.currentTarget.hidden=true;}}/><div><small>{data.games} partidos · {markets[market]}</small><h3><a href={playerPath(leader)}>{leader.name}</a></h3><span><TeamLogo team={leader.team} size={20}/> {leader.team} {leader.home?'vs.':'@'} {leader.opponent}</span></div></div>
      <div className="daily-leader-result"><strong>{leader.form.hits}/{leader.form.n} · {dailyPercent(leader.form)}</strong><span>L20</span><small>Más de {dailyNumber.format(leader.line)} · Cruce {leader.grade??'—'}</small></div>
      <Spark row={leader} large/>
     </article>
     <div className="table-scroll"><table className="daily-trends-table">
      <thead><tr><th>#</th><th>Jugador y referencia</th><th>Últimos 10</th><th>L20</th><th>Temporada</th><th>Vs. rival</th><th>Cruce</th></tr></thead>
      <tbody>{rows.map((row,index)=><tr key={row.id}><td>{index+1}</td><th scope="row"><TeamLogo team={row.team} size={22}/> <a href={playerPath(row)}>{row.name}</a><small>{row.team} {row.home?'vs.':'@'} {row.opponent} · Más de {dailyNumber.format(row.line)}</small></th><td><Spark row={row}/></td>{[row.form,row.season,row.versus].map((sample,i)=><td key={i}><strong>{sample.n ? sample.hits+'/'+sample.n+' · ':''}{dailyPercent(sample)}</strong>{i===2&&sample.n>0&&sample.n<5&&<small>Muestra corta</small>}</td>)}<td>{row.grade&&row.defense?<details className="daily-grade-detail"><summary aria-label={'Nota del cruce de '+row.name+': '+row.grade}>{row.grade}</summary><small>{row.opponent} · {row.defense.rank}.º de {row.defense.teams} · {row.defense.games} partidos</small></details>:'—'}</td></tr>)}</tbody>
     </table></div>
     <p className="daily-trends-note">Referencias de Statlane. Cada porcentaje corresponde al historial mostrado. La nota del cruce se basa en la defensa del rival.</p>
    </>:<p>Sin jugadores con al menos 10 partidos válidos para esta estadística.</p>}
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
