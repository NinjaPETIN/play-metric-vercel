import assert from 'node:assert/strict';
import test from 'node:test';
import {lineSensitivity,trendDrivers} from '../lib/trend-insights';
import type {Game} from '../lib/analytics';
const games=Array.from({length:10},(_,i)=>({gameId:String(i),date:'2026-11-'+String(i+1).padStart(2,'0'),played:true,minutes:30,points:i,fieldGoalsAttempted:i+1,fieldGoalsMade:1}) as Game);
test('line sensitivity preserves exact reference, strict direction, ties and sample',()=>{const over=lineSensitivity(games,'points',4,'over').find(r=>r.line===4)!;assert.equal(over.hits,5);assert.equal(over.pushes,1);assert.equal(over.n,10);const under=lineSensitivity(games,'points',4,'under').find(r=>r.line===4)!;assert.equal(under.hits,4);assert.equal(lineSensitivity(games,'steals',1,'over')[0].rate,null);assert.equal(lineSensitivity([{...games[0],steals:0}],'steals',.5,'under').find(r=>r.line===.5)!.hits,1);});
test('drivers use disjoint complete recent windows and weighted shooting without mutating inputs',()=>{const d=trendDrivers(games)!;assert.equal(d.rows[0].recent,7);assert.equal(d.rows[0].prior,2);assert.equal(d.rows.at(-1)!.recent,12.5);assert.ok(Math.abs(d.rows.at(-1)!.prior!-100/3)<1e-10);assert.equal(games[0].gameId,'0');assert.equal(d.rows.find(r=>r.label==='Triples intentados')!.recent,null);assert.equal(trendDrivers(games.slice(1)),null);});
test('optimized line counts match a direct count across ties, missing stats and both directions',()=>{
 const sample=Array.from({length:250},(_,i)=>({...games[i%10],points:i%37,steals:i%3===0?undefined:i%5,played:i%11!==0,minutes:i%13===0?0:30}));
 for(const market of ['points','steals'] as const)for(const side of ['over','under'] as const)for(const line of [0,.5,4,19.5,40]){
  const values=sample.filter(g=>g.played&&g.minutes>0&&g[market]!==undefined).map(g=>g[market]!);
  for(const row of lineSensitivity(sample,market,line,side)){
   assert.equal(row.n,values.length);assert.equal(row.pushes,values.filter(v=>v===row.line).length);
   assert.equal(row.hits,values.filter(v=>side==='over'?v>row.line:v<row.line).length);
  }
 }
});
