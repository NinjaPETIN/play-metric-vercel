import type { Game } from './analytics';
import type { Player } from './data';
import type { TeamGame } from './nba-snapshot';

const metrics = ['minutes', 'fieldGoalsAttempted', 'points', 'rebounds', 'assists'] as const;

function summarize(games: Game[]) {
 return {
  games: games.length,
  metrics: metrics.map(key => {
   const values = games.flatMap(game => game[key] === undefined ? [] : [game[key]]);
   return { key, value: values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null, games: values.length };
  }),
 };
}

export function teammateSplits(players: Player[], finals: TeamGame[], team: string, before?: string) {
 const finalById = new Map(finals.filter(game => (!before || game.date < before) && (game.home === team || game.away === team)).map(game => [game.id, game]));
 const boxes = new Map<string, { points: number; players: Set<string>; duplicate: boolean }>();
 const roster = players.flatMap(player => {
  const rows = player.games.filter(game => game.team === team && game.gameId && finalById.has(game.gameId) && game.played && game.minutes > 0);
  for (const game of rows) {
   const id = game.gameId!;
   const box = boxes.get(id) ?? { points: 0, players: new Set<string>(), duplicate: false };
   box.duplicate ||= box.players.has(player.id);
   box.points += game.points;
   box.players.add(player.id);
   boxes.set(id, box);
  }
  return rows.length ? [{ id: player.id, name: player.name, rows }] : [];
 });
 const verified = new Set([...boxes].flatMap(([id, box]) => {
  const final = finalById.get(id)!;
  return !box.duplicate && box.players.size >= 5 && box.points === (final.home === team ? final.homeScore : final.awayScore) ? [id] : [];
 }));
 const eligible = roster.flatMap(player => {
  const games = player.rows.filter(game => verified.has(game.gameId!)).sort((a, b) => a.date.localeCompare(b.date));
  return games.length ? [{ id: player.id, name: player.name, games }] : [];
 });
 return {
  players: eligible.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  compare(subjectId: string, teammateId: string) {
   const subject = eligible.find(player => player.id === subjectId);
   const teammate = eligible.find(player => player.id === teammateId);
   if (!subject || !teammate || subject === teammate) return null;
   const ids = new Set(teammate.games.map(game => game.gameId));
   const start = teammate.games[0].date;
   const end = teammate.games.at(-1)!.date;
   return {
    with: summarize(subject.games.filter(game => ids.has(game.gameId))),
    without: summarize(subject.games.filter(game => !ids.has(game.gameId) && game.date > start && game.date < end)),
   };
  },
 };
}
export type TeammateComparison = NonNullable<ReturnType<ReturnType<typeof teammateSplits>['compare']>>;
