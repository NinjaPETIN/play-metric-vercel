import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProfile} from '../lib/player-profile';
test('official profile data is bounded and belongs to the requested identity',()=>{
 const body={resultSets:[{name:'CommonPlayerInfo',headers:['PERSON_ID','POSITION','BIRTHDATE','COUNTRY'],rowSet:[[2544,'Forward','1984-12-30T00:00:00','USA']]}]};
 const profile=parseProfile('2544',body);assert.equal(profile.position,'Forward');assert.equal(profile.birthYear,1984);assert.equal(profile.country,'USA');assert.throws(()=>parseProfile('999',body));assert.throws(()=>parseProfile('2544',{resultSets:'malformed'}));assert.throws(()=>parseProfile('2544',{resultSets:[]}));
});
