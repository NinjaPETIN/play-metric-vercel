import type { Game, Market } from './analytics';
import type { TeamGame } from './nba-snapshot';

export const defenseMetrics = ['points', 'rebounds', 'threes', 'assists'] as const;
export type DefenseMetric = typeof defenseMetrics[number];
export type DefenseRank = { metric: DefenseMetric; average: number; rank: number; teams: number; games: number };
type Totals = Record<DefenseMetric, number>;
const totals = (): Totals => ({ points: 0, rebounds: 0, threes: 0, assists: 0 });

export function rankTeamDefense(finals: TeamGame[], players: { id: string; games: Game[] }[]) {
 const fixtures = new Map(finals.map(game => [game.id, game]));
 const boxes = new Map<string, { ids: Set<string>; values: Totals; valid: boolean }>();
 for (const player of players) for (const game of player.games) {
  if (!game.gameId || !game.team || !game.played || game.minutes <= 0) continue;
  const fixture = fixtures.get(game.gameId);
  if (!fixture || (game.team !== fixture.home && game.team !== fixture.away)) continue;
  const key = fixture.id + ':' + game.team;
  const box = boxes.get(key) ?? { ids: new Set<string>(), values: totals(), valid: true };
  if (box.ids.has(player.id) || defenseMetrics.some(metric => !Number.isFinite(game[metric]) || game[metric] < 0)) box.valid = false;
  else for (const metric of defenseMetrics) box.values[metric] += game[metric];
  box.ids.add(player.id);
  boxes.set(key, box);
 }

 const defense = new Map<string, { finals: number; valid: number; values: Totals }>();
 for (const game of fixtures.values()) for (const home of [true, false]) {
  const team = home ? game.home : game.away;
  const rival = home ? game.away : game.home;
  const points = home ? game.awayScore : game.homeScore;
  const row = defense.get(team) ?? { finals: 0, valid: 0, values: totals() };
  const box = boxes.get(game.id + ':' + rival);
  row.finals++;
  row.values.points += points;
  if (box?.valid && box.ids.size >= 5 && box.values.points === points) {
   row.valid++;
   for (const metric of defenseMetrics) if (metric !== 'points') row.values[metric] += box.values[metric];
  }
  defense.set(team, row);
 }

 const output: Record<string, DefenseRank[]> = {};
 for (const metric of defenseMetrics) {
  const eligible = [...defense].flatMap(([team, row]) => {
   const games = metric === 'points' ? row.finals : row.valid;
   return games >= 5 && games >= row.finals * .8 ? [{ team, games, average: row.values[metric] / games }] : [];
  }).sort((a, b) => a.average - b.average);
  if (eligible.length < 10) continue;
  eligible.forEach(({ team, games, average }, index) => {
   const rank = index && average === eligible[index - 1].average ? output[eligible[index - 1].team].at(-1)!.rank : index + 1;
   (output[team] ??= []).push({ metric, games, average, rank, teams: eligible.length });
  });
 }
 return output;
}

export function matchupGrade(ranks: DefenseRank[], market: Market, side: 'over' | 'under') {
 const row = ranks.find(rank => rank.metric === market);
 if (!row) return null;
 const fraction = (row.rank - 1) / (row.teams - 1);
 const favorable = side === 'over' ? fraction : 1 - fraction;
 return favorable >= .9 ? 'A+' : favorable >= .75 ? 'A' : favorable >= .6 ? 'B' : favorable >= .4 ? 'C' : favorable >= .2 ? 'D' : 'F';
}
