import type {Player} from './data';
import type {Game,Market} from './analytics';
import {value} from './analytics';
import type {CatalogOptions} from './catalog-summary';
import {catalogHistory} from './catalog-summary';
import type {TeamGame} from './nba-snapshot';
export function catalogDetailSample(player:Player,options:CatalogOptions,shown:readonly (number|null)[]){
 const sample=catalogHistory(player,options).slice(0,options.last||undefined).slice(0,30).reverse();
 const market=options.market==='all'?'points':options.market;
 return sample.length===shown.length&&sample.every((g,i)=>value(g,market as Market)===shown[i])?sample:null;
}
export function catalogGameResult(game:Game,results:TeamGame[]){
 const candidates=results.filter(r=>game.gameId?r.id===game.gameId:r.date===game.date&&(game.home?r.away===game.opponent:r.home===game.opponent)&&(!game.team||(game.home?r.home:r.away)===game.team));
 if(candidates.length!==1)return null;
 const r=candidates[0];
 if(r.date!==game.date||(game.home?r.away:r.home)!==game.opponent||(game.team&&(game.home?r.home:r.away)!==game.team))return null;
 return `${r.away} ${r.awayScore} - ${r.homeScore} ${r.home}`;
}
