import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackFrame,shootingAt,type CourtPlay} from '../lib/court-playback';
const event=(id:string,made:boolean,clock='5:00'):CourtPlay=>({id,text:'shot',clock,period:1,awayScore:made?3:0,homeScore:0,athleteId:'7',team:'MIA',shot:{value:3,made}});
test('historical shot percentages stop at the exact source event even at the same clock',()=>{
 const plays=[event('a',true),event('b',false),event('c',true)];
 assert.deepEqual(shootingAt(plays,'a','7',3,'MIA'),[1,1]);assert.deepEqual(shootingAt(plays,'b','7',3,'MIA'),[1,2]);assert.deepEqual(shootingAt(plays,'c','7',3,'MIA'),[2,3]);
 assert.deepEqual(shootingAt([...plays,event('c',true)],'c','7',3,'MIA'),[2,3]);assert.equal(shootingAt(plays,'missing','7',3,'MIA'),null);
});
test('refresh keeps a selected event and its saved frame if the live window moves past it',()=>{
 const old=[event('a',true),event('b',false)],selection={id:'a',plays:old};
 assert.equal(playbackFrame([...old,event('c',true)],selection).action?.id,'a');
 const archived=playbackFrame([event('c',true)],selection);assert.equal(archived.action?.id,'a');assert.equal(archived.missing,true);assert.equal(archived.plays.length,1);
 assert.equal(playbackFrame([event('c',true)],null).action?.id,'c');
});
test('historical shooting separates categories, players and teams and preserves missed attempts',()=>{
 const plays=[event('a',false),{...event('b',true),athleteId:'8'},{...event('c',true),team:'NYK'},{...event('d',true),shot:{value:2 as const,made:true}}];
 assert.deepEqual(shootingAt(plays,'d','7',3,'MIA'),[0,1]);assert.deepEqual(shootingAt(plays,'d','7',2,'MIA'),[1,1]);
});
