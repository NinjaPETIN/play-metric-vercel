import {test} from 'node:test';
import assert from 'node:assert/strict';
import {elapsedSeconds,gameEvolution} from '../lib/game-evolution';
import {livePlayerBaseline} from '../lib/live-player-baseline';
import {livePlayerKey,nbaPlayerId} from '../lib/player-identity';
import type {BoxData} from '../lib/live-boxscore';
import type {Game} from '../lib/analytics';
test('evolution preserves same-clock source order, ties and overtime without inventing missing events',()=>{
 const plays=[{id:'a',period:1,clock:'11:50',awayScore:2,homeScore:0},{id:'b',period:1,clock:'11:50',awayScore:2,homeScore:3},{id:'c',period:1,clock:'11:40',awayScore:3,homeScore:3},{id:'d',period:1,clock:'11:20',awayScore:5,homeScore:3},{id:'d',period:1,clock:'11:20',awayScore:5,homeScore:3},{id:'bad',period:1,clock:'99:00',awayScore:99,homeScore:99},{id:'e',period:5,clock:'4:30',awayScore:100,homeScore:101}];
 const result=gameEvolution({context:{plays}} as unknown as BoxData);
 assert.deepEqual(result.points.map(p=>p.id),['a','b','c','d','e']);assert.equal(result.changes,3);assert.equal(result.awayLead,2);assert.equal(result.homeLead,1);assert.equal(result.points.at(-1)!.seconds,2910);
 assert.equal(elapsedSeconds(4,'0.0'),2880);assert.equal(elapsedSeconds(6,'5:00'),3180);assert.equal(elapsedSeconds(1,'junk'),null);assert.equal(elapsedSeconds(1,''),null);assert.equal(elapsedSeconds(1,'1:99'),null);
});
test('live context excludes the current game, future games and DNP and reports the actual sample size',()=>{
 const g=(date:string,points:number,gameId:string,played=true)=>({date,points,gameId,played,minutes:30,rebounds:4,assists:5,threes:1,opponent:'CLE',home:true}) as Game;
 const result=livePlayerBaseline([g('2026-11-01',22,'old'),g('2026-11-02',24,'current'),g('2026-11-03',50,'future'),g('2026-10-31',0,'dnp',false)],'current','2026-11-03T00:00:00Z');
 assert.equal(result.n,1);assert.equal(result.points,22);assert.deepEqual(result.recent,[{date:'2026-11-01',points:22}]);assert.equal(livePlayerBaseline([],'x','2026-11-03T00:00:00Z').points,null);
});
test('live ESPN identities map by verified complete names and never reuse an ESPN numeric ID as an NBA ID',()=>{
 assert.equal(nbaPlayerId('LeBron James'),'2544');assert.equal(livePlayerKey({id:'1966',name:'LeBron James'}),'nba:2544');assert.equal(livePlayerKey({id:'2544',name:'Unlisted Player'}),'espn:2544');assert.notEqual(nbaPlayerId('James'), '2544');
 assert.equal(livePlayerKey({id:'7788',name:'New Rookie'},[{id:'1234567',name:'New Rookie'}]),'nba:1234567');assert.equal(nbaPlayerId('New Rookie',[{id:'1',name:'New Rookie'},{id:'2',name:'New Rookie'}]),null);
});
