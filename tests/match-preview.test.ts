import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMatchPreview} from '../lib/match-preview';
import type {Calendar} from '../lib/nba-snapshot';
import type {Player} from '../lib/data';
const match:Calendar['games'][number]={id:'0022600200',date:'2026-11-04',startsAt:'2026-11-05T00:00:00Z',away:'OKC',home:'CLE',awayName:'Oklahoma City Thunder',homeName:'Cleveland Cavaliers',awayId:1,homeId:2,competition:'regular',status:1,statusText:'Por jugar',awayScore:null,homeScore:null};
const final={...match,id:'0022600100',date:'2026-11-02',startsAt:'2026-11-03T00:00:00Z',status:3,awayScore:50,homeScore:40};
const calendar:Calendar={source:'nba_api',season:2026,fetchedAt:'2026-11-03T01:00:00Z',games:[final,match]};
function players():Player[]{return ['OKC','CLE'].flatMap((team,t)=>Array.from({length:5},(_,i)=>({id:String(t*10+i+1),name:team+' Player '+i,team,currentTeam:team,position:'',color:'',base:[0,0,0,0],lines:{},games:[{gameId:final.id,team,date:final.date,opponent:team==='OKC'?'CLE':'OKC',home:team==='CLE',played:true,minutes:20,points:team==='OKC'?10:8,rebounds:team==='OKC'?2:3,assists:team==='OKC'?3:1,threes:0}]} as Player)));}
test('prematch aggregates only verified complete team records and returns bounded public summaries',()=>{
 const result=buildMatchPreview(calendar,match,players(),'2026-11-03T01:00:00Z');
 assert.deepEqual(result.teams.map(t=>[t.points,t.rebounds,t.assists,t.boxGames]),[[50,10,15,1],[40,15,5,1]]);
 assert.equal(result.teams[0].leader?.points,10);assert.equal(result.meetings.length,1);
 const serialized=JSON.stringify(result);for(const key of ['"games"','"lines"','"traits"','"profile"','"leagueContext"'])assert.equal(serialized.includes(key),false);
});
test('incomplete, duplicate and wrong-team player records do not invent complete box-score averages',()=>{
 const incomplete=players().slice(1),a=buildMatchPreview(calendar,match,incomplete,null);
 assert.equal(a.teams[0].points,50);assert.equal(a.teams[0].rebounds,null);assert.equal(a.teams[0].assists,null);assert.equal(a.teams[0].leader,null);
 const duplicate=players();duplicate.push(duplicate[0]);assert.equal(buildMatchPreview(calendar,match,duplicate,null).teams[0].boxGames,0);
 const wrong=players();wrong[0].games[0].team='BOS';assert.equal(buildMatchPreview(calendar,match,wrong,null).teams[0].boxGames,0);
});
test('future and other-competition games never enter the preview; traded players keep historical team totals',()=>{
 const later={...final,id:'0022600300',date:'2026-11-06',startsAt:'2026-11-07T00:00:00Z',awayScore:150};
 const pre={...final,id:'0012600100',competition:'preseason' as const,awayScore:160};
 const p=players();p[0].currentTeam='BOS';
 const result=buildMatchPreview({...calendar,games:[...calendar.games,later,pre]},match,p,null);
 assert.equal(result.teams[0].n,1);assert.equal(result.teams[0].points,50);assert.equal(result.teams[0].rebounds,10);assert.notEqual(result.teams[0].leader?.id,p[0].id);
 const empty=buildMatchPreview({...calendar,games:[match]},match,[],null);
 assert.deepEqual(empty.teams.map(t=>[t.points,t.rebounds,t.assists,t.leader]),[[null,null,null,null],[null,null,null,null]]);
});
