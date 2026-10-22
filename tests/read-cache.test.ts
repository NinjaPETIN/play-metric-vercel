import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cachedNbaRead,clearNbaReadCache} from '../lib/read-cache';
test('large catalogs share work; only normal expired reads may fall back to stale data',async context=>{
 clearNbaReadCache();let now=Date.now();context.mock.method(Date,'now',()=>now);let calls=0;
 const read=async()=>{calls++;return {payload:'x'.repeat(2_000_000)};};
 await Promise.all(Array.from({length:8},()=>cachedNbaRead('catalog',read)));await cachedNbaRead('catalog',read);assert.equal(calls,1);
 now+=60_001;
 const outage=async()=>{throw Error('temporary database outage');};
 const fallback=await cachedNbaRead('catalog',outage);assert.equal((fallback as {dataStale?:boolean}).dataStale,true);
 await assert.rejects(()=>cachedNbaRead('catalog',outage,true),/temporary database outage/);
 const denied=async()=>{throw Object.assign(Error('denied'),{status:403});};
 await assert.rejects(()=>cachedNbaRead('catalog',denied),/denied/);await assert.rejects(()=>cachedNbaRead('catalog',denied,true),/denied/);
});
