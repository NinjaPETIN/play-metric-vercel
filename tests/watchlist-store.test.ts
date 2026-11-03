import {test} from 'node:test';
import assert from 'node:assert/strict';
import {database,databaseClient} from '../lib/database-env';
import {readWatchlist,updateWatchlist} from '../lib/watchlist-store';
process.env.TURSO_DATABASE_URL='file::memory:';
test('watchlists isolate accounts, seed legacy favorites once, enforce limits atomically and preserve teams on player removal',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();await database.prepare('CREATE TABLE favorites(user_id TEXT,prop_id TEXT,created_at TEXT)').run();await database.prepare("INSERT INTO favorites VALUES ('one','2544:points','2026-11-01')").run();
 assert.deepEqual(await readWatchlist('one'),{players:['nba:2544'],teams:[]});assert.deepEqual(await readWatchlist('two'),{players:[],teams:[]});
 await updateWatchlist('one','teams','LAL',true);await updateWatchlist('one','players','nba:2544',false);assert.deepEqual(await readWatchlist('one'),{players:[],teams:['LAL']});
 await Promise.all(Array.from({length:25},(_,i)=>updateWatchlist('one','players','nba:'+i,true)));const state=await readWatchlist('one');assert.equal(state.players.length,20);assert.equal(new Set(state.players).size,20);assert.deepEqual(state.teams,['LAL']);
 await updateWatchlist('one','players',state.players[0],true);assert.equal((await readWatchlist('one')).players.length,20);await updateWatchlist('one','teams','LAL',false);assert.equal((await readWatchlist('one')).players.length,20);assert.deepEqual((await readWatchlist('one')).teams,[]);assert.deepEqual(await readWatchlist('two'),{players:[],teams:[]});databaseClient().close();
});
