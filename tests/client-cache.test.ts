import test from 'node:test';
import assert from 'node:assert/strict';
import {DataReadError,loadCachedData,readCachedData,seedCachedData,safePublicPayload,canUseSavedRead} from '../lib/client-data-cache';
import {forceNbaRead} from '../lib/read-cache';
test('reload headers explicitly request a fresh server read',()=>{
 const req=(headers:HeadersInit)=>new Request('https://example.test/api/nba/calendar',{headers});assert.equal(forceNbaRead(req({})),false);assert.equal(forceNbaRead(req({'x-playmetric-refresh':'1'})),true);assert.equal(forceNbaRead(req({'cache-control':'no-cache'})),true);assert.equal(forceNbaRead(req({'cache-control':'no-store'})),true);
});

test('a stalled read expires, releases the shared request and can be retried',async t=>{
 const original=globalThis.fetch;
 const url='/api/v1/players?detail=list&timeout-regression=1';
 t.mock.timers.enable({apis:['setTimeout']});
 try{
  let calls=0;
  globalThis.fetch=async(_input,options)=>{
   calls++;
   return new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
  };
  const first=loadCachedData(url),second=loadCachedData(url);
  const rejected=Promise.all([first,second].map(request=>assert.rejects(request,error=>error instanceof DataReadError&&error.status===408)));
  assert.equal(calls,1);
  t.mock.timers.tick(20_000);
  await rejected;
  assert.equal(readCachedData(url),null);
  globalThis.fetch=async()=>Response.json({revision:3});
  assert.deepEqual(await loadCachedData(url),{revision:3});
 }finally{globalThis.fetch=original;t.mock.timers.reset();}
});
test('browser reload bypasses an older pending request without letting it replace fresh data',async()=>{
 const original=globalThis.fetch;let finish!:(response:Response)=>void;const url='/api/v1/players?detail=list&cache-regression=1';
 try{globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});const old=loadCachedData<{revision:number}>(url);
 globalThis.fetch=async(_input,options)=>{assert.equal(options?.cache,'no-store');assert.equal(new Headers(options?.headers).get('x-playmetric-refresh'),'1');return Response.json({revision:2});};
 assert.equal((await loadCachedData<{revision:number}>(url,true)).revision,2);finish(Response.json({revision:1}));await old;assert.equal(readCachedData<{revision:number}>(url)?.revision,2);
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({revision:calls});};await Promise.all([loadCachedData('/api/v1/players/9999'),loadCachedData('/api/v1/players/9999')]);assert.equal(calls,2);assert.equal(readCachedData('/api/v1/players/9999'),null);
 }finally{globalThis.fetch=original;}
});

test('private and entitled collection reads never share an in-flight response across account transitions',async()=>{
 const original=globalThis.fetch,finish:((response:Response)=>void)[]=[];
 try{globalThis.fetch=()=>new Promise(resolve=>finish.push(resolve));
 const url='/api/v1/players?private-collection=1',first=loadCachedData(url),second=loadCachedData(url);assert.equal(finish.length,2);
 finish[0](Response.json({players:[{id:'1',games:[{points:30}]}]}));finish[1](Response.json({players:[{id:'2',games:[{points:10}]}]}));await Promise.all([first,second]);assert.equal(readCachedData(url),null);
 seedCachedData('/api/account/workspace',{note:'private'});assert.equal(readCachedData('/api/account/workspace'),null);
 assert.equal(safePublicPayload('/api/v1/players',{players:[{games:[],traits:{private:true}}]}),false);
 }finally{globalThis.fetch=original;}
});
test('public snapshots retain their date for bounded offline fallback and never bypass a denial',async t=>{
 let now=2_000_000_000_000;t.mock.method(Date,'now',()=>now);const url='/api/v1/players?detail=list&offline=1';
 seedCachedData(url,{players:[{id:'1',games:[]}],fetchedAt:'2026-11-27T12:00:00Z'});now+=360000;
 assert.equal(readCachedData(url),null);assert.equal(readCachedData<{fetchedAt:string}>(url,86400000)?.fetchedAt,'2026-11-27T12:00:00Z');
 for(const status of [401,403,404,429])assert.equal(canUseSavedRead(new DataReadError(status,'denied')),false);
 assert.equal(canUseSavedRead(new DataReadError(503,'outage')),true);now+=86400000;assert.equal(readCachedData(url,86400000),null);
});
