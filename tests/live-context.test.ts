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
