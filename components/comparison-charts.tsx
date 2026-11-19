'use client';
import {useReadingPreferences} from './reading-preferences';
import InteractiveHistoryChart from './interactive-history-chart';
import {comparisonChartMaximum} from '../lib/comparison-chart';
import {markets,value,analyze,type Game,type Market} from '../lib/analytics';
import type {Player} from '../lib/data';
export default function ComparisonCharts({players,samples,market,line,side}:{players:(Player|undefined)[];samples:Game[][];market:Market;line:number;side:'over'|'under'}){
 const {reduced}=useReadingPreferences();
 const selected=players.flatMap((p,i)=>p?[{p,games:samples[i]}]:[]),maximum=comparisonChartMaximum(selected.map(r=>r.games.slice(0,30)),market,line);
 if(!selected.length)return <p className="comparison-chart-intro">Elegí dos o tres jugadores para comparar sus gráficos con la misma escala y línea.</p>;
 return <section className="comparison-visuals" aria-label="Gráficos con escala y línea comunes"><p className="muted">{markets[market]}{!reduced&&<> · {side==='over'?'Más de':'Menos de'} {line.toLocaleString('es-AR')}</>} · Escala común: 0–{maximum.toLocaleString('es-AR',{maximumFractionDigits:1})}. Cada barra es un partido; las fechas pueden diferir entre jugadores.</p><div className="comparison-chart-grid">{selected.map(({p,games})=><article key={p.id}><header><strong>{p.name}</strong><span>{analyze(games,market,line,side).n} partidos con datos</span></header>{games.length>30&&<p className="muted">Gráfico: últimos 30 encuentros. La tabla incluye los {games.length} partidos.</p>}{games.some(g=>g.played&&g.minutes>0&&value(g,market)!==null)?<InteractiveHistoryChart games={games.slice(0,30)} market={market} line={line} side={side} sharedMax={maximum} referenceKind="custom"/>:<p className="comparison-chart-empty">No hay registros de {markets[market].toLowerCase()} con estos filtros. Ampliá el período o elegí otra estadística.</p>}</article>)}</div></section>;
}
