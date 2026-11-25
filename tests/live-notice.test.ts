import test from 'node:test';
import assert from 'node:assert/strict';
import {nextLiveNotice,readLiveNoticeSeen,type LiveNoticeTracker} from '../lib/live-notice';
import type {LiveFeed,LiveGame} from '../lib/live-scores';
const now=Date.parse('2026-11-25T23:00:00Z');
const game:LiveGame={id:'123',nbaId:'0022600055',startsAt:new Date(now-60000).toISOString(),home:'PHI',away:'MIA',homeName:'Philadelphia 76ers',awayName:'Miami Heat',homeScore:2,awayScore:0,state:'live',period:1,clock:'11:30',detail:'C1 · 11:30'};
const feed=(games:LiveGame[]):LiveFeed=>({provider:'ESPN',status:'ready',fetchedAt:new Date(now).toISOString(),checkedAt:new Date(now).toISOString(),games});
const empty=():LiveNoticeTracker=>({seen:[],previous:{}});
test('an already live game is labelled live and scheduled-to-live announces a start exactly once',()=>{
 const initial=nextLiveNotice(empty(),feed([game]),now);assert.equal(initial.started,false);assert.equal(initial.games.length,1);assert.equal(nextLiveNotice(initial.tracker,feed([game]),now).games.length,0);
 const before=nextLiveNotice(empty(),feed([{...game,state:'scheduled'}]),now);const started=nextLiveNotice(before.tracker,feed([game]),now);assert.equal(started.started,true);assert.equal(started.games[0].nbaId,game.nbaId);assert.deepEqual(before.tracker.seen,[]);
});
test('stale, unavailable, failed and future readings cannot generate or consume notices',()=>{
 for(const f of [{...feed([game]),status:'stale' as const},{...feed([game]),fetchedAt:new Date(now-90001).toISOString()},{...feed([game]),fetchedAt:new Date(now+6000).toISOString()},null]){const tracker=empty(),result=nextLiveNotice(tracker,f,now);assert.equal(result.games.length,0);assert.equal(result.tracker,tracker);}
 assert.equal(nextLiveNotice(empty(),feed([game]),now,true).games.length,0);
 assert.equal(nextLiveNotice(empty(),feed([{...game,nbaId:null},{...game,startsAt:new Date(now-49*3600000).toISOString()}]),now).games.length,0);
});
test('final games never restart and stored IDs prevent repeat notices after navigation',()=>{
 const final=nextLiveNotice(empty(),feed([{...game,state:'final'}]),now);assert.equal(nextLiveNotice(final.tracker,feed([game]),now).games.length,0);
 const seen=readLiveNoticeSeen(JSON.stringify([game.nbaId,game.nbaId,'bad',7]));assert.deepEqual(seen,[game.nbaId]);assert.equal(nextLiveNotice({seen,previous:{}},feed([game]),now).games.length,0);assert.deepEqual(readLiveNoticeSeen('{'),[]);
});
