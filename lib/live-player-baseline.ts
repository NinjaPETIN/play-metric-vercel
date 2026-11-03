import type {Game} from './analytics';
export function livePlayerBaseline(games:Game[],matchId:string,startsAt:string){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(startsAt));
 const sample=games.filter(g=>g.played&&g.minutes>0&&g.gameId!==matchId&&g.date<day).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
 const average=(key:'points'|'rebounds'|'assists'|'minutes')=>sample.length?sample.reduce((sum,g)=>sum+g[key],0)/sample.length:null;
 return {n:sample.length,points:average('points'),rebounds:average('rebounds'),assists:average('assists'),minutes:average('minutes'),recent:sample.slice().reverse().map(g=>({date:g.date,points:g.points}))};
}
