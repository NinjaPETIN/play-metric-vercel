import test from 'node:test';
import assert from 'node:assert/strict';
import {contentSecurityPolicy} from '../lib/content-security';
import {connectionHash,consumeBudget} from '../lib/metrics-budget';
import {database,databaseClient} from '../lib/database-env';
import {NextRequest} from 'next/server';
import {proxy} from '../proxy';
process.env.TURSO_DATABASE_URL='file::memory:';
test('proxy replaces client nonces and forwards the same fresh policy used by the browser',async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 try{
 const request=()=>new NextRequest('https://example.test/login',{headers:{'x-nonce':'client-chosen','content-security-policy':"script-src 'nonce-client-chosen'"}});
 const first=await proxy(request()),second=await proxy(request());
 const policy=first.headers.get('content-security-policy');assert.ok(policy);assert.ok(policy.includes('strict-dynamic'));
 const nonce=first.headers.get('x-middleware-request-x-nonce');assert.ok(nonce);assert.notEqual(nonce,'client-chosen');
 assert.equal(first.headers.get('x-middleware-request-content-security-policy'),policy);
 assert.ok(policy.includes(`'nonce-${nonce}'`));assert.notEqual(second.headers.get('x-middleware-request-x-nonce'),nonce);
 assert.equal(first.headers.get('content-security-policy-report-only'),null);
 }finally{if(url!==undefined)process.env.NEXT_PUBLIC_SUPABASE_URL=url;if(key!==undefined)process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=key;}
});
test('production CSP authorizes fresh nonces, forbids inline/eval scripts and limits image and form destinations',()=>{const csp=contentSecurityPolicy('abc123');assert.match(csp,/default-src 'self'/);assert.match(csp,/script-src 'self' 'nonce-abc123' 'strict-dynamic';/);assert.ok(!csp.includes('unsafe-eval'));assert.match(csp,/form-action 'self'/);assert.throws(()=>contentSecurityPolicy("bad'; script-src *"));assert.match(contentSecurityPolicy('abc123',true),/unsafe-eval/);});
test('outside Vercel client-supplied forwarding headers cannot choose their connection bucket; hashes rotate daily',()=>{const r=new Request('https://test.local',{headers:{'x-forwarded-for':'192.0.2.1'}}),other=new Request('https://test.local',{headers:{'x-forwarded-for':'192.0.2.2'}});assert.equal(connectionHash(r,'secret',0,false),connectionHash(other,'secret',0,false));assert.notEqual(connectionHash(r,'secret',0,true),connectionHash(other,'secret',0,true));assert.notEqual(connectionHash(r,'secret',0,true),connectionHash(r,'secret',86400_000,true));});
test('shared SQLite budgets enforce concurrent limits and renew at the next window',async()=>{await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();const replies=await Promise.all(Array.from({length:8},()=>consumeBudget('test',3,60000,100)));assert.equal(replies.filter(Boolean).length,3);assert.equal(await consumeBudget('test',3,60000,100),false);assert.equal(await consumeBudget('test',3,60000,60100),true);databaseClient().close();});
