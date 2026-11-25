import {analyze,value,type Game,type Market} from './analytics';
import {gameKey} from './analysis-selection';
export type Scenario={venue:'all'|'home'|'away';minutes:number;teammate:string};
export function scenarioGames(pool:Game[],scenario:Scenario,limit:number,excluded:string[],teammateIds?:string[]){
 const allowed=new Set(teammateIds),omitted=new Set(excluded);
 const filtered=pool.filter(g=>g.played&&g.minutes>0&&(scenario.venue==='all'||g.home===(scenario.venue==='home'))&&g.minutes>=scenario.minutes&&(!scenario.teammate||allowed.has(gameKey(g)))).sort((a,b)=>b.date.localeCompare(a.date));
 return (limit?filtered.slice(0,limit):filtered).filter(g=>!omitted.has(gameKey(g)));
}
export function resultDistribution(games:Game[],market:Market,line:number,side:'over'|'under',maximum?:number){
 const values=games.filter(g=>g.played&&g.minutes>0).map(g=>value(g,market)).filter((v):v is number=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);
 const quantile=(p:number)=>{if(!values.length)return null;const index=(values.length-1)*p,low=Math.floor(index);return values[low]+(values[Math.ceil(index)]-values[low])*(index-low);};
 const max=Math.max(0,maximum??0,...values),width=Math.max(1,Math.ceil((max+1)/8));
 const bins=values.length||maximum!==undefined?Array.from({length:Math.max(1,Math.ceil((max+1)/width))},(_,i)=>({from:i*width,to:(i+1)*width,count:values.filter(v=>v>=i*width&&v<(i+1)*width).length})):[];
 return {...analyze(games,market,line,side),minimum:values[0]??null,maximum:values.at(-1)??null,q1:quantile(.25),q3:quantile(.75),bins};
}
