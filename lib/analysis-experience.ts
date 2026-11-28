import {value,type Game,type Market} from './analytics';
import {gameKey,type AnalysisSelection} from './analysis-selection';
export function filterImpact(games:Game[],market:Market,filters:{venue:string;opponent:string;minutes:number;size:number},selection:AnalysisSelection,teammateIds?:string[]){
 let sample=games.filter(g=>g.played&&g.minutes>0).slice().sort((a,b)=>b.date.localeCompare(a.date));
 const rows:{label:string;removed:number;remaining:number}[]=[],apply=(label:string,filter:(g:Game,i:number)=>boolean)=>{const before=sample.length;sample=sample.filter(filter);rows.push({label,removed:before-sample.length,remaining:sample.length});};
 if(filters.venue!=='all')apply(filters.venue==='home'?'Local':'Visitante',g=>g.home===(filters.venue==='home'));
 if(filters.opponent!=='all')apply('Rival '+filters.opponent,g=>g.opponent===filters.opponent);
 if(filters.minutes>0)apply('Mínimo '+filters.minutes+' minutos',g=>g.minutes>=filters.minutes);
 if(selection.teammate){const ids=new Set(teammateIds);apply(selection.mode==='with'?'Con compañero':'Sin compañero',g=>ids.has(gameKey(g)));}
 if(selection.sample.length){const ids=new Set(selection.sample);apply('Muestra compartida',g=>ids.has(gameKey(g)));}
 if(filters.size)apply('Últimos '+filters.size,(_,i)=>i<filters.size);
 if(selection.excluded.length){const ids=new Set(selection.excluded);apply('Exclusiones manuales',g=>!ids.has(gameKey(g)));}
 apply('Cobertura de '+market,g=>value(g,market)!==null);
 return rows;
}
export function sampleStrength(games:Game[],market:Market){
 const played=games.filter(g=>g.played&&g.minutes>0),valid=played.filter(g=>value(g,market)!==null);
 const mean=valid.length?valid.reduce((s,g)=>s+g.minutes,0)/valid.length:null;
 const similar=mean===null?0:valid.filter(g=>Math.abs(g.minutes-mean)<=5).length;
 const coverage=played.length?valid.length/played.length:0,consistency=valid.length?similar/valid.length:0;
 return {n:valid.length,total:played.length,coverage,similar,mean,consistency,label:valid.length>=20&&coverage===1&&consistency>=.8?'Muestra amplia y uniforme':valid.length>=10&&coverage>=.9?'Muestra intermedia':'Muestra limitada'};
}
export type ReviewMetrics={minutes:number|null;attempts:number|null;efficiency:number|null;freeThrows:number|null;fouls:number|null};
export function reviewMetrics(games:Game[]):ReviewMetrics{
 const valid=games.filter(g=>g.played&&g.minutes>0);
 const avg=(key:'minutes'|'fieldGoalsAttempted'|'freeThrowsAttempted')=>{const rows=valid.filter(g=>g[key]!==undefined);return rows.length?rows.reduce((s,g)=>s+g[key]!,0)/rows.length:null;};
 const shots=valid.filter(g=>g.fieldGoalsMade!==undefined&&g.fieldGoalsAttempted!==undefined),attempts=shots.reduce((s,g)=>s+g.fieldGoalsAttempted!,0);
 return {minutes:avg('minutes'),attempts:avg('fieldGoalsAttempted'),freeThrows:avg('freeThrowsAttempted'),efficiency:attempts?shots.reduce((s,g)=>s+g.fieldGoalsMade!,0)/attempts:null,fouls:null};
}
export function referenceOutcome(result:number|null,state:string,line:number,side:'over'|'under'){
 return state!=='final'||result===null?'pending':result===line?'push':(side==='over'?result>line:result<line)?'hit':'miss';
}
export type VisitPoint={line:number;minutes:number|null;average:number|null;n:number;lastDate:string|null;availability?:string|null;teammates?:Record<string,string>};
export function visitChanges(current:VisitPoint,previous:VisitPoint){
 const rows:{label:string;before:string;after:string}[]=[],fmt=(n:number)=>n.toLocaleString('es-AR',{maximumFractionDigits:1});
 for(const [key,label] of [['line','Línea del análisis'],['minutes','Minutos por partido'],['average','Promedio de la muestra']] as const){const a=previous[key],b=current[key];if(a!==null&&b!==null&&Math.abs(a-b)>=.1)rows.push({label,before:fmt(a),after:fmt(b)});}
 if(current.lastDate&&previous.lastDate&&current.lastDate>previous.lastDate)rows.push({label:'Último partido disponible',before:previous.lastDate,after:current.lastDate});
 if(current.availability&&previous.availability&&current.availability!==previous.availability)rows.push({label:'Disponibilidad publicada',before:previous.availability,after:current.availability});
 if(current.teammates&&previous.teammates){for(const name of [...new Set([...Object.keys(previous.teammates),...Object.keys(current.teammates)])].sort()){const before=Object.hasOwn(previous.teammates,name)?previous.teammates[name]:'Sin estado individual publicado',after=Object.hasOwn(current.teammates,name)?current.teammates[name]:'Sin estado individual publicado';if(before!==after)rows.push({label:'Disponibilidad · '+name,before,after});}}
 return rows;
}
