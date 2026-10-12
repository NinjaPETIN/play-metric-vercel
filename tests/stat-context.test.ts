import test from 'node:test';
import assert from 'node:assert/strict';
import {statContext} from '../lib/stat-context';
import type {Game} from '../lib/analytics';
const game=(i:number,points:number,minutes=30):Game=>({date:`2026-01-${String(i+1).padStart(2,'0')}`,opponent:'BOS',home:true,minutes,points,rebounds:3,assists:2,threes:1,played:true});
test('context distinguishes pushes, filtered sample and historical baseline',()=>{
 const history=[game(0,20),game(1,21),game(2,5),...Array.from({length:7},(_,i)=>game(i+3,4,20))];
 const c=statContext(history.slice(0,3),history,'points',20);
 assert.match(c.highlight,/1 de 3.*1 empates/);assert.match(c.comparison,/1\/10/);assert.match(c.context,/30.*20/);assert.ok(c.warnings.some(w=>w.includes('pequeña')));
 assert.match(statContext(history.slice(0,3),history,'points',20,'under').highlight,/1 de 3/);
});
test('missing stats and unplayed games never become zero-value hits',()=>{
 const games=[game(0,20),{...game(1,20),played:false}, {...game(2,20),minutes:0}];
 const c=statContext(games,games,'steals',.5,'under');assert.equal(c.n,0);assert.match(c.highlight,/No hay registros/);assert.ok(c.warnings.some(w=>w.includes('1 partidos sin')));
});
