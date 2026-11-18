import type {Player} from './data';
import type {Calendar} from './nba-snapshot';
import {scoreboardPriority} from './scoreboard-order';
export const argentinaDay=(date:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
export function followedAgenda(players:Player[],ids:string[],calendar:Calendar|null,now:number){
 const wanted=new Set(ids.map(id=>id.replace(/^nba:/,'').split(':')[0]));
 const today=argentinaDay(new Date(now).toISOString());
 return players.filter(p=>wanted.has(p.id)).map(player=>{
  const team=player.currentTeam===undefined?player.team:player.currentTeam;
  const candidates=team?(calendar?.games??[]).filter(g=>(g.home===team||g.away===team)&&g.startsAt&&
   (g.status===2&&Date.parse(g.startsAt)>now-12*3600000||argentinaDay(g.startsAt)===today||g.status!==3&&Date.parse(g.startsAt)>now&&Date.parse(g.startsAt)<now+7*86400000)):[];
  const game=candidates.sort((a,b)=>Number(b.status===2)-Number(a.status===2)||Number(argentinaDay(b.startsAt!)===today)-Number(argentinaDay(a.startsAt!)===today)||scoreboardPriority(a.status)-scoreboardPriority(b.status)||a.startsAt!.localeCompare(b.startsAt!))[0];
  return {player,game,today:!!game&&(game.status===2||argentinaDay(game.startsAt!)===today)};
 }).sort((a,b)=>Number(b.today)-Number(a.today)||Number(!!b.game)-Number(!!a.game)||(a.game&&b.game?scoreboardPriority(a.game.status)-scoreboardPriority(b.game.status)||a.game.startsAt!.localeCompare(b.game.startsAt!):0)||a.player.name.localeCompare(b.player.name));
}
