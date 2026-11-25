'use client';
import {memo} from 'react';
import {value,type Game,type Market} from '../lib/analytics';
import {useReadingPreferences} from './reading-preferences';
const dateFormat=new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const numberFormat=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});
function HistorySpark({games,market,line,side}:{games:Game[];market:Market;line:number;side:'over'|'under'}){
 const {reduced}=useReadingPreferences();
 const values=games.slice().reverse().flatMap(game=>{const stat=value(game,market);return stat===null?[]:[{game,stat}];});
 const maximum=Math.max(reduced?0:line+3,...values.map(row=>row.stat),1);
 const gap=Math.min(2,120/Math.max(values.length,1)*.18),width=values.length?(120-gap*(values.length-1))/values.length:120;
 return <svg className="spark" viewBox="0 0 120 38" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Últimos ${games.length} partidos`+(reduced?'':`, línea ${line}`)}>{values.map(({game,stat},index)=>{
  const color=reduced?'var(--brand)':stat===line?'#94a3b8':(side==='over'?stat>line:stat<line)?'#19965b':'#d94b55',x=index*(width+gap);
  return <g key={game.date}><rect x={x} y={38-38*stat/maximum} width={Math.max(1,width)} height={Math.max(stat?1:0,38*stat/maximum)} rx={1} fill={color}><title>{dateFormat.format(new Date(game.date+'T12:00:00Z'))} · {game.home?'vs.':'@'} {game.opponent} · {stat} · {numberFormat.format(game.minutes)} min</title></rect>{!stat&&<line x1={x} x2={x+width} y1={37} y2={37} stroke={color} strokeWidth={2}/>}</g>;
 })}</svg>;
}
export default memo(HistorySpark);
