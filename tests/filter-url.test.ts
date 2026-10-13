import test from 'node:test';
import assert from 'node:assert/strict';
import {readFilterUrl,writeFilterUrl} from '../lib/filter-url';
const defaults={team:'all',venue:'all',opponent:'all',minMinutes:0,minGames:5,minRate:0,minLine:0,maxLine:200,market:'all',windowSize:10,side:'over',sort:'rate'};
test('default filters add no query string and every non-default filter survives sharing',()=>{const q=new URLSearchParams();writeFilterUrl(q,defaults,defaults);assert.equal(q.toString(),'');const changed={team:'PHI',venue:'home',opponent:'BOS',minMinutes:20,minGames:3,minRate:50,minLine:10,maxLine:35,market:'rebounds',windowSize:5,side:'under',sort:'name'};writeFilterUrl(q,changed,defaults);assert.ok(!q.has('filters'));assert.equal(q.get('last'),'5');assert.deepEqual(readFilterUrl(q,defaults),changed);});
test('existing JSON filter links remain readable; explicit short fields take precedence',()=>{const q=new URLSearchParams({filters:JSON.stringify({...defaults,opponent:'BOS',windowSize:20}),last:'5'});assert.deepEqual(readFilterUrl(q,defaults),{...defaults,opponent:'BOS',windowSize:5});assert.deepEqual(readFilterUrl(new URLSearchParams({filters:'broken'}),defaults),defaults);});
