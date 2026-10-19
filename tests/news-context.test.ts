import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNews,newsSource,newsFeedStatus} from '../lib/news';
import {summarizeCatalogPlayer,defaultCatalogOptions} from '../lib/catalog-summary';
import type {Player} from '../lib/data';
import {database,databaseClient} from '../lib/database-env';
import {readNews} from '../lib/news-store';
process.env.TURSO_DATABASE_URL='file::memory:';
const now=Date.parse('2026-10-19T12:00:00Z'),directory=[{id:'1629029',name:'Luka Dončić'},{id:'2544',name:'LeBron James'}];
const article={url:'https://www.nba.com/news/luka?utm_source=example',title:'Luka Doncic injury update before the next NBA game',seendate:'20261019T110000Z',language:'English'};
test('news keeps attributed links, full-name identities and indexing dates; strips tracking and rejects unsafe publishers',()=>{
 const articles=normalizeNews({articles:[article,{...article,url:'https://nba.com/news/luka2'},{...article,url:'javascript:alert(1)'},{...article,url:'https://nba.com.evil.test/news'},{...article,title:'James has news',url:'https://nba.com/news/other'},{...article,seendate:'20271019T110000Z'}]},directory,now);
 assert.equal(articles.length,1);assert.deepEqual(articles[0].playerIds,['1629029']);assert.equal(articles[0].url,'https://www.nba.com/news/luka');assert.equal(articles[0].category,'availability');assert.equal(articles[0].indexedAt,'2026-10-19T11:00:00Z');assert.equal(newsSource('https://nba.com@evil.test/news'),null);assert.equal(newsSource('https://nba.com:8443/news'),null);assert.equal(newsSource('https://127.0.0.1/news'),null);assert.equal(newsSource('http://nba.com/news'),null);
 assert.throws(()=>normalizeNews({error:'rate limited'},directory,now));assert.equal(normalizeNews({articles:[]},directory,now).length,0);
});
test('news never treats old or failed refreshes as current',()=>{assert.equal(newsFeedStatus({fetchedAt:null,lastAttempt:'failed'},now),'unavailable');assert.equal(newsFeedStatus({fetchedAt:'2026-10-19T11:50:00Z',lastAttempt:'ready'},now),'ready');assert.equal(newsFeedStatus({fetchedAt:'2026-10-19T11:50:00Z',lastAttempt:'failed'},now),'stale');assert.equal(newsFeedStatus({fetchedAt:'2026-10-18T11:50:00Z',lastAttempt:'ready'},now),'stale');});
test('context compares disjoint complete windows and preserves missing-data semantics',()=>{
 const p={games:Array.from({length:20},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,'0')}`,played:true,minutes:i<10?20:30,points:i<10?10:25,assists:5,rebounds:4,threes:2,home:true,opponent:'BOS'})),lines:{points:20.5}} as Player;
 const stat=summarizeCatalogPlayer(p,{...defaultCatalogOptions,last:10}).points!;assert.equal(stat.comparison?.averageDelta,15);assert.equal(stat.comparison?.minutesDelta,10);assert.equal(stat.comparison?.recentN,10);assert.equal(stat.comparison?.previousN,10);assert.equal(stat.comparison?.from,'2026-01-11');
 assert.equal(summarizeCatalogPlayer(p,{...defaultCatalogOptions,last:20}).points!.comparison,null);assert.equal(summarizeCatalogPlayer(p,{...defaultCatalogOptions,last:0}).points!.comparison,null);assert.equal(summarizeCatalogPlayer(p,{...defaultCatalogOptions,last:10,market:'steals'}).steals!.comparison,null);
});
test('persistent shared refresh lease bounds concurrent requests; failures retain cache and do not become healthy',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();const original=globalThis.fetch;let calls=0;
 try{
 const timestamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
 globalThis.fetch=async()=>{calls++;return Response.json({articles:[{...article,seendate:timestamp}]});};
 const feeds=await Promise.all(Array.from({length:6},()=>readNews()));assert.equal(calls,1);assert.ok(feeds.some(f=>f.status==='ready'&&f.articles.length===1));
 const successful=await readNews();assert.equal(successful.status,'ready');assert.equal(calls,1);
 const prior={articles:successful.articles,fetchedAt:successful.fetchedAt,checkedAt:'2000-01-01T00:00:00.000Z',lastAttempt:'ready'};
 await database.prepare('update provider_cache set payload=? where key=?').bind(JSON.stringify(prior),'pm:news:v1').run();await database.prepare('update provider_cache set expires_at=? where key=?').bind('2000-01-01T00:00:00.000Z','pm:news:lease:v1').run();
 globalThis.fetch=async()=>{calls++;return new Response('Limited',{status:429});};const failed=await readNews();assert.equal(failed.status,'stale');assert.equal(failed.articles.length,1);assert.equal(failed.fetchedAt,successful.fetchedAt);assert.equal(failed.lastAttempt,'failed');await readNews();assert.equal(calls,2);
 }finally{globalThis.fetch=original;databaseClient().close();}
});
