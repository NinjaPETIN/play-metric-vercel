import {value,type Game,type Market} from './analytics';
export function lineSensitivity(games:Game[],market:Market,line:number,side:'over'|'under'){
 const values=games.filter(g=>g.played&&g.minutes>0).map(g=>value(g,market)).filter((v):v is number=>v!==null&&Number.isFinite(v));
 values.sort((a,b)=>a-b);
 const bound=(reference:number,inclusive:boolean)=>{let low=0,high=values.length;while(low<high){const mid=(low+high)>>>1;if(values[mid]<reference||(inclusive&&values[mid]===reference))low=mid+1;else high=mid;}return low;};
 const step=Math.max(1,Math.round(Math.max(line,...values,0)/12));
 const lines=[...new Set([0,line,...Array.from({length:9},(_,i)=>Math.max(0,line+(i-4)*step))])].sort((a,b)=>a-b);
 return lines.map(reference=>{const below=bound(reference,false),through=bound(reference,true),hits=side==='over'?values.length-through:below,pushes=through-below;return {line:reference,n:values.length,hits,pushes,rate:values.length?hits/values.length:null};});
}
export function trendDrivers(games:Game[]){
 const sorted=games.filter(g=>g.played&&g.minutes>0).slice().sort((a,b)=>b.date.localeCompare(a.date));
 if(sorted.length<10)return null;
 const recent=sorted.slice(0,5),prior=sorted.slice(5,10);
 const average=(sample:Game[],key:Market|'minutes')=>{const vals=sample.map(g=>key==='minutes'?g.minutes:value(g,key));return vals.every(v=>v!==null&&Number.isFinite(v))?vals.reduce<number>((sum,v)=>sum+v!,0)/sample.length:null;};
 const accuracy=(sample:Game[])=>{if(sample.some(g=>g.fieldGoalsAttempted===undefined||g.fieldGoalsMade===undefined))return null;const attempts=sample.reduce((n,g)=>n+g.fieldGoalsAttempted!,0);return attempts?sample.reduce((n,g)=>n+g.fieldGoalsMade!,0)/attempts*100:null;};
 const specs=[['points','Puntos por partido',''],['minutes','Minutos por partido',' min'],['fieldGoalsAttempted','Tiros de campo intentados',''],['threeAttempts','Triples intentados',''],['freeThrowsAttempted','Libres intentados','']] as const;
 return {recent,prior,rows:[...specs.map(([key,label,unit])=>({label,unit,recent:average(recent,key),prior:average(prior,key)})),{label:'Eficacia de campo',unit:'%',recent:accuracy(recent),prior:accuracy(prior)}]};
}
