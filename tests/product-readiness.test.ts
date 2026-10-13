import test from 'node:test';
import assert from 'node:assert/strict';
import {identityIndex,normalizeFinishedGame,mergeFinishedGames} from '../collector/free_source.mjs';
import {snapshotSchema} from '../lib/nba-snapshot';
import {dataFeedHealth} from '../lib/data-health';
import {followChanges} from '../lib/following-changes';
import {betaFeedbackSchema} from '../lib/beta-feedback';
const labels=['MIN','PTS','FG','3PT','FT','REB','AST','TO','STL','BLK','OREB','DREB'];
const persons=Array.from({length:10},(_,i)=>({id:i+1,name:'Synthetic Player '+i}));
function block(team:string,offset:number,points:number){return {team:{abbreviation:team},statistics:[{labels,athletes:Array.from({length:5},(_,i)=>({athlete:{displayName:persons[offset+i].name},didNotPlay:false,stats:['48',String(points),'5-10','2-4',(points-12)+'-10','5','6','1','1','1','1','4']}))}]};}
const event={date:'2026-10-12T23:00:00Z',status:{type:{completed:true}},competitions:[{competitors:[{homeAway:'home',team:{abbreviation:'ATL'},score:'100'},{homeAway:'away',team:{abbreviation:'BOS'},score:'90'}]}]};
const calendar={season:2026,games:[{id:'0012600001',date:'2026-10-12',home:'ATL',away:'BOS',competition:'preseason'}]};
const summary={boxscore:{players:[block('ATL',0,20),block('BOS',5,18)]}};
test('free fallback reconciles exact NBA identities, games and both team point totals',()=>{
 const d=normalizeFinishedGame(event,summary,calendar,identityIndex(persons));assert.equal(d.players.length,10);assert.equal(d.players[0].game.gameId,'0012600001');assert.equal(d.players[0].game.minutes,48);assert.equal(d.teamGame.awayScore,90);
 const first=mergeFinishedGames(null,[d],2026,'preseason');assert.ok(snapshotSchema.safeParse(first).success);const twice=mergeFinishedGames(first,[d],2026,'preseason');assert.equal(twice.players[0].games.length,1);assert.equal(twice.teamGames.length,1);assert.equal(first.players[0].games.length,1);
 assert.throws(()=>normalizeFinishedGame({...event,status:{type:{completed:false}}},summary,calendar,identityIndex(persons)));
 assert.throws(()=>normalizeFinishedGame(event,summary,calendar,identityIndex(persons.slice(1))));
 assert.throws(()=>normalizeFinishedGame(event,summary,{...calendar,games:[...calendar.games,...calendar.games]},identityIndex(persons)));
 const wrong=structuredClone(summary);wrong.boxscore.players[0].statistics[0].athletes[0].stats[1]='99';assert.throws(()=>normalizeFinishedGame(event,wrong,calendar,identityIndex(persons)));
});
test('international opponents have checked box scores without inventing NBA player IDs',()=>{
 const e=structuredClone(event);e.competitions[0].competitors[1].team.abbreviation='LON';const c={...calendar,games:[{...calendar.games[0],away:'LON'}]},s={boxscore:{players:[block('ATL',0,20),block('LON',5,18)]}};const d=normalizeFinishedGame(e,s,c,identityIndex(persons.slice(0,5)));assert.equal(d.players.length,5);assert.equal(d.teamGame.away,'LON');assert.ok(d.players.every(p=>p.team==='ATL'));
 const previous={players:[{id:1,name:'Synthetic Player 0',team:'BOS',games:[{...d.players[0].game,date:'2026-10-01',gameId:'0012600002',team:'BOS'}]}],teamGames:[]};const merged=mergeFinishedGames(previous,[d],2026,'preseason');assert.equal(merged.players[0].games[1].team,'BOS');assert.equal(previous.players[0].games.length,1);
});
test('health distinguishes archived seasons, source checks, failed attempts and invalid timestamps',()=>{
 const now=Date.parse('2026-10-13T21:00:00Z'),old='2026-10-01T10:00:00Z';assert.equal(dataFeedHealth({fetchedAt:old,season:2025,currentSeason:2026},now).status,'archived');
 const checked=dataFeedHealth({fetchedAt:old,season:2026,currentSeason:2026,checkedAt:'2026-10-13T20:00:00Z',attemptStatus:'ready'},now);assert.equal(checked.status,'ready');assert.equal(checked.importStatus,'stale');assert.equal(checked.fetchedAt,old);
 assert.equal(dataFeedHealth({fetchedAt:old,season:2026,currentSeason:2026,checkedAt:'2026-10-13T20:00:00Z',attemptStatus:'failed'},now).status,'failed');assert.equal(dataFeedHealth({fetchedAt:'bad',season:2026,currentSeason:2026},now).status,'pending');
});
test('following comparisons keep line changes separate from percentage point changes',()=>{
 const before={average:20,rate:.5,minutes:30,n:10,line:20.5,lastGameDate:'2026-10-10'},after={...before,average:22,rate:.7,minutes:32,lastGameDate:'2026-10-12'};
 assert.deepEqual(followChanges(after,before),{average:2,minutes:2,rate:20,line:0,newGame:true});assert.equal(followChanges({...after,line:21.5},before)?.rate,null);assert.equal(followChanges(after,null),null);
});
test('beta feedback rejects oversized, invalid and additional identity fields',()=>{
 const valid={tasks:[true,false,true,false,true],ease:3,note:'Me costó encontrar la línea'};assert.ok(betaFeedbackSchema.safeParse(valid).success);for(const invalid of [{...valid,ease:0},{...valid,tasks:[true]},{...valid,note:'x'.repeat(501)},{...valid,userId:'another-user'}])assert.equal(betaFeedbackSchema.safeParse(invalid).success,false);
});
