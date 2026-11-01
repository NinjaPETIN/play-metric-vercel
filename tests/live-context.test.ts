import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLiveContext} from '../lib/live-context';
test('live context maps teams and real quarter scores; plays preserve clocks, scores and source descriptions',()=>{
 const play={id:'p1',text:'Player makes three point jumper',period:{number:3},clock:{displayValue:'2:30'},awayScore:70,homeScore:68,team:{id:'1'}};
 const context=normalizeLiveContext({header:{competitions:[{competitors:[{id:'1',team:{abbreviation:'GS'},linescores:[{displayValue:'25'},{displayValue:'30'}]},{id:'2',team:{abbreviation:'LAL'},linescores:[{displayValue:'24'},{displayValue:'29'}]}]}]},plays:[play,play,{...play,id:'bad',awayScore:-1},{...play,id:'unknown',team:{id:'other'}}]},'GSW','LAL');
 assert.deepEqual(context.periods[0],{team:'GSW',scores:[25,30]});assert.equal(context.plays.length,2);assert.equal(context.plays[0].team,'GSW');assert.equal(context.plays[0].clock,'2:30');assert.equal(context.plays[1].team,null);
});
test('unpublished and malformed context stays empty and does not invent quarter points or plays',()=>{
 assert.deepEqual(normalizeLiveContext({},'PHI','CHA'),{periods:[],plays:[]});
 const c=normalizeLiveContext({header:{competitions:[{competitors:[{id:'1',team:{abbreviation:'PHI'},linescores:[{displayValue:'—'}]}]}]},plays:[{id:'bad',text:'Unverified'}]},'PHI','CHA');assert.deepEqual(c,{periods:[],plays:[]});
});

test('recent actions expose only validated participant identities and source scoring increments',()=>{
 const base={id:'p1',text:'Player makes jumper',period:{number:2},clock:{displayValue:'3:21'},awayScore:32,homeScore:30};
 const data=normalizeLiveContext({plays:[{...base,participants:[{athlete:{id:'123'}}],scoringPlay:true,scoreValue:2},{...base,id:'p2',participants:[{athlete:{id:'invalid'}}],scoringPlay:true,scoreValue:99},{...base,id:'p3',scoringPlay:false,scoreValue:3}]},'PHI','CHA');
 assert.equal(data.plays[0].athleteId,'123');assert.equal(data.plays[0].pointsAdded,2);assert.equal(data.plays[1].athleteId,null);assert.equal(data.plays[1].pointsAdded,0);assert.equal(data.plays[2].pointsAdded,0);
});

test('shot positions reject sentinel coordinates and require consistency with the published shot distance',()=>{
 const base={id:'s1',text:'Player makes 26-foot three point jumper',period:{number:2},clock:{displayValue:'3:21'},awayScore:32,homeScore:30,shootingPlay:true};
 const c=normalizeLiveContext({plays:[{...base,coordinate:{x:7,y:19}},{...base,id:'s2',coordinate:{x:-214748340,y:-214748365}},{...base,id:'s3',coordinate:{x:25,y:0}},{...base,id:'s4',text:'Player defensive rebound',coordinate:{x:7,y:19}}]},'PHI','CHA');
 assert.deepEqual(c.plays[0].shotLocation,{x:7,y:19});assert.ok(c.plays.slice(1).every(p=>p.shotLocation===null));
});
