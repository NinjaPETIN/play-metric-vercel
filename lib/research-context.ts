import {value,type Game,type Market} from './analytics';
import {gameKey} from './analysis-selection';
export function regularity(values:readonly (number|null)[]){
 const valid=values.filter((v):v is number=>v!==null&&Number.isFinite(v));
 if(!valid.length)return null;
 const average=valid.reduce((sum,v)=>sum+v,0)/valid.length;
 const deviation=Math.sqrt(valid.reduce((sum,v)=>sum+(v-average)**2,0)/valid.length);
 return {n:valid.length,average,deviation};
}
export function comparableGames(games:Game[],minutes:number,venue:'all'|'home'|'away',tolerance:number){
 return games.filter(g=>g.played&&g.minutes>0&&Math.abs(g.minutes-minutes)<=tolerance&&(venue==='all'||g.home===(venue==='home'))).sort((a,b)=>Math.abs(a.minutes-minutes)-Math.abs(b.minutes-minutes)||b.date.localeCompare(a.date));
}
export type FrozenSample={season:number;competition:string;keys:string[];filters:string;history?:'all'|'season'};
export function freezeSample(input:unknown,games:Game[],market:Market,line:number,side:'over'|'under',before:string){
 if(!input||typeof input!=='object')throw Error('Muestra no válida.');
 const s=input as FrozenSample;
 if(!Number.isInteger(s.season)||s.season<1946||s.season>2100||!['regular','preseason','playoffs'].includes(s.competition)||(s.history!==undefined&&s.history!=='all'&&s.history!=='season')||!Array.isArray(s.keys)||!s.keys.length||s.keys.length>200||s.keys.some(k=>typeof k!=='string'||k.length>40)||new Set(s.keys).size!==s.keys.length||typeof s.filters!=='string'||s.filters.length>600)throw Error('Muestra no válida.');
 const lookup=new Map(games.filter(g=>g.played&&g.minutes>0&&g.date<=before).map(g=>[gameKey(g),g]));
 const results=s.keys.map(key=>{const game=lookup.get(key);if(!game)throw Error('La muestra cambió o no pertenece a esta temporada. Volvé a seleccionar el período.');return {key,date:game.date,opponent:game.opponent,minutes:game.minutes,result:value(game,market)};});
 const stats=regularity(results.map(g=>g.result));
 const hits=results.filter(g=>g.result!==null&&(side==='over'?g.result>line:g.result<line)).length;
 return {season:s.season,competition:s.competition,history:s.history??'season',filters:s.filters,results,n:stats?.n??0,average:stats?.average??null,hits};
}
