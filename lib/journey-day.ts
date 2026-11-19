import type {Calendar} from './nba-snapshot';
import type {Player} from './data';
import {argentinaDay} from './followed-agenda';

export function journeyDay(calendar:Calendar,players:Player[],ids:string[],teams:string[],now:number){
 const day=argentinaDay(new Date(now).toISOString()),wanted=new Set(ids.map(id=>id.replace(/^nba:/,'').split(':')[0]));
 const followed=players.filter(p=>wanted.has(p.id)),tracked=new Set([...teams,...followed.flatMap(p=>{const team=p.currentTeam===undefined?p.team:p.currentTeam;return team?[team]:[];})]);
 const games=calendar.games.filter(g=>(g.startsAt?argentinaDay(g.startsAt):g.date)===day||g.status===2&&!!g.startsAt&&Date.parse(g.startsAt)>now-12*3600_000&&Date.parse(g.startsAt)<=now+5*60_000)
  .sort((a,b)=>Number(b.status===2)-Number(a.status===2)||Number(a.status===3)-Number(b.status===3)||(a.startsAt??a.date).localeCompare(b.startsAt??b.date)||a.id.localeCompare(b.id))
  .map(game=>({game,following:tracked.has(game.home)||tracked.has(game.away),players:followed.filter(p=>{const team=p.currentTeam===undefined?p.team:p.currentTeam;return team===game.home||team===game.away;})}));
 return {day,games};
}
export function minutesChange(player:Player){
 const games=player.games.filter(g=>g.played&&g.minutes>0).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
 if(games.length<10)return null;
 const average=(from:number)=>games.slice(from,from+5).reduce((sum,g)=>sum+g.minutes,0)/5;
 const current=average(0),previous=average(5),change=current-previous;
 return Math.abs(change)>=3?{current,previous,change}:null;
}
