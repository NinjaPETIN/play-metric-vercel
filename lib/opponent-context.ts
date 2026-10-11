import type {Player} from './data';
import type {TeamGame} from './nba-snapshot';
import {teamBoxScore} from './team-box-score';
export function opponentContext(players:Player[],games:TeamGame[],team:string,limit:number){
 const recent=games.filter(g=>g.home===team||g.away===team).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,limit);
 const totals={points:0,rebounds:0,assists:0,threes:0};let covered=0;
 for(const game of recent){totals.points+=game.home===team?game.awayScore:game.homeScore;const opponent=game.home===team?game.away:game.home,box=teamBoxScore(players,game,opponent);if(!box.complete)continue;covered++;for(const row of box.rows){totals.rebounds+=row.g.rebounds;totals.assists+=row.g.assists;totals.threes+=row.g.threes;}}
 return {n:recent.length,covered,points:recent.length?totals.points/recent.length:null,rebounds:covered?totals.rebounds/covered:null,assists:covered?totals.assists/covered:null,threes:covered?totals.threes/covered:null};
}
