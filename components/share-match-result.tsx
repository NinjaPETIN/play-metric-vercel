'use client';
import {useState} from 'react';
import {Share2,Download} from 'lucide-react';
import type {BoxData} from '../lib/live-boxscore';
import {periodLabel} from '../lib/match-period-stats';

export default function ShareMatchResult({data}:{data:BoxData}){
 const [copied,setCopied]=useState('');
 const {game,teams,context}=data;
 const score=teams.map(t=>t.code+' '+t.score).join(' - ');
 const periods=context?.periods??[];
 const count=Math.max(0,...periods.map(p=>p.scores.length));
 const lines=Array.from({length:count},(_,i)=>periodLabel(i+1)+'  ·  '+teams.map(t=>periods.find(p=>p.team===t.code)?.scores[i]??'—').join(' - '));
 const leaders=teams.map(t=>t.players.filter(p=>!p.didNotPlay&&p.points!==null).sort((a,b)=>b.points!-a.points!)[0]);
 const highlights=leaders.flatMap((p,i)=>p?[teams[i].code+'  ·  '+p.name+'  ·  '+p.points+' PTS']:[]);
 function download(){
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=Math.max(860,505+Math.max(1,lines.length)*46+highlights.length*58);
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.fillStyle='#101827';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#a9a5ff';ctx.fillRect(0,0,canvas.width,14);
  const write=(value:string,y:number,size:number,color='#f4f7fc')=>{
   ctx.font='700 '+size+'px Arial';ctx.fillStyle=color;ctx.fillText(value,64,y,952);
  };
  write('STATLANE',94,43);write('RESULTADO FINAL',153,25,'#a9a5ff');
  write(score,251,77);write('PARCIALES',325,26,'#a9a5ff');
  (lines.length?lines:['Parciales no disponibles']).forEach((line,i)=>write(line,380+i*46,32));
  highlights.forEach((line,i)=>write(line,445+Math.max(1,lines.length)*46+i*58,32,'#67e3bb'));
  write('Datos de ESPN',canvas.height-45,24,'#aab9d2');
  canvas.toBlob(blob=>{
   if(!blob){setCopied('No se pudo crear la imagen.');return;}
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='statlane-'+game.nbaId+'-final.png';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'image/png');
 }
 return <details className="match-share-result">
  <summary><Share2 size={17}/> Compartir resultado</summary>
  <div className="card">
   <strong>{score} · Final</strong>
   {lines.length>0&&<ul aria-label="Parciales">{lines.map(line=><li key={line}>{line}</li>)}</ul>}
   {highlights.map(line=><p key={line}>{line}</p>)}
   <button className="button" type="button" onClick={download}><Download size={16}/> Descargar imagen</button>
   <button className="button subtle" type="button" onClick={()=>navigator.clipboard.writeText([score+' · Final',...highlights,window.location.origin+'/partidos/'+game.nbaId+'?matchTab=live'].join('\n')).then(()=>setCopied('Texto copiado.')).catch(()=>setCopied('No se pudo copiar el texto.'))}>Copiar texto</button>
   <small role="status">{copied}</small>
  </div>
 </details>;
}
