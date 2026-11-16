import assert from 'node:assert/strict';
import test from 'node:test';
import type { Game } from '../lib/analytics';
import { comparePeriods, minutesTrend } from '../lib/period-comparison';

const game = (day: number, data: Partial<Game> = {}): Game => ({
 date: '2026-11-' + String(day).padStart(2, '0'), opponent: 'BOS',
 home: false, minutes: 25, points: day, rebounds: 0, assists: 0, threes: 0, played: true, ...data,
});

test('period comparison uses disjoint samples and weights shooting by recorded attempts', () => {
 const games = Array.from({length: 13}, (_, i) => game(i + 1));
 games.push(game(25, { played: false, minutes: 0 }));
 games[12] = game(13, { fieldGoalsMade: 1, fieldGoalsAttempted: 1 });
 games[11] = game(12, { fieldGoalsMade: 0, fieldGoalsAttempted: 9 });
 const result = comparePeriods(games)!;
 assert.deepEqual(result.recent.map(row => row.points), [13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
 assert.deepEqual(result.prior.map(row => row.points), [3, 2, 1]);
 assert.deepEqual(result.rows.find(row => row.key === 'accuracy')?.recent, {value: 10, n: 2});
 assert.equal(comparePeriods(games.slice(0, 10)), null);
});

test('rotation trend compares minutes only when both periods have sufficient appearances', () => {
 const games = Array.from({length: 8}, (_, i) => game(20-i, {minutes: i < 5 ? 29 : 23}));
 assert.deepEqual(minutesTrend(games), {recent: 29, prior: 23, recentGames: 5, priorGames: 3, delta: 6});
 assert.equal(minutesTrend(games.slice(0, 7)), null);
});