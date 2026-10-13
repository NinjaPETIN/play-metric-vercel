import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedNbaRead} from '../lib/scoped-nba-read';
import {PlanError} from '../lib/account-plan';
const data={players:[{id:'999',name:'Player',team:'PHI',games:[{played:true,minutes:20,points:10}]}]};
const url='https://example.test/api/v1/players';
test('free users cannot retrieve histories through collections, while individual requests must authorize before data is read',async()=>{
 let authorizations=0,reads=0;const deps={user:async()=>({id:'test'}),plan:async()=>({plan:'free'}),authorize:async()=>{authorizations++;throw new PlanError(429,'Limit');},read:async()=>{reads++;return data;}};
 for(const path of [['players'],['teams','PHI'],['games','0022500001']]){const result=await scopedNbaRead(path,url,deps);assert.deepEqual(result.players[0].games,[]);}
 assert.equal(authorizations,0);assert.equal(reads,3);
 await assert.rejects(scopedNbaRead(['players','999'],url,deps),(e:unknown)=>e instanceof PlanError&&e.status===429);assert.equal(reads,3);
 const allowed=await scopedNbaRead(['players','999'],url,{...deps,authorize:async()=>({plan:'free'})});assert.equal(allowed.players[0].games.length,1);
});
test('anonymous/private and non-Pro requests fail before reading; Pro collections and the fixed public example work',async()=>{
 let reads=0;const deps={user:async()=>null,plan:async()=>({plan:'free'}),authorize:async()=>({plan:'free'}),read:async()=>{reads++;return data;}};
 await assert.rejects(scopedNbaRead(['players','999'],url,deps));assert.equal(reads,0);
 await assert.rejects(scopedNbaRead(['players','2544','league-context'],url,deps));assert.equal(reads,0);
 const sample=await scopedNbaRead(['players','2544'],url,deps);assert.equal(sample.players[0].games.length,1);
 const pro=await scopedNbaRead(['teams','PHI'],url,{...deps,user:async()=>({id:'test'}),plan:async()=>({plan:'pro'})});assert.equal(pro.players[0].games.length,1);
});
