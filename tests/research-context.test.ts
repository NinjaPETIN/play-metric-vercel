import test from 'node:test';
import assert from 'node:assert/strict';
import {regularity,comparableGames,freezeSample} from '../lib/research-context';
import {liveScoringContext} from '../lib/live-scoring-context';
import {livePlayerBaseline} from '../lib/live-player-baseline';
import type {Game} from '../lib/analytics';
import type {BoxData} from '../lib/live-boxscore';
const game=(id:string,points:number,minutes=30):Game=>({gameId:id,date:'2026-11-'+id,points,minutes,played:true,home:true,opponent:'BOS',rebounds:1,assists:1,threes:0});
test('regularity distinguishes identical means, keeps zeros and excludes missing values',()=>{
 const stable=regularity([20,20,null]),variable=regularity([0,40]);
 assert.equal(stable?.average,variable?.average);assert.equal(stable?.deviation,0);assert.equal(variable?.deviation,20);assert.equal(stable?.n,2);assert.equal(regularity([]),null);
});
test('comparables respect minute boundaries, venue, DNP and do not mutate source',()=>{
 const games=[game('01',20,33),game('02',22,28),{...game('03',30),home:false},{...game('04',0),played:false},game('05',2,34)];
 assert.deepEqual(comparableGames(games,30,'home',3).map(g=>g.gameId),['02','01']);assert.equal(games[0].gameId,'01');
});
test('frozen samples use canonical values and cannot add future, duplicate, absent or DNP games',()=>{
 const games=[game('01',0),game('02',20),game('03',30),{...game('04',50),played:false}];
 const input={season:2026,competition:'regular',keys:['01','02','03'],filters:'Local · últimos 3'};
 const saved=freezeSample(input,games,'points',20,'over','2026-11-04');assert.equal(saved.n,3);assert.equal(saved.hits,1);assert.equal(saved.average,50/3);
 games[0].points=99;assert.equal(saved.results[0].result,0);
 for(const keys of [['01','01'],['04'],['05'],['03']])assert.throws(()=>freezeSample({...input,keys},games,'points',20,'over',keys[0]==='03'?'2026-11-03':'2026-11-04'));
 assert.throws(()=>freezeSample({...input,keys:[]},games,'points',20,'under','2026-11-04'));
});
const person={didNotPlay:false,points:17,fieldGoals:'6-12',threes:'2-5',freeThrows:'3-4'} as BoxData['teams'][number]['players'][number];
test('live scoring reconciles actual points and weights historical efficacy by attempts',()=>{
 const games=[{...game('01',20),fieldGoalsMade:1,fieldGoalsAttempted:2,freeThrowsAttempted:0},{...game('02',20),fieldGoalsMade:9,fieldGoalsAttempted:10}];
 const context=liveScoringContext(person,games);assert.deepEqual(context.parts,{twos:8,threes:6,freeThrows:3});assert.equal(context.efficiency,.5);assert.equal(context.baseline.efficiency.value,10/12);assert.equal(context.baseline.freeThrows.value,0);assert.equal(context.baseline.freeThrows.n,1);
 assert.equal(liveScoringContext({...person,points:18},games).parts,null);assert.equal(liveScoringContext({...person,didNotPlay:true},games).parts,null);
 assert.equal(liveScoringContext({...person,fieldGoals:'0-0'},[]).efficiency,null);
});
test('live contextual history excludes current game and later dates before calculating attempts',()=>{
 const history=livePlayerBaseline([{...game('01',10),fieldGoalsAttempted:5},{...game('02',40),fieldGoalsAttempted:40},game('03',50)],'02','2026-11-03T00:00:00Z');
 assert.equal(history.n,1);assert.equal(liveScoringContext(person,history.sample).baseline.attempts.value,5);
});
