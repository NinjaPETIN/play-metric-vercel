import test from 'node:test';
import assert from 'node:assert/strict';
import {requestCurrents,requestGdelt,retryAfterMs,NewsProviderError} from '../lib/news-providers';
import {normalizeNews} from '../lib/news';
const at=Date.parse('2026-11-03T22:00:00Z');
test('Currents sends credentials only to its fixed HTTPS origin and stores bounded headline metadata with real publication times',async()=>{
 const original=globalThis.fetch,token='test-key-only-not-a-real-token';let url='',authorization='';
 try{globalThis.fetch=async(input,init)=>{url=String(input);authorization=(init?.headers as Record<string,string>).Authorization;assert.equal(init?.redirect,'error');return Response.json({status:'ok',news:[{title:'LeBron James injury update before NBA game',url:'https://www.infobae.com/deportes/nba/lebron',published:'2026-11-03 20:00:00 +0000',language:'es',description:'Must not be republished',image:'https://example.test/photo.jpg'},{title:'Invalid',url:'https://www.nba.com/news/invalid',published:'invalid'}]});};
 const raw=await requestCurrents(token,'es',at);assert.equal(authorization,'Bearer '+token);const request=new URL(url);assert.equal(request.origin,'https://api.currentsapi.services');assert.equal(request.pathname,'/v1/search');assert.equal(request.searchParams.get('language'),'es');assert.equal(request.searchParams.get('page_size'),'20');assert.equal(url.includes(token),false);assert.equal(raw.articles.length,1);assert.equal(raw.articles[0].publishedAt,'2026-11-03T20:00:00.000Z');assert.equal('description' in raw.articles[0],false);assert.equal(raw.articles[0].image,'https://example.test/photo.jpg');
 const articles=normalizeNews(raw,[{id:'2544',name:'LeBron James'}],at);assert.equal(articles[0].language,'Spanish');assert.equal(articles[0].publishedAt,'2026-11-03T20:00:00.000Z');assert.deepEqual(articles[0].playerIds,['2544']);
 assert.equal(normalizeNews({articles:[{...raw.articles[0],publishedAt:'2020-01-01T00:00:00Z'}]},[],at).length,0);
 }finally{globalThis.fetch=original;}
});
test('provider backoff honors seconds and HTTP dates, bounds unsafe values and never leaks response bodies or API keys',async()=>{
 assert.equal(retryAfterMs('7200',at),7200000);assert.equal(retryAfterMs(new Date(at+1800000).toUTCString(),at),1800000);assert.equal(retryAfterMs('nonsense',at),3600000);assert.equal(retryAfterMs('999999999',at),86400000);assert.equal(retryAfterMs('0',at),900000);
 const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response('Sensitive provider detail',{status:429,headers:{'retry-after':'7200'}});await assert.rejects(()=>requestCurrents('private-test-key-123456','en',at),(e:unknown)=>e instanceof NewsProviderError&&e.code==='http_429'&&e.retryMs===7200000&&!e.message.includes('Sensitive'));
 globalThis.fetch=async()=>new Response('not json',{headers:{'content-type':'application/json'}});await assert.rejects(()=>requestGdelt(at),(e:unknown)=>e instanceof NewsProviderError&&e.code==='invalid_json');
 globalThis.fetch=async()=>Response.json({status:'error',news:[]});await assert.rejects(()=>requestCurrents('private-test-key-123456','en',at),(e:unknown)=>e instanceof NewsProviderError&&e.code==='invalid_payload');
 }finally{globalThis.fetch=original;}
});
