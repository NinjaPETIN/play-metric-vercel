import test from 'node:test';
import assert from 'node:assert/strict';
import {matchContext} from '../lib/calendar-context';
import type {Calendar} from '../lib/nba-snapshot';
type Game=Calendar['games'][number];
const match:Game={id:'0022600100',date:'2026-11-05',startsAt:'2026-11-06T00:00:00Z',home:'IND',away:'BKN',homeId:1,awayId:2,homeName:'Indiana',awayName:'Brooklyn',homeScore:null,awayScore:null,competition:'regular',status:1,statusText:''};
const result=(id:string,date:string,changes:Partial<Game>={}):Game=>({...match,id,date,startsAt:date+'T23:00:00Z',status:3,homeScore:90,awayScore:100,...changes});
test('preview uses only earlier completed games in the same competition; wins and rest use the actual team side',()=>{
 const games=[result('1','2026-11-02'),result('2','2026-11-03',{home:'BKN',away:'IND',homeScore:105,awayScore:100}),result('3','2026-11-04',{competition:'preseason'}),result('4','2026-11-04',{status:2}),result('5','2026-11-07'),result('6','2026-11-04',{homeScore:null})];
 const c=matchContext(games,match);assert.deepEqual(c.teams.map(t=>t.form),[['V','V'],['D','D']]);assert.deepEqual(c.teams.map(t=>t.restDays),[1,1]);assert.equal(c.meetings,2);assert.equal(c.awayWins,2);assert.equal(c.homeWins,0);
 assert.equal(games[0].id,'1');
});
test('missing history stays unknown and only the last five games appear in chronological form',()=>{
 assert.deepEqual(matchContext([],match).teams.map(t=>[t.form,t.restDays]),[[[],null],[[],null]]);
 const c=matchContext(Array.from({length:7},(_,i)=>result(String(i),'2026-10-'+String(20+i).padStart(2,'0'),{awayScore:i===6?80:100})),match);
 assert.deepEqual(c.teams[0].form,['V','V','V','V','D']);assert.equal(c.meetings,7);assert.equal(c.awayWins,6);
});
