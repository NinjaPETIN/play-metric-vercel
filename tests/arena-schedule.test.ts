import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaSchedule,argentinaDay} from '../lib/arena-schedule';
import type {Calendar} from '../lib/nba-snapshot';
const game=(id:string,startsAt:string,competition:'regular'|'preseason'='regular')=>({id,startsAt,date:startsAt.slice(0,10),competition,status:1,home:'BOS',away:'NYK'}) as Calendar['games'][number];
test('Arena picks the Argentina date across UTC midnight and preserves finished results',()=>{
 const c={games:[{...game('1','2026-10-30T01:00:00Z'),status:3,awayScore:101,homeScore:105},game('2','2026-10-30T23:00:00Z')]} as Calendar;
 const s=arenaSchedule(c,'2026-10-30T02:00:00Z');
 assert.equal(argentinaDay('2026-10-30T02:00:00Z'),'2026-10-29');
 assert.equal(s.today,true);assert.equal(s.day,'2026-10-29');assert.deepEqual(s.games.map(g=>g.id),['1']);assert.equal(s.games[0].homeScore,105);
});
test('Arena labels a future day honestly and does not invent games from old or preseason records',()=>{
 const c={games:[game('old','2026-10-20T23:00:00Z'),game('pre','2026-10-29T23:00:00Z','preseason'),game('next','2026-11-01T23:00:00Z')]} as Calendar;
 const s=arenaSchedule(c,'2026-10-29T18:00:00Z');assert.equal(s.today,false);assert.equal(s.day,'2026-11-01');assert.deepEqual(s.games.map(g=>g.id),['next']);
 assert.deepEqual(arenaSchedule({...c,games:c.games.slice(0,2)},'2026-10-29T18:00:00Z'),{today:false,day:null,games:[]});
});
