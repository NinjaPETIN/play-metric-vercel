import {analyze,value,type Game,type Market} from './analytics';
export function statContext(sample:Game[],history:Game[],market:Market,line:number,side:'over'|'under'='over'){
 const usable=(games:Game[])=>games.filter(g=>g.played&&g.minutes>0&&value(g,market)!==null);
 const recent=usable(sample),all=usable(history),a=analyze(recent,market,line,side),baseline=analyze(all,market,line,side);
 const fmt=(n:number)=>n.toLocaleString('es-AR',{maximumFractionDigits:1});
 const direction=side==='over'?'superó':'quedó por debajo de';
 const highlight=a.n?`${direction[0].toUpperCase()+direction.slice(1)} ${fmt(line)} en ${a.hits} de ${a.n} partidos de la muestra${a.pushes?` (${a.pushes} empates)`:''}.`:'No hay registros suficientes para esta estadística con los filtros elegidos.';
 const previous=all.filter(g=>!recent.some(r=>r===g||(r.date===g.date&&r.opponent===g.opponent&&r.gameId===g.gameId)));
 const avgMinutes=(games:Game[])=>games.reduce((s,g)=>s+g.minutes,0)/games.length;
 let context='No hay suficientes partidos fuera de la muestra para comparar los minutos.';
 if(recent.length&&previous.length>=5){const now=avgMinutes(recent),before=avgMinutes(previous),delta=now-before;context=`Minutos promedio: ${fmt(now)} en esta muestra y ${fmt(before)} en los otros ${previous.length} partidos disponibles. ${Math.abs(delta)>=3?'El cambio de minutos puede influir en el volumen estadístico; no demuestra una causa.':'La diferencia de minutos es menor a 3 por partido.'}`;}
 const warnings:string[]=[];
 if(a.n<10)warnings.push(`Muestra pequeña: ${a.n} partidos. Un solo resultado puede cambiar mucho la frecuencia.`);
 if(a.n&&baseline.n>a.n&&Math.abs((a.rate??0)-(baseline.rate??0))>=.15)warnings.push('La frecuencia reciente difiere al menos 15 puntos porcentuales del historial disponible.');
 const missing=sample.filter(g=>g.played&&g.minutes>0&&value(g,market)===null).length;
 if(missing)warnings.push(`${missing} partidos sin esta estadística quedaron fuera del cálculo.`);
 if(new Set(recent.map(g=>g.team).filter(Boolean)).size>1)warnings.push('La muestra incluye partidos en distintos equipos. El rol puede haber cambiado.');
 if(a.n>=5&&a.average!==null&&a.median!==null&&Math.abs(a.average-a.median)>Math.max(2,Math.abs(a.median)*.25))warnings.push('El promedio se aleja de la mediana: algunos resultados extremos pueden influir.');
 const comparison=baseline.n?`Historial disponible: ${baseline.hits}/${baseline.n} (${Math.round((baseline.rate??0)*100)} %) con la misma línea y dirección, sin filtros de rival, localía ni minutos. Incluye la muestra.`:'Sin historial disponible para comparar.';
 return {highlight,context,warnings,comparison,n:a.n};
}
