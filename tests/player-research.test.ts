import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonSample,alternativeThresholds,productionPer36,playerTimeline,offensiveParticipation} from '../lib/player-research';
import type {Game} from '../lib/analytics';
import type {Player} from '../lib/data';
const game=(n:number,points=n):Game=>({gameId:'0022600001',date:'2026-11-'+String(n).padStart(2,'0'),team:'BOS',home:true,opponent:'NYK',minutes:30,played:true,points,rebounds:0,assists:2,threes:0,fieldGoalsAttempted:10});
test('all-history comparisons retain every valid game and bounded windows apply after common conditions',()=>{
 const games=[game(1),game(2),{...game(3),played:false},{...game(4),home:false}];
 const filters={venue:'all',opponent:'all',minMinutes:0,windowSize:0};
 assert.equal(comparisonSample(games,filters).length,3);
 assert.deepEqual(comparisonSample(games,{...filters,venue:'home',windowSize:1}).map(g=>g.date),['2026-11-02']);
 assert.equal(games[0].date,'2026-11-01');
});
test('alternative thresholds count equality as N+, preserve zero and exclude missing and DNP results',()=>{
 const games=[game(1,0),game(2,15),game(3,20),game(4,25),{...game(5,99),played:false}];
 assert.deepEqual(alternativeThresholds(games,'points',[15,20,25]).map(r=>[r.n,r.hits]),[[4,3],[4,2],[4,1]]);
 assert.equal(alternativeThresholds(games,'steals',[0])[0].n,0);
});
test('per36 weights actual minutes instead of averaging single-game rates',()=>{
 const rates=productionPer36([{...game(1,10),minutes:10},{...game(2,20),minutes:40}],'points');assert.ok(Math.abs(rates.value!-21.6)<1e-10);assert.equal(rates.minutes,50);assert.equal(productionPer36([],'points').value,null);
});
test('timeline records observed team changes and only compares minutes after five prior appearances',()=>{
 const games=[1,2,3,4,5,6].map(n=>({...game(n),gameId:String(n),team:n===6?'MIA':'BOS',minutes:n===6?40:30}));
 const rows=playerTimeline(games);assert.equal(rows[0].teamChange,true);assert.equal(rows[0].previousTeam,'BOS');assert.equal(rows[0].minutesChange,10);assert.equal(rows[1].minutesChange,null);assert.equal(games[0].date,'2026-11-01');
});
test('team shares require score and minute reconciliation, keep missing attempts unknown and respect historical team',()=>{
 const players=Array.from({length:8},(_,i)=>({id:String(i),games:[{...game(1,10),assists:2}]})) as Player[];
 const final={id:'0022600001',date:'2026-11-01',home:'BOS',away:'NYK',homeScore:80,awayScore:70};
 const row=offensiveParticipation(players,[final],'0')[0];assert.equal(row.shotShare,.125);assert.equal(row.assistShare,.125);
 assert.equal(offensiveParticipation(players,[{...final,home:'MIA'}],'0')[0].reconciled,false);
 assert.equal(offensiveParticipation(players.slice(1),[final],'1')[0].reconciled,false);
 players[1].games[0].fieldGoalsAttempted=undefined;assert.equal(offensiveParticipation(players,[final],'0')[0].shotShare,null);
 assert.equal(offensiveParticipation(players,[{...final,homeScore:81}],'0')[0].assistShare,null);
});
