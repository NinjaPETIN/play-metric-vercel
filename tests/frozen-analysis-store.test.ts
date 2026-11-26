import test from 'node:test';
import assert from 'node:assert/strict';
process.env.TURSO_DATABASE_URL='file::memory:';
const {database}=await import('../lib/database-env');
const {gameReferencePrefix,saveFrozenNote}=await import('../lib/frozen-analysis-store');
test('frozen notes cannot cross accounts or alter the captured sample, line or timestamp',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 const original={line:20.5,savedAt:'2026-11-25T12:00:00Z',snapshot:{results:[{result:10}],filters:'Local'}};
 const key=gameReferencePrefix('owner')+'0022600010:2544:points';
 await database.prepare('INSERT INTO provider_cache VALUES (?,?,?)').bind(key,JSON.stringify(original),'2100').run();
 assert.equal(await saveFrozenNote('other','0022600010','2544','points','intruso'),false);
 assert.equal(await saveFrozenNote('owner','0022600010','2544','points','Revisar los minutos'),true);
 const saved=await database.prepare('SELECT payload FROM provider_cache WHERE key=?').bind(key).first<{payload:string}>();
 assert.deepEqual(JSON.parse(saved!.payload),{...original,note:'Revisar los minutos'});
});
