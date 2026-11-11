import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeMatchAvailability} from '../lib/match-availability';
import type {LiveGame} from '../lib/live-scores';

const date='2026-11-12T00:00:00Z', now=Date.parse('2026-11-11T19:00:00Z');
const game={id:'401909967',startsAt:date,home:'NYK',away:'CLE',state:'scheduled'} as LiveGame;
const team=(abbreviation:string)=>({abbreviation});
const rows=Array.from({length:5},(_,i)=>({athlete:{id:String(i+1),displayName:'Jugador '+i},starter:true,didNotPlay:false}));
function summary(state:'pre'|'in'){
  return {
    header:{id:game.id,league:{abbreviation:'NBA'},competitions:[{id:game.id,date,competitors:[
      {homeAway:'home',team:team('NY')},{homeAway:'away',team:team('CLE')},
    ],status:{type:{state}}}]},
    injuries:[{team:team('NY'),injuries:[{athlete:rows[0].athlete,status:'Out',date:'2026-11-11T18:06Z'}]}],
    boxscore:{players:[{team:team('NY'),statistics:[{athletes:rows}]},{team:team('CLE'),statistics:[{athletes:rows.slice(0,4)}]}]},
  };
}

test('pregame reports preserve unknown teams and do not confirm a tentative lineup',()=>{
  const result=normalizeMatchAvailability(summary('pre'),game,now);
  assert.equal(result.teams[0].injuries,null);
  assert.equal(result.teams[1].injuries?.[0].status,'Fuera');
  assert.equal(result.teams[1].starters,null);
});

test('a started game requires a complete, unique lineup for the correct matchup',()=>{
  const result=normalizeMatchAvailability(summary('in'),{...game,state:'live'},now);
  assert.equal(result.teams[0].starters,null);
  assert.equal(result.teams[1].starters?.length,5);
  assert.equal(result.teams[1].injuries,null);
  assert.throws(()=>normalizeMatchAvailability(summary('in'),{...game,away:'BOS'},now));
});
