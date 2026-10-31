import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLiveScores,liveFeed,linkLiveCalendar} from '../lib/live-scores';
import {readLiveScores} from '../lib/live-scores-store';
import {database,databaseClient} from '../lib/database-env';
import type {Calendar} from '../lib/nba-snapshot';
process.env.TURSO_DATABASE_URL='file::memory:';
function raw(){return {leagues:[{abbreviation:'NBA'}],events:[{id:'123',date:new Date().toISOString().slice(0,16)+'Z',status:{period:3,displayClock:'3:49',type:{name:'STATUS_IN_PROGRESS',state:'in',completed:false}},competitions:[{competitors:[{homeAway:'home',score:'72',team:{abbreviation:'GS',displayName:'Golden State Warriors'}},{homeAway:'away',score:'54',team:{abbreviation:'NY',displayName:'New York Knicks'}}]}]}]};}
test('live scores preserve actual scores, period and clock; future games have no invented zero scores',()=>{
 const input=raw(),g=normalizeLiveScores(input)[0];assert.equal(g.home,'GSW');assert.equal(g.away,'NYK');assert.equal(g.homeScore,72);assert.equal(g.detail,'C3 · 3:49');assert.equal(g.nbaId,null);
 input.events[0].status.type={name:'STATUS_HALFTIME',state:'in',completed:false};assert.equal(normalizeLiveScores(input)[0].detail,'Entretiempo');
 input.events[0].status.type={name:'STATUS_SCHEDULED',state:'pre',completed:false};assert.equal(normalizeLiveScores(input)[0].homeScore,null);
 input.events[0].status.type={name:'STATUS_POSTPONED',state:'pre',completed:false};assert.equal(normalizeLiveScores(input)[0].state,'postponed');
 input.events[0].status.type={name:'STATUS_FINAL',state:'post',completed:true};assert.equal(normalizeLiveScores(input)[0].state,'final');
 const wrong=raw();wrong.leagues[0].abbreviation='WNBA';assert.throws(()=>normalizeLiveScores(wrong));
 const duplicate=raw();duplicate.events.push(duplicate.events[0]);assert.throws(()=>normalizeLiveScores(duplicate));
 const old=raw();old.events[0].date='2000-01-01T00:00:00Z';assert.throws(()=>normalizeLiveScores(old));
 const bad=raw();bad.events[0].competitions[0].competitors[0].score='NaN';assert.throws(()=>normalizeLiveScores(bad));
});
test('live links require one exact calendar match and respect the New York game date across UTC midnight',()=>{
 const g={...normalizeLiveScores(raw())[0],startsAt:'2026-10-31T02:00:00Z'};
 const calendar={games:[{id:'0022600001',date:'2026-10-30',home:'GSW',away:'NYK'}]} as Calendar;
 assert.equal(linkLiveCalendar([g],calendar)[0].nbaId,'0022600001');assert.equal(linkLiveCalendar([g],null)[0].nbaId,null);
 assert.equal(linkLiveCalendar([g],{...calendar,games:[...calendar.games,...calendar.games]})[0].nbaId,null);
});
test('failed or old readings are never presented as current and expire after five minutes',()=>{
 const now=Date.now(),saved={games:normalizeLiveScores(raw()),checkedAt:new Date(now).toISOString(),fetchedAt:new Date(now-30000).toISOString(),failed:false};
 assert.equal(liveFeed(saved,now).status,'ready');assert.equal(liveFeed({...saved,failed:true},now).status,'stale');
 assert.equal(liveFeed({...saved,fetchedAt:new Date(now-120000).toISOString()},now).status,'stale');
 const expired=liveFeed({...saved,fetchedAt:new Date(now-300001).toISOString()},now);assert.equal(expired.status,'unavailable');assert.equal(expired.games.length,0);
});
test('persistent live lease shares provider requests; failed refreshes preserve the last score and timestamp',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;return Response.json(raw());};
  const responses=await Promise.all(Array.from({length:8},()=>readLiveScores()));assert.equal(calls,1);assert.ok(responses.some(r=>r.status==='ready'));
  const ready=await readLiveScores();assert.equal(ready.games[0].homeScore,72);assert.equal(calls,1);
  const old={games:ready.games,fetchedAt:ready.fetchedAt,checkedAt:'2000-01-01T00:00:00.000Z',failed:false};
  await database.prepare('update provider_cache set payload=? where key=?').bind(JSON.stringify(old),'pm:live:espn:v1').run();await database.prepare('update provider_cache set expires_at=? where key=?').bind('2000-01-01T00:00:00.000Z','pm:live:lease:v1').run();
  globalThis.fetch=async()=>{calls++;return new Response('Unavailable',{status:503});};
  const failed=await readLiveScores();assert.equal(failed.status,'stale');assert.equal(failed.fetchedAt,ready.fetchedAt);assert.equal(failed.games[0].homeScore,72);await readLiveScores();assert.equal(calls,2);
 }finally{globalThis.fetch=original;databaseClient().close();}
});
