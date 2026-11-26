import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleStrength,reviewMetrics,filterImpact,referenceOutcome,visitChanges} from '../lib/analysis-experience';
import type {Game} from '../lib/analytics';
const game=(n:number):Game=>({gameId:String(n),date:'2026-11-'+String(n).padStart(2,'0'),played:true,minutes:30,points:n,rebounds:0,assists:0,threes:0,opponent:n%2?'BOS':'NYK',home:n%2===0});
test('sample strength measures coverage and minute similarity independently from outcomes',()=>{
 const games=Array.from({length:20},(_,i)=>({...game(i+1),steals:i%2}));
 assert.equal(sampleStrength(games,'points').label,'Muestra amplia y uniforme');
 assert.equal(sampleStrength(games.slice(0,10),'points').label,'Muestra intermedia');
 assert.equal(sampleStrength(games.slice(0,5),'points').label,'Muestra limitada');
 const missing=sampleStrength([{...game(1),steals:0},game(2)],'steals');assert.equal(missing.n,1);assert.equal(missing.coverage,.5);
 assert.equal(sampleStrength(games.map((g,i)=>({...g,minutes:i%2?10:50})),'points').similar,0);
});
test('filter impact applies the same sequence, retains missing statistics until coverage and never refills exclusions',()=>{
 const games=[1,2,3,4,5,6].map(game),selection={teammate:'',mode:'with' as const,sample:[],excluded:['6']};
 const impact=filterImpact(games,'points',{venue:'home',opponent:'all',minutes:0,size:2},selection);
 assert.deepEqual(impact.map(r=>[r.removed,r.remaining]),[[3,3],[1,2],[1,1],[0,1]]);
 assert.equal(games[0].gameId,'1');
 assert.equal(filterImpact(games,'steals',{venue:'all',opponent:'all',minutes:0,size:0},{...selection,excluded:[]}).at(-1)?.remaining,0);
});
test('postgame metrics preserve zero attempts, weight efficacy and keep absent fields unknown',()=>{
 const metrics=reviewMetrics([{...game(1),fieldGoalsAttempted:2,fieldGoalsMade:1,freeThrowsAttempted:0},{...game(2),fieldGoalsAttempted:10,fieldGoalsMade:9}]);
 assert.equal(metrics.efficiency,10/12);assert.equal(metrics.attempts,6);assert.equal(metrics.freeThrows,0);assert.equal(metrics.fouls,null);
 assert.equal(reviewMetrics([{...game(1),played:false}]).minutes,null);
 assert.equal(referenceOutcome(null,'final',1,'over'),'pending');assert.equal(referenceOutcome(0,'final',1,'over'),'miss');assert.equal(referenceOutcome(1,'final',1,'under'),'push');
});
test('visit changes compare published availability, actual reference and newly available dates without turning unknowns into zero',()=>{
 const p={line:20.5,minutes:30,average:20,n:10,lastDate:'2026-11-20',availability:'En duda'};
 const changes=visitChanges({...p,line:22.5,minutes:28,average:null,lastDate:'2026-11-21',availability:'Fuera'},p);
 assert.deepEqual(changes.map(r=>r.label),['Línea del análisis','Minutos por partido','Último partido disponible','Disponibilidad publicada']);
 assert.equal(visitChanges(p,p).length,0);
});
