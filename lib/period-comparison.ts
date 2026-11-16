import type { Game } from './analytics';

const average = (games:Game[], read:(game:Game)=>number|undefined) => {
 const values=games.flatMap(game=>{const n=read(game);return n===undefined?[]:[n];});
 return {value:values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null,n:values.length};
};

function fieldRate(games:Game[]) {
 const known=games.filter(game=>game.fieldGoalsMade!==undefined&&game.fieldGoalsAttempted!==undefined&&game.fieldGoalsMade<=game.fieldGoalsAttempted);
 const attempts=known.reduce((sum,game)=>sum+game.fieldGoalsAttempted!,0);
 return {value:attempts?100*known.reduce((sum,game)=>sum+game.fieldGoalsMade!,0)/attempts:null,n:known.length};
}

export function comparePeriods(games:Game[]) {
 const sample=[...games].filter(game=>game.played&&game.minutes>0).sort((a,b)=>b.date.localeCompare(a.date)||(b.gameId??'').localeCompare(a.gameId??''));
 const recent=sample.slice(0,10);
 const prior=sample.slice(10,20);
 if(!prior.length)return null;
 const metrics=[
  {key:'points',label:'Puntos',measure:(rows:Game[])=>average(rows,g=>g.points)},
  {key:'minutes',label:'Minutos',measure:(rows:Game[])=>average(rows,g=>g.minutes)},
  {key:'attempts',label:'Tiros intentados',measure:(rows:Game[])=>average(rows,g=>g.fieldGoalsAttempted)},
  {key:'accuracy',label:'Tiros de campo',measure:fieldRate},
  {key:'assists',label:'Asistencias',measure:(rows:Game[])=>average(rows,g=>g.assists)},
 ];
 return {recent,prior,rows:metrics.map(({key,label,measure})=>({key,label,recent:measure(recent),prior:measure(prior)}))};
}

export function minutesTrend(games:Game[]) {
 const [a,b]=[games.slice(0,5),games.slice(5,10)];
 if(a.length<3||b.length<3)return null;
 const recent=average(a,g=>g.minutes).value!,prior=average(b,g=>g.minutes).value!;
 return {recent,prior,recentGames:a.length,priorGames:b.length,delta:recent-prior};
}
