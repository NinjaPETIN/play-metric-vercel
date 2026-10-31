import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNbaBoxscore,preferredBoxscore} from '../collector/nba_boxscore.mjs';
import {snapshotSchema} from '../lib/nba-snapshot';
import {mergeFinishedGames} from '../collector/free_source.mjs';
const game={id:'0022600144',date:'2026-10-29',startsAt:'2026-10-29T23:00:00Z',home:'ATL',away:'BOS',homeId:1,awayId:2,competition:'regular'};
function team(teamTricode:string,teamId:number){return {teamTricode,teamId,score:100,players:Array.from({length:5},(_,i)=>({personId:teamId*10+i,name:`Player ${teamId}-${i}`,played:'1',statistics:{minutes:'PT48M00.00S',points:20,reboundsTotal:5,assists:3,threePointersMade:2,steals:1,blocks:1,turnovers:2,fieldGoalsMade:7,fieldGoalsAttempted:12,threePointersAttempted:4,freeThrowsMade:4,freeThrowsAttempted:5,reboundsOffensive:1,reboundsDefensive:4}}))};}
function payload(){const homeTeam=team('ATL',1),awayTeam=team('BOS',2);awayTeam.score=90;for(const p of awayTeam.players){p.statistics.points=18;p.statistics.freeThrowsMade=2;}return {game:{gameId:game.id,gameStatus:3,gameTimeUTC:'2026-10-29T23:00:00Z',homeTeam,awayTeam}};}
test('NBA official box scores retain NBA IDs, exact minutes, final totals and snapshot compatibility',()=>{
 const p=payload();p.game.homeTeam.players[0].statistics.minutes='PT25M40.00S';
 const result=normalizeNbaBoxscore(p,game,2026);assert.equal(result.players.length,10);assert.equal(result.players[0].id,10);assert.equal(result.players[0].game.minutes,25+40/60);assert.equal(result.teamGame.awayScore,90);
 assert.ok(snapshotSchema.safeParse(mergeFinishedGames(null,[result],2026,'regular')).success);
});
test('NBA source rejects live games, mismatched IDs, teams, dates and incomplete totals',()=>{
 for(const mutate of [(p:ReturnType<typeof payload>)=>p.game.gameStatus=2,(p:ReturnType<typeof payload>)=>p.game.gameId='0022600999',(p:ReturnType<typeof payload>)=>p.game.homeTeam.teamId=3,(p:ReturnType<typeof payload>)=>p.game.gameTimeUTC='2026-10-28T23:00:00Z',(p:ReturnType<typeof payload>)=>p.game.homeTeam.players.pop(),(p:ReturnType<typeof payload>)=>p.game.homeTeam.players[0].statistics.reboundsTotal=99,(p:ReturnType<typeof payload>)=>p.game.homeTeam.players[0].personId=11]){
  const p=payload();mutate(p);assert.throws(()=>normalizeNbaBoxscore(p,game,2026));
 }
});
test('blocked official source falls back, stops after two failures and does not swallow backup failures',async()=>{
 const state={verified:0,failures:0,fallback:0,unavailable:false};let calls=0;
 const official=async()=>{calls++;throw Error('HTTP 403');},backup=async()=>normalizeNbaBoxscore(payload(),game,2026);
 for(let i=0;i<4;i++)assert.equal((await preferredBoxscore(game,2026,official,backup,state)).teamGame.id,game.id);
 assert.equal(calls,2);assert.equal(state.fallback,4);assert.equal(state.unavailable,true);
 await assert.rejects(preferredBoxscore(game,2026,official,async()=>{throw Error('Backup unavailable');},state));
 const ready={verified:0,failures:0,fallback:0,unavailable:false};
 await preferredBoxscore(game,2026,async()=>payload(),async()=>{throw Error('Must not call fallback');},ready);assert.equal(ready.verified,1);assert.equal(ready.fallback,0);
});
