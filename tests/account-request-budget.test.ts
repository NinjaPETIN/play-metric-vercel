import test from 'node:test';
import assert from 'node:assert/strict';
process.env.TURSO_DATABASE_URL='file::memory:';
const {database}=await import('../lib/database-env');
const {accountRequestBudget}=await import('../lib/account-request-budget');
test('account burst budgets are atomic, isolate users and do not consume other features',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 const requests=await Promise.allSettled(Array.from({length:6},()=>accountRequestBudget('one','participation',3)));
 assert.equal(requests.filter(r=>r.status==='fulfilled').length,3);
 assert.ok(requests.filter(r=>r.status==='rejected').every(r=>r.status==='rejected'&&r.reason.status===429));
 await accountRequestBudget('two','participation',3);await accountRequestBudget('one','visits',3);
});
