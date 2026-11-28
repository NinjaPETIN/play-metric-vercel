'use client';
import {useEffect,useState} from 'react';
export default function MatchCountdown({startsAt}:{startsAt:string|null|undefined}){
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{const update=()=>{if(document.visibilityState!=='hidden')setNow(Date.now());};const first=setTimeout(update,0),timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);return()=>{clearTimeout(first);clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[]);
 const start=startsAt?Date.parse(startsAt):NaN;
 if(!Number.isFinite(start)||now===null)return <span>Horario del encuentro</span>;
 const remaining=Math.max(0,Math.ceil((start-now)/1000));
 if(!remaining)return <span>Esperando el salto inicial</span>;
 const values=[Math.floor(remaining/86400),Math.floor(remaining/3600)%24,Math.floor(remaining/60)%60,remaining%60];
 return <span aria-label="Cuenta regresiva al inicio" style={{fontVariantNumeric:'tabular-nums'}}>{values.map((n,i)=>String(n).padStart(2,'0')+['d ','h ','m ','s'][i]).join('')}</span>;
}
