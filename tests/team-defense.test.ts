import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchupGrade, rankTeamDefense } from '../lib/team-defense';
import type { TeamGame } from '../lib/nba-snapshot';

test('defensive ranking uses final points and reconciles each opponent box score', () => {
 const finals: TeamGame[] = Array.from({ length: 25 }, (_, index) => ({
  id: String(index), date: '2026-11-01', home: 'T' + (index % 5), away: 'T' + (5 + Math.floor(index / 5)),
  homeScore: 100 + Math.floor(index / 5) * 5, awayScore: 50 + (index % 5) * 5,
 }));
 const players = Array.from({ length: 50 }, (_, id) => ({
  id: String(id), games: finals.flatMap(game => {
   const team = 'T' + Math.floor(id / 5);
   if (team !== game.home && team !== game.away) return [];
   const home = team === game.home;
   const points = (home ? game.homeScore : game.awayScore) / 5;
   return [{ gameId: game.id, team, date: game.date, home, opponent: home ? game.away : game.home,
    minutes: 48, played: true, points, rebounds: points, assists: points, threes: 0 }];
  }),
 }));
 const result = rankTeamDefense(finals, players);
 assert.equal(result.T0.find(row => row.metric === 'points')?.rank, 1);
 assert.equal(result.T9.find(row => row.metric === 'rebounds')?.rank, 10);
 assert.equal(matchupGrade(result.T9, 'rebounds', 'over'), 'A+');
 assert.equal(matchupGrade(result.T9, 'rebounds', 'under'), 'F');
 assert.equal(matchupGrade(result.T9, 'blocks', 'over'), null);
 const incomplete = rankTeamDefense(finals, players.slice(1));
 assert.equal(incomplete.T5.find(row => row.metric === 'points')?.games, 5);
 assert.equal(incomplete.T5.find(row => row.metric === 'rebounds'), undefined);
});
