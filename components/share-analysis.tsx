'use client';
import {useState} from 'react';
import {Download,Link as LinkIcon} from 'lucide-react';
import {analyze,value,markets,type Game,type Market} from '../lib/analytics';
import {trackBeta} from '../lib/beta-events';
export default function ShareAnalysis({name,team,games,market,line,side,season,competition,filters,fetchedAt}:{name:string;team:string;games:Game[];market:Market;line:number;side:'over'|'under';season:number;competition:string;filters:string;fetchedAt:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function download(){setBusy(true);setMessage('');try{await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;const ctx=canvas.getContext('2d');if(!ctx)throw Error();const stats=analyze(games,market,line,side),fmt=(n:number)=>n.toLocaleString('es-AR',{maximumFractionDigits:1});
 ctx.fillStyle='#f4f7fc';ctx.fillRect(0,0,1200,900);ctx.fillStyle='#fff';ctx.fillRect(40,130,1120,710);ctx.fillStyle='#172239';ctx.font='800 29px Poppins, sans-serif';ctx.fillText('STATLANE',60,65);ctx.font='16px Poppins, sans-serif';ctx.fillText('ESTADÍSTICAS NBA EN CONTEXTO',60,97);
 const text=(s:string,x:number,y:number,max=1080)=>ctx.fillText(s,x,y,max);
 ctx.font='800 42px Poppins, sans-serif';text(name,70,195);ctx.font='18px Poppins, sans-serif';text(`${team} · ${competition} · ${season}/${String(season+1).slice(-2)}`,70,230);
 ctx.fillStyle='#5361df';ctx.font='600 25px Poppins, sans-serif';text(`${markets[market]} · ${side==='over'?'Más de':'Menos de'} ${fmt(line)}`,70,280);
 ctx.fillStyle='#172239';ctx.font='600 23px Poppins, sans-serif';text(`${stats.hits} de ${stats.n} cumplen · ${stats.pushes} empates · Promedio ${stats.average===null?'—':fmt(stats.average)}`,70,325);
 const rows=[...games].reverse().map(g=>({g,v:value(g,market)})),maximum=Math.max(line+1,...rows.map(r=>r.v??0),1),left=80,top=375,width=1040,height=235,step=width/Math.max(rows.length,1),bar=Math.min(68,step*.65);
 ctx.strokeStyle='#dbe4f2';ctx.beginPath();ctx.moveTo(left,top+height);ctx.lineTo(left+width,top+height);ctx.stroke();
 rows.forEach(({g,v},i)=>{const x=left+i*step+(step-bar)/2;ctx.fillStyle=v===null||v===line?'#aab7cb':(side==='over'?v>line:v<line)?'#5361df':'#9ba9c0';if(v!==null)ctx.fillRect(x,top+height-height*v/maximum,bar,Math.max(2,height*v/maximum));if(rows.length<=20||i%Math.ceil(rows.length/10)===0||i===rows.length-1){ctx.fillStyle='#172239';ctx.font='15px Poppins, sans-serif';ctx.textAlign='center';ctx.fillText(v===null?'—':fmt(v),x+bar/2,top+height-height*(v??0)/maximum-9);ctx.font='12px Poppins, sans-serif';ctx.fillText(g.opponent,x+bar/2,top+height+24);ctx.fillText(g.date.slice(5),x+bar/2,top+height+44);}});ctx.textAlign='left';
 ctx.setLineDash([8,6]);ctx.strokeStyle='#5361df';ctx.beginPath();ctx.moveTo(left,top+height-height*line/maximum);ctx.lineTo(left+width,top+height-height*line/maximum);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#536780';ctx.font='16px Poppins, sans-serif';text(filters,70,695);text(`Importado: ${new Date(fetchedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} ARG`,70,730);text('Frecuencia histórica, no probabilidad de acierto. Partidos terminados.',70,770);text('La línea es una referencia de análisis ajustable.',70,802);
 ctx.fillStyle='#172239';ctx.font='16px Poppins, sans-serif';text(window.location.origin,60,875);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error()),'image/png'));const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='statlane-'+market+'-'+season+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);trackBeta('share_download');setMessage('Tarjeta descargada con la muestra y los filtros actuales.');
 }catch{setMessage('No pudimos generar la tarjeta. Probá nuevamente.');}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(window.location.href);trackBeta('link_copied');setMessage('Enlace copiado. Los perfiles privados requieren iniciar sesión; la ficha de ejemplo es pública.');}catch{setMessage('No pudimos copiar el enlace. Podés copiar la dirección del navegador.');}}
 return <section className="share-analysis" aria-label="Compartir este análisis"><div><strong>Llevate este análisis</strong><p>La imagen incluye la estadística, muestra, filtros y fecha de importación.</p></div><div className="share-actions"><button className="button" onClick={download} disabled={busy||!games.length}><Download size={16}/>{busy?'Generando…':'Descargar tarjeta PNG'}</button><button className="button subtle" onClick={copy}><LinkIcon size={16}/>Copiar enlace</button></div>{message&&<p className="share-message" role="status">{message}</p>}</section>;
}
