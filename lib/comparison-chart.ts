import {value,type Game,type Market} from './analytics';
export function comparisonChartMaximum(samples:Game[][],market:Market,line:number){return Math.max(1,line,...samples.flatMap(games=>games.filter(g=>g.played&&g.minutes>0).flatMap(g=>{const n=value(g,market);return n===null?[]:[n];})))*1.15;}
