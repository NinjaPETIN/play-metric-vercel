import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarWithLive} from '../lib/calendar-live';
import type {Calendar} from '../lib/nba-snapshot';
import type {LiveFeed,LiveGame} from '../lib/live-scores';

const now=Date.parse('2026-11-02T01:00:00Z');
const game:Calendar['games'][number]={id:'0022600154',date:'2026-11-01',startsAt:'2026-11-01T23:00:00Z',
 home:'ORL',away:'BOS',homeId:1,awayId:2,homeName:'Orlando Magic',awayName:'Boston Celtics',
 status:1,statusText:'7:00 pm ET',homeScore:null,awayScore:null,competition:'regular'};
const calendar:Calendar={source:'nba_api',season:2026,fetchedAt:'2026-11-01T17:00:00Z',games:[game]};
const reading:LiveGame={id:'401000001',nbaId:game.id,startsAt:game.startsAt!,home:'ORL',away:'BOS',
 homeName:game.homeName,awayName:game.awayName,homeScore:97,awayScore:108,state:'final',period:4,clock:'0.0',detail:'Final'};
const feed:LiveFeed={provider:'ESPN',status:'ready',fetchedAt:new Date(now-5000).toISOString(),checkedAt:new Date(now).toISOString(),games:[reading]};

test('current final results replace a scheduled calendar card without mutating the imported calendar',()=>{
 const [g]=calendarWithLive(calendar,feed,now);
 assert.equal(g.status,3);assert.equal(g.awayScore,108);assert.equal(g.homeScore,97);assert.equal(g.live?.detail,'Final');
 assert.equal([g].filter(x=>x.status===3).length,1);assert.equal([g].filter(x=>x.status!==3).length,0);
 assert.equal(game.status,1);assert.equal(game.awayScore,null);assert.equal(calendar.fetchedAt,'2026-11-01T17:00:00Z');
});
test('an in-progress card receives the provider period and clock, not a simulated timer',()=>{
 const f={...feed,games:[{...reading,state:'live' as const,detail:'C4 · 1:19',clock:'1:19',awayScore:97,homeScore:90}]};
 const [g]=calendarWithLive(calendar,f,now);assert.equal(g.status,2);assert.equal(g.live?.detail,'C4 · 1:19');assert.equal(g.homeScore,90);assert.equal(g.live?.stale,false);
});
test('late readings are labelled and expire; unavailable live data leaves the imported calendar intact',()=>{
 assert.equal(calendarWithLive(calendar,feed,now,true)[0].live?.stale,true);
 assert.equal(calendarWithLive(calendar,{...feed,fetchedAt:new Date(now-120000).toISOString()},now)[0].live?.stale,true);
 for(const f of [null,{...feed,status:'unavailable' as const},{...feed,fetchedAt:new Date(now-300000).toISOString()},{...feed,fetchedAt:new Date(now+6000).toISOString()}]){
  assert.equal(calendarWithLive(calendar,f,now)[0],game);
 }
});
test('results cannot cross game IDs, teams, dates or ambiguous duplicate readings',()=>{
 for(const games of [[{...reading,nbaId:null}],[{...reading,nbaId:'0022600155'}],[{...reading,home:'IND'}],[{...reading,startsAt:'2026-10-31T23:00:00Z'}],[reading,reading]]){
  assert.equal(calendarWithLive(calendar,{...feed,games},now)[0],game);
 }
});
test('scheduled readings do not erase a final result or demote a game already in progress',()=>{
 const final={...game,status:3,homeScore:97,awayScore:108};
 const scheduled={...reading,state:'scheduled' as const,homeScore:null,awayScore:null,detail:'Por jugar'};
 assert.equal(calendarWithLive({...calendar,games:[final]},{...feed,games:[scheduled]},now)[0],final);
 const playing={...game,status:2};
 assert.equal(calendarWithLive({...calendar,games:[playing]},{...feed,games:[scheduled]},now)[0],playing);
});
