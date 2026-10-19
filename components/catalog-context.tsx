'use client';
import type {Player} from '../lib/data';
import {markets,type Market} from '../lib/analytics';
import type {CatalogStat} from '../lib/catalog-summary';
const number=(n:number)=>n.toLocaleString('es-AR',{maximumFractionDigits:1});
export default function CatalogContext({rows,market,last,onOpen}:{rows:Array<{p:Player;a:CatalogStat}>;market:Market;last:number;onOpen:(p:Player,m:Market)=>void}){
 const changes=rows.filter(r=>r.a.comparison).sort((a,b)=>Math.abs(b.a.comparison!.minutesDelta)-Math.abs(a.a.comparison!.minutesDelta)).slice(0,2);
 return <section className="card catalog-radar calculated-context" aria-label="Cambios del historial"><div className="card-title"><h3>Qué cambió</h3><span>{last?'L'+last:'Historial'}</span></div><p className="catalog-radar-note">Comparación de muestras consecutivas con los mismos filtros. No explica la causa ni predice el próximo partido.</p>{changes.map(({p,a})=>{const c=a.comparison!;return <button className="context-change" key={p.id} onClick={()=>onOpen(p,market)}><strong>{p.name}</strong><b>{Math.abs(c.minutesDelta)<.05?'Minutos estables':`${c.minutesDelta>0?'+':'−'}${number(Math.abs(c.minutesDelta))} min por partido`}</b><span>{number(c.recentMinutes)} ahora · {number(c.previousMinutes)} antes</span><span>{markets[market]}: {c.averageDelta>=0?'+':'−'}{number(Math.abs(c.averageDelta))} por partido</span><small>Últimos {c.recentN} vs. {c.previousN} anteriores · {c.from} a {c.through}</small></button>;})}{!changes.length&&<p className="muted">{last?`Necesitamos ${last*2} partidos válidos por jugador para comparar dos muestras completas de ${last}.`:'Elegí L5, L10, L20 o L30 para comparar períodos.'}</p>}</section>;
}
