import test from 'node:test';
import assert from 'node:assert/strict';
import {courtShotDetails} from '../lib/court-shot-details';
import type {BoxData} from '../lib/live-boxscore';
import {recentCourt} from '../lib/recent-court';
const teams=[{code:'MIA',players:[{id:'1',name:'Player',fieldGoals:'5-12',threes:'2-6',freeThrows:'1-2',didNotPlay:false}]}] as BoxData['teams'];
function shot(value:1|2|3){return recentCourt([{id:'s',text:'Player makes shot',period:1,clock:'3:00',awayScore:1,homeScore:0,team:'MIA',athleteId:'1',shot:{value,made:true}}],['MIA','NYK']).shot;}
test('court card derives two-pointers by subtracting three-pointers, and keeps each category separate',()=>{assert.deepEqual(courtShotDetails(shot(2),teams)?.attempts,[3,6]);assert.equal(courtShotDetails(shot(2),teams)?.percentage,50);assert.deepEqual(courtShotDetails(shot(3),teams)?.attempts,[2,6]);assert.deepEqual(courtShotDetails(shot(1),teams)?.attempts,[1,2]);});
test('court card never assigns an athlete to the wrong team or invents a percentage',()=>{const s=shot(3)!;assert.equal(courtShotDetails({...s,play:{...s.play,team:'NYK'}},[...teams,{code:'NYK',players:[]}] as BoxData['teams'])?.person,null);const empty=[{...teams[0],players:[{...teams[0].players[0],threes:'0-0'}]}];assert.equal(courtShotDetails(s,empty)?.percentage,null);assert.equal(courtShotDetails(null,teams),null);});
