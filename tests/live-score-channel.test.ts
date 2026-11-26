import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveScoreChannel} from '../lib/live-score-channel';
import type {LiveFeed} from '../lib/live-scores';
const feed:LiveFeed={provider:'ESPN',status:'ready',games:[],fetchedAt:'2026-11-25T23:00:00Z',checkedAt:'2026-11-25T23:00:00Z'};
function fixture(){
 let now=Date.parse(feed.fetchedAt!),visible=true;
 const jobs=new Map<number,{callback:()=>void;delay:number}>(),visibility=new Set<()=>void>();let id=0;
 const requests:{signal:AbortSignal;resolve:(feed:LiveFeed)=>void;reject:(error:Error)=>void}[]=[];
 const channel=createLiveScoreChannel({now:()=>now,visible:()=>visible,onVisibility(listener){visibility.add(listener);return()=>{visibility.delete(listener);};},schedule(callback,delay){const key=++id;jobs.set(key,{callback,delay});return()=>{jobs.delete(key);};},read(signal){return new Promise<LiveFeed>((resolve,reject)=>requests.push({signal,resolve,reject}));}});
 return {channel,requests,jobs,visibility,advance(ms:number){now+=ms;},run(delay:number){const job=[...jobs].find(([,job])=>job.delay===delay);assert.ok(job,'scheduled delay '+delay);jobs.delete(job[0]);job[1].callback();},setVisible(value:boolean){visible=value;for(const listener of visibility)listener();}};
}
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
test('scoreboard consumers share one request and polling timer; the last unsubscribe stops all work',async()=>{
 const f=fixture();let first=0,second=0;const off1=f.channel.subscribe(()=>first++),off2=f.channel.subscribe(()=>second++);
 assert.equal(f.jobs.size,1);assert.equal(f.visibility.size,1);f.run(0);assert.equal(f.requests.length,1);
 f.requests[0].resolve(feed);await settle();assert.equal(f.channel.getSnapshot().feed,feed);assert.equal(first,second);assert.equal(f.jobs.size,1);
 f.run(5000);off1();assert.equal(f.requests[1].signal.aborted,false);off2();assert.equal(f.requests[1].signal.aborted,true);assert.equal(f.jobs.size,0);assert.equal(f.visibility.size,0);assert.equal(f.channel.getSnapshot().feed,null);
});
test('hidden tabs stop polling and resume once without overlapping requests',async()=>{
 const f=fixture(),off=f.channel.subscribe(()=>{});f.setVisible(false);assert.equal(f.requests.length,0);assert.equal(f.jobs.size,0);
 f.setVisible(true);assert.equal(f.requests.length,1);f.setVisible(true);assert.equal(f.requests.length,1);
 f.setVisible(false);f.requests[0].resolve(feed);await settle();assert.equal(f.jobs.size,0);f.setVisible(true);assert.equal(f.requests.length,2);off();
});
test('late responses from an abandoned subscription cannot overwrite a new channel generation',async()=>{
 const f=fixture(),off=f.channel.subscribe(()=>{});f.run(0);off();const off2=f.channel.subscribe(()=>{});f.run(0);
 f.requests[0].resolve({...feed,status:'stale'});await settle();assert.equal(f.channel.getSnapshot().feed,null);
 f.requests[1].resolve(feed);await settle();assert.equal(f.channel.getSnapshot().feed,feed);off2();
});
test('a failed refresh keeps the original data timestamp and marks the shared snapshot failed',async()=>{
 const f=fixture(),off=f.channel.subscribe(()=>{});f.run(0);f.requests[0].resolve(feed);await settle();f.advance(100000);f.run(5000);f.requests[1].reject(Error('offline'));await settle();
 const current=f.channel.getSnapshot();assert.equal(current.failed,true);assert.equal(current.feed?.fetchedAt,feed.fetchedAt);assert.equal(current.now,Date.parse(feed.fetchedAt!)+100000);assert.equal(f.jobs.size,1);off();
});
test('a stalled read expires and releases the channel for a new request',async()=>{
 const f=fixture(),off=f.channel.subscribe(()=>{});f.run(0);f.run(25000);assert.equal(f.requests[0].signal.aborted,true);
 f.requests[0].reject(new DOMException('Aborted','AbortError'));await settle();assert.equal(f.channel.getSnapshot().failed,true);
 f.run(5000);assert.equal(f.requests.length,2);f.requests[1].resolve(feed);await settle();assert.equal(f.channel.getSnapshot().failed,false);off();
});
