import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Game } from '../lib/analytics';
import type { Player } from '../lib/data';
import { activeStreak, dailyTrends } from '../lib/daily-trends';
import type { Calendar } from '../lib/nba-snapshot';

test('daily ranking uses confirmed teams, pre-jornada history and the real L20 denominator', () => {
 const fixture = {id:'0022600227',home:'PHI',away:'CHI',date:'2026-11-16'} as Calendar['games'][number];
 const games = (year:number,count:number) => Array.from({length:count},(_,i):Game=>({
  gameId:String(year)+String(i).padStart(6,'0'),date:year+'-11-'+String(i+1).padStart(2,'0'),
  opponent:'CHI',team:'PHI',home:true,minutes:30,points:20,assists:5,rebounds:7,threes:1,played:true,
 }));
 const player = (id:string,currentTeam:string|null, sample:Game[]) => ({id,name:'Jugador '+id,currentTeam,games:sample}) as Player;
 const dayGame={...games(2026,1)[0],gameId:fixture.id,date:'2026-11-16',points:200};
 const result = dailyTrends([fixture],[
  player('1','PHI',[...games(2026,12),dayGame]), player('2','ATL',games(2026,12)),
  player('3','CHI',games(2026,4)), player('4',null,games(2026,12)),
 ],[player('1','PHI',games(2025,10))],[],'2026-11-16');
 assert.deepEqual(result.points.map(row=>row.id),['1']);
 const row=result.points[0];
 assert.equal(row.line,19.5);
 assert.equal(row.form.n,20);
 assert.equal(row.season.n,12);
 assert.equal(row.recent.length,10);
 assert.equal(row.grade,null);
});

test('active streaks use inclusive thresholds, skip DNPs and stop at the first miss', () => {
 const game = (points:number,played=true) => ({points,played,minutes:played?20:0}) as Game;
 const sample = [game(20),game(0,false),game(20),game(25),game(21),game(22),game(19),game(25)];
 assert.deepEqual(activeStreak(sample,'points'),{threshold:20,count:5});
 assert.equal(activeStreak([game(19),...sample.slice(0,2)],'points'),null);
});

