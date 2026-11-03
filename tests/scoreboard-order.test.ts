import test from 'node:test';
import assert from 'node:assert/strict';
import {orderScoreboardGames} from '../lib/scoreboard-order';
test('scoreboards put live games first, upcoming next and completed last without mutating the feed',()=>{
 const games=[{id:'ended',state:'final',startsAt:'2026-11-03T20:00:00Z'},{id:'later',state:'scheduled',startsAt:'2026-11-04T01:00:00Z'},{id:'playing',state:'live',startsAt:'2026-11-03T22:00:00Z'},{id:'soon',state:'scheduled',startsAt:'2026-11-04T00:00:00Z'}];
 assert.deepEqual(orderScoreboardGames(games).map(g=>g.id),['playing','soon','later','ended']);assert.equal(games[0].id,'ended');
 const next=games.map(g=>g.id==='playing'?{...g,state:'final'}:g.id==='soon'?{...g,state:'live'}:g);
 assert.deepEqual(orderScoreboardGames(next).map(g=>g.id),['soon','later','ended','playing']);assert.equal(new Set(orderScoreboardGames(next).map(g=>g.id)).size,4);
});
test('calendar fallback uses the same priority and stable schedule ordering for equal states',()=>{
 const games=[{id:'3',status:3,date:'2026-11-03'},{id:'2',status:1,date:'2026-11-03'},{id:'1',status:2,date:'2026-11-03'}];assert.deepEqual(orderScoreboardGames(games).map(g=>g.id),['1','2','3']);assert.deepEqual(orderScoreboardGames([{id:'b',state:'live'},{id:'a',state:'live'}]).map(g=>g.id),['a','b']);assert.deepEqual(orderScoreboardGames([]),[]);
});
