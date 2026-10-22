import test from 'node:test';
import assert from 'node:assert/strict';
import {cachedNbaRead,clearNbaReadCache} from '../lib/read-cache';
import {database,databaseClient} from '../lib/database-env';
import {storeCalendar,CalendarConflict} from '../lib/calendar-store';
import type {Calendar} from '../lib/nba-snapshot';
process.env.TURSO_DATABASE_URL='file::memory:';
test('forced verification bypasses an old in-flight read and cannot re-cache it',async()=>{
 clearNbaReadCache();let finish!:(value:{revision:number})=>void;const old=cachedNbaRead('calendar',()=>new Promise<{revision:number}>(resolve=>{finish=resolve;}));
 const fresh=await cachedNbaRead('calendar',async()=>({revision:2}),true);assert.equal(fresh.revision,2);finish({revision:1});assert.equal((await old).revision,1);
 assert.equal((await cachedNbaRead('calendar',async()=>({revision:99}))).revision,2);
 await assert.rejects(()=>cachedNbaRead('calendar',async()=>{throw Error('DB unavailable');},true));
 clearNbaReadCache('calendar');assert.equal((await cachedNbaRead('calendar',async()=>({revision:3}))).revision,3);
});
test('calendar imports are idempotent, verified and monotonic; obsolete imports do not replace the backup',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 const fixture=(date:string)=>({source:'nba_api',season:2026,fetchedAt:date,games:[{id:'0022600001',date:'2026-10-21',startsAt:null,home:'BOS',away:'NYK',homeId:1,awayId:2,homeName:'Boston Celtics',awayName:'New York Knicks',status:3,statusText:'Final',homeScore:100,awayScore:90,competition:'regular'}]}) as Calendar;
 try{const first=fixture('2026-10-21T12:00:00Z'),second=fixture('2026-10-22T12:00:00Z');assert.equal((await storeCalendar(first)).verified,true);assert.equal((await storeCalendar(first)).verified,true);await storeCalendar(second);await assert.rejects(()=>storeCalendar(first),CalendarConflict);await assert.rejects(()=>storeCalendar({...second,season:2025}),CalendarConflict);
 const saved=await database.prepare("select payload from provider_cache where key='nba_calendar'").first<{payload:string}>(),backup=await database.prepare("select payload from provider_cache where key='nba_backup:calendar'").first<{payload:string}>();assert.equal(JSON.parse(saved!.payload).fetchedAt,second.fetchedAt);assert.equal(JSON.parse(backup!.payload).fetchedAt,first.fetchedAt);
 }finally{databaseClient().close();}
});
