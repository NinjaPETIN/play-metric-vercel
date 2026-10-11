export type Game={gameId?:string;team?:string;date:string;opponent:string;home:boolean;minutes:number;points:number;rebounds:number;assists:number;threes:number;played:boolean;steals?:number;blocks?:number;turnovers?:number;fieldGoalsAttempted?:number;fieldGoalsMade?:number;freeThrowsAttempted?:number;freeThrowsMade?:number;offensiveRebounds?:number;defensiveRebounds?:number;threeAttempts?:number};
export const markets={points:'Puntos',rebounds:'Rebotes',assists:'Asistencias',threes:'Triples',pa:'Pts + Ast',pr:'Pts + Reb',ra:'Reb + Ast',pra:'Pts + Reb + Ast',steals:'Robos',blocks:'Bloqueos',sb:'Robos + Bloqueos',turnovers:'Pérdidas',fieldGoalsAttempted:'Tiros intentados',fieldGoalsMade:'Tiros convertidos',threeAttempts:'Triples intentados',freeThrowsAttempted:'Libres intentados',freeThrowsMade:'Libres convertidos',offensiveRebounds:'Rebotes ofensivos',defensiveRebounds:'Rebotes defensivos'};
export type Market=keyof typeof markets;
export function value(g:Game,m:Market):number|null{if(m==='pa')return g.points+g.assists;if(m==='pr')return g.points+g.rebounds;if(m==='ra')return g.rebounds+g.assists;if(m==='pra')return g.points+g.rebounds+g.assists;if(m==='sb')return g.steals===undefined||g.blocks===undefined?null:g.steals+g.blocks;return g[m]??null;}
export function analyze(games:Game[],market:Market,line:number,side:'over'|'under'='over'){
 const values=games.filter(g=>g.played&&g.minutes>0).map(g=>value(g,market)).filter((v):v is number=>v!==null);
 const sorted=[...values].sort((a,b)=>a-b),n=values.length;
 const pushes=values.filter(v=>v===line).length,hits=values.filter(v=>side==='over'?v>line:v<line).length;
 return {n,hits,pushes,misses:n-hits-pushes,rate:n?hits/n:null,average:n?values.reduce((a,b)=>a+b,0)/n:null,median:n?(sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2:null};
}
