import {summarizeGames,type Game,type Market} from './analytics';
import {gameKey} from './analysis-selection';
export type Scenario={venue:'all'|'home'|'away';minutes:number;teammate:string};
export function scenarioGames(pool:Game[],scenario:Scenario,limit:number,excluded:string[],teammateIds?:string[]){
 const allowed=new Set(teammateIds),omitted=new Set(excluded);
 const filtered=pool.filter(g=>g.played&&g.minutes>0&&(scenario.venue==='all'||g.home===(scenario.venue==='home'))&&g.minutes>=scenario.minutes&&(!scenario.teammate||allowed.has(gameKey(g)))).sort((a,b)=>b.date.localeCompare(a.date));
 return (limit?filtered.slice(0,limit):filtered).filter(g=>!omitted.has(gameKey(g)));
}
type DistributionSample={values:number[];summary:ReturnType<typeof summarizeGames>};
function distributionSample(games:Game[],market:Market,line:number,side:'over'|'under'):DistributionSample{
 const values:number[]=[];
 const summary=summarizeGames(games,market,line,side,values);
 values.sort((a,b)=>a-b);
 return {values,summary};
}
function describeDistribution({values,summary}:DistributionSample,maximum?:number){
 const quantile=(p:number)=>{if(!values.length)return null;const index=(values.length-1)*p,low=Math.floor(index);return values[low]+(values[Math.ceil(index)]-values[low])*(index-low);};
 const max=Math.max(0,maximum??0,values.at(-1)??0),width=Math.max(1,Math.ceil((max+1)/8));
 const bins=values.length||maximum!==undefined?Array.from({length:Math.max(1,Math.ceil((max+1)/width))},(_,i)=>({from:i*width,to:(i+1)*width,count:0})):[];
 for(const v of values){const bin=bins[Math.floor(v/width)];if(bin)bin.count++;}
 return {...summary,median:quantile(.5),minimum:values[0]??null,maximum:values.at(-1)??null,q1:quantile(.25),q3:quantile(.75),bins};
}
export function resultDistribution(games:Game[],market:Market,line:number,side:'over'|'under',maximum?:number){
 return describeDistribution(distributionSample(games,market,line,side),maximum);
}
export function compareDistributions(base:Game[],scenario:Game[],market:Market,line:number,side:'over'|'under'){
 const samples=[distributionSample(base,market,line,side),distributionSample(scenario,market,line,side)];
 const maximum=Math.max(0,...samples.map(sample=>sample.values.at(-1)??0));
 return samples.map(sample=>describeDistribution(sample,maximum));
}
