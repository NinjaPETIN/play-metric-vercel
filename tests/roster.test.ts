import test from 'node:test';
import assert from 'node:assert/strict';
import {applyRoster,rosterSchema,rosterFreshness,rosterTeams,type Roster} from '../lib/roster';
import type {Player} from '../lib/data';
const roster:Roster={source:'NBA.com',fetchedAt:'2026-10-12T20:00:00.000Z',players:rosterTeams.flatMap((team,i)=>Array.from({length:10},(_,j)=>({id:String(i*10+j+1),name:`Player ${i}-${j}`,team,position:'Guard'})))};
test('current roster affiliations preserve historical player and game teams; newcomers have no invented games',()=>{
 const historical={id:'181',name:'Example',team:'LAL',position:'',games:[{team:'LAL'}],lines:{},base:[0,0,0,0],color:'#fff'} as Player;
 const [updated,...newcomers]=applyRoster([historical],roster,true);
 assert.equal(updated.currentTeam,'PHI');assert.equal(updated.team,'LAL');assert.equal(updated.games[0].team,'LAL');assert.equal(historical.currentTeam,undefined);
 assert.equal(newcomers.length,299);assert.ok(newcomers.every(p=>p.games.length===0));
 assert.equal(applyRoster([{...historical,id:'999999'}],roster)[0].currentTeam,null);
});
test('incomplete or duplicate roster generations are rejected and freshness expires independently of game seasons',()=>{
 assert.equal(rosterSchema.safeParse(roster).success,true);
 assert.equal(rosterSchema.safeParse({...roster,players:roster.players.slice(10)}).success,false);
 assert.equal(rosterSchema.safeParse({...roster,players:[...roster.players,roster.players[0]]}).success,false);
 assert.equal(rosterFreshness(null).status,'pending');
 assert.equal(rosterFreshness(roster.fetchedAt,Date.parse(roster.fetchedAt)+3600_000).status,'ready');
 assert.equal(rosterFreshness(roster.fetchedAt,Date.parse(roster.fetchedAt)+3*3600_000).status,'stale');
});
