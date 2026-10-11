import type {Player} from './data';
import type {TeamGame} from './nba-snapshot';
export function teamBoxScore(players:Player[],game:TeamGame,team:string){
 const rows=players.flatMap(p=>p.games.filter(g=>g.gameId===game.id&&g.team===team&&g.played&&g.minutes>0).map(g=>({id:p.id,name:p.name,g}))).sort((a,b)=>b.g.points-a.g.points||b.g.minutes-a.g.minutes||a.name.localeCompare(b.name));
 const score=team===game.home?game.homeScore:game.awayScore;
 return {rows,complete:rows.length>0&&rows.reduce((sum,r)=>sum+r.g.points,0)===score};
}
