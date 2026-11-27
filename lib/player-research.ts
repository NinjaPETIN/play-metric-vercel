import {value,type Game,type Market} from './analytics';
import type {Player} from './data';
import type {TeamGame} from './nba-snapshot';
export function comparisonSample(games:Game[],filters:{venue:string;opponent:string;minMinutes:number;windowSize:number}){
 return games.filter(g=>g.played&&g.minutes>0&&(filters.venue==='all'||g.home===(filters.venue==='home'))&&(filters.opponent==='all'||g.opponent===filters.opponent)&&g.minutes>=filters.minMinutes).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,filters.windowSize||undefined);
}
export function alternativeThresholds(games:Game[],market:Market,thresholds:number[]){
 const values=games.filter(g=>g.played&&g.minutes>0).flatMap(g=>{const v=value(g,market);return v===null?[]:[v];}).sort((a,b)=>a-b);
 return thresholds.map(threshold=>{let low=0,high=values.length;while(low<high){const mid=(low+high)>>>1;if(values[mid]<threshold)low=mid+1;else high=mid;}return {threshold,n:values.length,hits:values.length-low};});
}
export function productionPer36(games:Game[],market:Market){
 let total=0,minutes=0,n=0;
 for(const game of games){const v=value(game,market);if(!game.played||game.minutes<=0||v===null)continue;total+=v;minutes+=game.minutes;n++;}
 return {n,minutes,value:minutes?total/minutes*36:null};
}
export function playerTimeline(games:Game[]){
 const sorted=games.filter(g=>g.played&&g.minutes>0).slice().sort((a,b)=>a.date.localeCompare(b.date));
 return sorted.map((game,i)=>{const prior=sorted.slice(Math.max(0,i-5),i),mean=prior.length?prior.reduce((s,g)=>s+g.minutes,0)/prior.length:null;
 return {game,teamChange:Boolean(game.team&&sorted[i-1]?.team&&game.team!==sorted[i-1].team),previousTeam:sorted[i-1]?.team??null,minutesChange:prior.length===5&&mean!==null&&Math.abs(game.minutes-mean)>=5?game.minutes-mean:null};}).reverse();
}
export function offensiveParticipation(players:Player[],teamGames:TeamGame[],playerId:string){
 const subject=players.find(p=>p.id===playerId);if(!subject)return [];
 const wanted=new Set(subject.games.map(g=>g.gameId)),byGame=new Map<string,{playerId:string;game:Game}[]>();
 for(const p of players)for(const game of p.games){if(!game.gameId||!wanted.has(game.gameId)||!game.played||game.minutes<=0)continue;const rows=byGame.get(game.gameId)??[];rows.push({playerId:p.id,game});byGame.set(game.gameId,rows);}
 return subject.games.filter(g=>g.played&&g.minutes>0).map(game=>{
  const final=teamGames.find(g=>g.id===game.gameId),team=game.team??(final?(game.home?final.home:final.away):null);
  const rows=(byGame.get(game.gameId??'')??[]).filter(r=>r.game.team===team||!r.game.team&&r.game.opponent===game.opponent&&r.game.home===game.home);
  const score=final?(game.home?final.homeScore:final.awayScore):null,totalMinutes=rows.reduce((s,r)=>s+r.game.minutes,0),expected=240+25*Math.max(0,Math.round((totalMinutes-240)/25));
  const reconciled=Boolean(final&&team===(game.home?final.home:final.away)&&game.opponent===(game.home?final.away:final.home)&&game.date===final.date&&rows.length>=5&&new Set(rows.map(r=>r.playerId)).size===rows.length&&rows.reduce((s,r)=>s+r.game.points,0)===score&&Math.abs(totalMinutes-expected)<=5);
  const attempts=reconciled&&rows.every(r=>r.game.fieldGoalsAttempted!==undefined)?rows.reduce((s,r)=>s+r.game.fieldGoalsAttempted!,0):null;
  const assists=reconciled?rows.reduce((s,r)=>s+r.game.assists,0):null;
  return {key:game.gameId??game.date,date:game.date,opponent:game.opponent,minutes:game.minutes,team,attempts:game.fieldGoalsAttempted??null,assists:game.assists,teamAttempts:attempts,teamAssists:assists,shotShare:attempts&&game.fieldGoalsAttempted!==undefined?game.fieldGoalsAttempted/attempts:null,assistShare:assists?game.assists/assists:null,reconciled};
 });
}
