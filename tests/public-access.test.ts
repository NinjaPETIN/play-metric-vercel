import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicRead,publicCatalog,SAMPLE_PLAYER_ID} from '../lib/public-access';
test('public access permits one example and catalog, never arbitrary histories or Pro context',()=>{
 const url='https://example.com/api/v1/players?competition=regular';
 assert.equal(publicRead(['players'],url),true);
 assert.equal(publicRead(['players',SAMPLE_PLAYER_ID],url),true);
 assert.equal(publicRead(['players','999'],url),false);
 assert.equal(publicRead(['players',SAMPLE_PLAYER_ID,'league-context'],url),false);
 assert.equal(publicRead(['players',SAMPLE_PLAYER_ID],url.replace('regular','playoffs')),false);
 assert.equal(publicRead(['teams','LAL','games'],url),false);
 assert.equal(publicRead(['unknown'],url),false);
});
test('public catalogs strip game arrays, profiles and Pro sources even for alternate query formats',()=>{
 const d=publicCatalog({players:[{id:'999',name:'Player',team:'LAL',games:[{played:true,minutes:20,points:10}],traits:{secret:1},profile:{private:1},leagueContext:{rank:1}}],gameFields:['points']});
 assert.deepEqual(d.players[0].games,[]);assert.equal(d.players[0].traits,null);assert.equal(d.players[0].profile,null);assert.equal(d.players[0].leagueContext,null);assert.equal('gameFields' in d,false);assert.equal(d.players[0].seasonPoints.average,10);
});
