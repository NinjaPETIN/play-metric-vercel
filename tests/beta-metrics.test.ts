import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
process.env.TURSO_DATABASE_URL='file::memory:';
process.env.COLLECTOR_SECRET='a'.repeat(64);
const {database}=await import('../lib/database-env');
const {POST}=await import('../app/api/beta/events/route');
const visitor=randomUUID();
const request=(body:unknown,origin='https://example.test')=>new Request('https://example.test/api/beta/events',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('beta measurement requires consent and origin, deduplicates concurrent actions and recognizes a prior day',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 assert.equal((await POST(request({name:'visit',visitor,consent:false}))).status,400);
 assert.equal((await POST(request({name:'visit',visitor,consent:true},'https://other.test'))).status,403);
 assert.equal((await POST(request({name:'unknown',visitor,consent:true}))).status,400);
 const replies=await Promise.all(Array.from({length:5},()=>POST(request({name:'visit',visitor,consent:true}))));assert.ok(replies.every(r=>r.status===204));
 const rows=await database.prepare("SELECT key,payload FROM provider_cache WHERE key like 'pm:beta:counts:%'").all<{key:string;payload:string}>();assert.equal(rows.results.length,1);assert.equal(JSON.parse(rows.results[0].payload).count,1);
 const hash=createHash('sha256').update('play-metric-beta:'+visitor).digest('hex');
 await database.prepare("UPDATE provider_cache SET payload=json_object('firstDay','2000-01-01') WHERE key=?").bind('pm:beta:visitor:'+hash).run();
 assert.equal((await POST(request({name:'visit',visitor,consent:true}))).status,204);
 const returning=await database.prepare("SELECT payload FROM provider_cache WHERE key like 'pm:beta:counts:%:return_visit'").first<{payload:string}>();assert.equal(JSON.parse(returning!.payload).count,1);
 assert.equal((await POST(request({name:'share_download',visitor,consent:true}))).status,204);
});
test('public popularity uses consenting deduplicated profile events, thresholds and no visitor identifiers',async()=>{
 const {popularPlayers}=await import('../lib/popular-players');
 assert.equal((await POST(request({name:'profile_open',visitor:randomUUID(),consent:false,playerId:'2544'}))).status,400);
 assert.equal((await POST(request({name:'visit',visitor:randomUUID(),consent:true,playerId:'2544'}))).status,400);
 assert.equal((await POST(request({name:'profile_open',visitor:randomUUID(),consent:true,playerId:'invalid'}))).status,400);
 const id=randomUUID();const repeat=()=>POST(request({name:'profile_open',visitor:id,consent:true,playerId:'2544'}));
 assert.ok((await Promise.all([repeat(),repeat(),repeat()])).every(r=>r.status===204));
 assert.deepEqual(await popularPlayers(),[]);
 for(let i=0;i<2;i++)assert.equal((await POST(request({name:'profile_open',visitor:randomUUID(),consent:true,playerId:'2544'}))).status,204);
 assert.deepEqual(await popularPlayers(),['2544']);
 const count=await database.prepare("select payload from provider_cache where key like 'pm:beta:popular:counts:%'").first<{payload:string}>();assert.deepEqual(JSON.parse(count!.payload),{playerId:'2544',count:3});
 assert.deepEqual(await popularPlayers(Date.now()+9*86400_000),[]);
});

test('rotating visitor IDs does not bypass connection limits; global exhaustion prevents new visitor rows',async t=>{
 t.mock.method(Date,'now',()=>1_800_000_000_000);
 const before=process.env.VERCEL;process.env.VERCEL='1';
 const send=(id:string)=>POST(new Request('https://example.test/api/beta/events',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-vercel-forwarded-for':'192.0.2.30'},body:JSON.stringify({name:'visit',visitor:id,consent:true})}));
 try{
 for(let i=0;i<30;i++)assert.equal((await send(randomUUID())).status,204);
 const rejected=randomUUID();assert.equal((await send(rejected)).status,429);
 const rejectedKey='pm:beta:visitor:'+createHash('sha256').update('play-metric-beta:'+rejected).digest('hex');assert.equal(await database.prepare('SELECT key FROM provider_cache WHERE key=?').bind(rejectedKey).first(),null);
 await database.prepare("UPDATE provider_cache SET payload=json_set(payload,'$.n',10000) WHERE key='pm:limit:metrics:global-day'").run();
 const exhausted=randomUUID();assert.equal((await send(exhausted)).status,429);
 const exhaustedKey='pm:beta:visitor:'+createHash('sha256').update('play-metric-beta:'+exhausted).digest('hex');assert.equal(await database.prepare('SELECT key FROM provider_cache WHERE key=?').bind(exhaustedKey).first(),null);
 }finally{if(before===undefined)delete process.env.VERCEL;else process.env.VERCEL=before;}
});
