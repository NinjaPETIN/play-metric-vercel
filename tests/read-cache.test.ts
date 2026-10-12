import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cachedNbaRead,clearNbaReadCache} from '../lib/read-cache';
test('large catalogs are cached and simultaneous reads share work',async()=>{clearNbaReadCache();let calls=0;const read=async()=>{calls++;return {payload:'x'.repeat(2_000_000)}};await Promise.all(Array.from({length:8},()=>cachedNbaRead('catalog',read)));await cachedNbaRead('catalog',read);assert.equal(calls,1);const fallback=await cachedNbaRead('catalog',async()=>{throw Error('temporary database outage')},true);assert.equal((fallback as {dataStale?:boolean}).dataStale,true);await assert.rejects(cachedNbaRead('catalog',async()=>{throw Object.assign(Error('denied'),{status:403})},true));});
