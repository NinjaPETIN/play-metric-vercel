import test from 'node:test';
import assert from 'node:assert/strict';
import {database,databaseClient} from '../lib/database-env';
import {readNews} from '../lib/news-store';
process.env.TURSO_DATABASE_URL='file::memory:';
test('all readers share the bilingual quota; 429 keeps real cached news and persists Retry-After across requests',async()=>{
 const original=globalThis.fetch;let calls=0;process.env.CURRENTS_API_KEY='fixture-key-not-a-real-credential';
 try{await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();
 const published=new Date().toISOString();globalThis.fetch=async(url)=>{calls++;assert.equal(new URL(String(url)).hostname,'api.currentsapi.services');return Response.json({status:'ok',news:[{title:'LeBron James injury update in NBA',url:'https://www.nba.com/news/lebron',published,language:'en'}]});};
 const feeds=await Promise.all(Array.from({length:8},()=>readNews()));assert.equal(calls,2);assert.ok(feeds.some(f=>f.provider==='Currents'&&f.articles.length===1&&f.status==='ready'));const success=await readNews();assert.equal(calls,2);
 await database.prepare("update provider_cache set payload=json_set(payload,'$.nextRefreshAt','2000-01-01T00:00:00Z') where key='pm:news:v1'").run();await database.prepare("update provider_cache set expires_at='2000-01-01T00:00:00Z' where key='pm:news:lease:v2:Currents'").run();
 globalThis.fetch=async()=>{calls++;return new Response('rate limited',{status:429,headers:{'retry-after':'7200'}});};
 const stale=await readNews();assert.equal(calls,4);assert.equal(stale.status,'stale');assert.equal(stale.provider,'Currents');assert.equal(stale.fetchedAt,success.fetchedAt);assert.equal(stale.articles.length,1);assert.equal('lastError' in stale,false);
 await Promise.all(Array.from({length:5},()=>readNews()));assert.equal(calls,4);
 const row=await database.prepare("select payload from provider_cache where key='pm:news:v1'").first<{payload:string}>();assert.ok(Date.parse(JSON.parse(row!.payload).nextRefreshAt)>Date.now()+7100000);
 }finally{globalThis.fetch=original;delete process.env.CURRENTS_API_KEY;databaseClient().close();}
});
