import assert from 'node:assert/strict';
import test from 'node:test';
import type { Game } from '../lib/analytics';
import type { Player } from '../lib/data';
import { teammateSplits } from '../lib/teammate-splits';

const id = (n: number) => '002260000' + n;
const appearance = (n: number, points = 2): Game => ({
 gameId: id(n), date: '2026-11-0' + n, team: 'BOS', opponent: 'NYK', home: true,
 minutes: 20, points, rebounds: 3, assists: 4, threes: 0, played: true,
});
const player = (id: string, games: Game[]) => ({ id, name: id, games }) as Player;

test('teammate splits exclude incomplete games, dates outside the shared stint and same-day games', () => {
 const dates = [1,2,3,4,5,6,7];
 const players = [
  player('subject', dates.map(n => ({ ...appearance(n, 20), fieldGoalsAttempted: n === 2 ? 12 : undefined }))),
  { ...player('teammate', [appearance(2), appearance(5)]), currentTeam: 'BOS' },
  ...['a','b','c','d'].map(id => player(id, dates.map(n => appearance(n)))),
 ];
 const finals = dates.map(n => ({
  id: id(n), date: '2026-11-0' + n, home: 'BOS', away: 'NYK',
  homeScore: n === 2 || n === 5 ? 30 : n === 4 ? 99 : 28, awayScore: 35,
 }));
 const result = teammateSplits(players, finals, 'BOS', '2026-11-06').compare('subject','teammate');
 assert.equal(result?.with.games, 2);
 assert.equal(result?.without.games, 1);
 assert.equal(teammateSplits(players, finals, 'BOS', '2026-11-07', true).compare('subject','teammate')?.without.games, 2);
 assert.deepEqual(result?.with.metrics.find(row => row.key === 'fieldGoalsAttempted'), { key:'fieldGoalsAttempted', value:12, games:1 });
 assert.equal(teammateSplits(players, finals, 'BOS', '2026-11-05').compare('subject','teammate')?.without.games, 0);
});