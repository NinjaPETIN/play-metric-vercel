import test from 'node:test';
import assert from 'node:assert/strict';
import {database,databaseClient} from '../lib/database-env';
import {reservePlayerSlot} from '../lib/player-usage-store';
import {profileFor} from '../lib/account-profile';
process.env.TURSO_DATABASE_URL='file::memory:';
test('concurrent player requests stop at five; repeats, other users and the next day have independent slots',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 const replies=await Promise.all(Array.from({length:12},(_,i)=>reservePlayerSlot('user-a',String(i+1),'2026-10-13',5)));
 assert.equal(replies.filter(Boolean).length,5);
 const row=await database.prepare('SELECT payload FROM provider_cache WHERE key=?').bind('pm:usage:user-a:2026-10-13').first<{payload:string}>();
 const ids=JSON.parse(row!.payload).playerIds as string[];assert.equal(new Set(ids).size,5);
 assert.deepEqual(await reservePlayerSlot('user-a',ids[0],'2026-10-13',5),ids);
 assert.equal(await reservePlayerSlot('user-a','999','2026-10-13',5),null);
 assert.deepEqual(await reservePlayerSlot('user-b','999','2026-10-13',5),['999']);
 assert.deepEqual(await reservePlayerSlot('user-a','999','2026-10-14',5),['999']);
});
test('profile lookup reads only the verified user key and does not mix accounts',async()=>{
 await database.prepare('INSERT INTO provider_cache(key,payload,expires_at) VALUES (?,?,?)').bind('pm:profile:user-a',JSON.stringify({displayName:'Perfil A'}),'2100-01-01').run();
 await database.prepare('INSERT INTO provider_cache(key,payload,expires_at) VALUES (?,?,?)').bind('pm:profile:user-b',JSON.stringify({displayName:'Perfil B'}),'2100-01-01').run();
 const user=(id:string)=>({userId:id,email:id+'@example.test',displayName:'Predeterminado',fullName:null});
 assert.deepEqual(await profileFor(user('user-a')),{displayName:'Perfil A',email:'user-a@example.test'});
 assert.deepEqual(await profileFor(user('user-b')),{displayName:'Perfil B',email:'user-b@example.test'});
 assert.deepEqual(await profileFor(user('user-c')),{displayName:'Predeterminado',email:'user-c@example.test'});
 databaseClient().close();
});
