import test from 'node:test';
import assert from 'node:assert/strict';
import {entitledDashboard} from '../lib/data-entitlements';
import {compactDashboard} from '../lib/compact-dashboard';
const data={players:[{id:'999',name:'Player',team:'PHI',games:[{played:true,minutes:20,points:10,rebounds:2,assists:3,threes:1,date:'2026-01-01',opponent:'BOS',home:true}],traits:{sources:{shots:{private:true},zones:{allowed:true}}},profile:{id:'999'},leagueContext:{rank:1}}]};
test('free collection responses strip full histories in normal and compact formats, regardless of prior authorized IDs',()=>{
 for(const source of [data,compactDashboard(data)]){const result=entitledDashboard(source,{individual:false,example:false,pro:false});assert.deepEqual(result.players[0].games,[]);assert.equal(result.publicPreview,true);assert.equal(result.players[0].traits,null);assert.equal(result.players[0].leagueContext,null);assert.equal('gameFields' in result,false);assert.equal(result.players[0].seasonPoints.average,10);}
 assert.equal(data.players[0].games.length,1);
});
test('an authorized individual, the public example and Pro collections retain allowed histories',()=>{
 const free=entitledDashboard(data,{individual:true,example:false,pro:false});assert.equal(free.players[0].games.length,1);assert.equal(free.players[0].leagueContext,null);assert.equal(free.players[0].traits.sources.shots,null);
 assert.equal(entitledDashboard(data,{individual:true,example:true,pro:false}).players[0].games.length,1);
 assert.equal(entitledDashboard(data,{individual:false,example:false,pro:true}).players[0].games.length,1);
});
