'use client';
import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './public-landing.module.css';

const samples={
 Puntos:[28,34,26,38,41,29,33,37,25,40],
 Rebotes:[7,8,5,9,10,6,8,11,7,9],
 Asistencias:[6,9,7,8,12,7,10,8,5,11],
};
type Metric=keyof typeof samples;
export default function LandingExample(){
 const [metric,setMetric]=useState<Metric>('Puntos');
 const games=samples[metric];
 const average=(games.reduce((sum,stat)=>sum+stat,0)/games.length).toLocaleString('es-AR',{maximumFractionDigits:1});
 return <figure className={styles.example}>
  <figcaption>Luka Dončić</figcaption>
  <div className={styles.player}>
   <Image src="https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png" width={300} height={219} alt="Luka Dončić" unoptimized/>
   <div><span>Últimos 10 partidos</span><b>{average}</b><strong>{metric} por partido</strong>
    <div className={styles.chart} role="img" aria-label={metric+': '+games.join(', ')}>{games.map((stat,index)=><span key={index} style={{height:stat/Math.max(...games)*86+'%'}} />)}</div>
   </div>
  </div>
  <div className={styles.demoControls}>{(Object.keys(samples) as Metric[]).map(value=><button key={value} type="button" aria-pressed={metric===value} onClick={()=>setMetric(value)}>{value}</button>)}</div>
  <footer><small>Datos de ejemplo</small><Link href="/jugadores/lebron-james" prefetch={false}>Probar una ficha →</Link></footer>
 </figure>;
}
