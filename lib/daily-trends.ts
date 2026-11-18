import { summarizeGames, value, type Game } from './analytics';
import type { Player } from './data';
import type { Calendar, TeamGame } from './nba-snapshot';
import { defenseMetrics, matchupGrade, rankTeamDefense, type DefenseMetric, type DefenseRank } from './team-defense';

export const dailyMarkets = defenseMetrics;
export const minimumDailyGames = 10;

const streakThresholds: Record<DefenseMetric, number[]> = {
 points:[5, 8, 10, 12, 15, 20, 25, 30, 35, 40],
 rebounds:[2, 3, 4, 5, 6, 8, 10, 12, 15],
 assists:[2, 3, 4, 5, 6, 8, 10, 12],
 threes:[1, 2, 3, 4, 5, 6],
};
export const minimumStreak = 4;
export type DailyStreak = {id:string;name:string;team:string;opponent:string;threshold:number;count:number};
type DailyStreaks = Record<DefenseMetric, DailyStreak[]>;

export function activeStreak(games: readonly Game[], metric: DefenseMetric) {
 const recent: number[] = [];
 for (const game of games) {
  if (!game.played || game.minutes <= 0) continue;
  const stat = value(game, metric);
  if (stat === null) break;
  recent.push(stat);
 }
 const threshold = streakThresholds[metric].findLast(line => recent.length >= minimumStreak &&
  recent.slice(0, minimumStreak).every(stat => stat >= line));
 if (threshold === undefined) return null;
 const miss = recent.findIndex(stat => stat < threshold);
 return {threshold, count: miss < 0 ? recent.length : miss};
}

export function dailyTrends(fixtures: Calendar['games'], players: Player[], previous: Player[], finals: TeamGame[], day: string, streaks?: DailyStreaks) {
 const opponents = new Map<string,{code:string;home:boolean}>(fixtures.flatMap(game => [[game.home,{ code: game.away, home: true }], [game.away,{ code: game.home, home: false }]] as const));
 const cutoff = new Set(fixtures.map(game => game.id));
 const beforeDay = (game: { date: string; gameId?: string }) => game.date < day && !cutoff.has(game.gameId ?? '');
 const ranks = rankTeamDefense(finals.filter(game => beforeDay({date: game.date, gameId: game.id})), players);
 const older = new Map(previous.map(player => [player.id, player.games]));
 const reports:Record<DefenseMetric,DailyTrendRow[]> = {points:[],rebounds:[],assists:[],threes:[]};
 for (const player of players) {
  const team = player.currentTeam;
  const opponent = team && opponents.get(team);
  if (!team || !opponent) continue;
  const valid = (games: Game[]) => games.filter(game => beforeDay(game) && game.played && game.minutes > 0).sort((a,b) => b.date.localeCompare(a.date));
  const season = valid(player.games);
  if (!season.length) continue;
  const history = [...season, ...valid(older.get(player.id) ?? [])].filter((game, index, rows) =>
   !game.gameId || rows.findIndex(row => row.gameId === game.gameId) === index);
  for (const metric of dailyMarkets) {
   const streak = streaks && activeStreak(season, metric);
   if (streak && streaks) streaks[metric].push({id:player.id, name:player.name, team, opponent:opponent.code, ...streak});
   const average = summarizeGames(season, metric, 0).average;
   if (average === null) continue;
   const line = Math.max(.5, Math.round(average) - .5);
   const form = summarizeGames(history.slice(0,20), metric, line);
   if (form.n < minimumDailyGames) continue;
   reports[metric].push({
    id:player.id, name:player.name, team, opponent:opponent.code, home:opponent.home, line,
    form, season:summarizeGames(season,metric,line), versus:summarizeGames(history.filter(game => game.opponent === opponent.code),metric,line),
    grade:matchupGrade(ranks[opponent.code] ?? [],metric,'over'),
    defense:ranks[opponent.code]?.find(row=>row.metric===metric)??null,
    recent:history.slice(0,10).reverse().map(game => ({ value:value(game, metric), opponent:game.opponent })),
   });
  }
 }
 for (const metric of dailyMarkets) {
  reports[metric] = reports[metric].sort((a,b) => (b.form.rate ?? 0)-(a.form.rate ?? 0) || b.form.n-a.form.n || a.name.localeCompare(b.name,'es') || a.id.localeCompare(b.id)).slice(0,20);
  if (streaks) streaks[metric] = streaks[metric].sort((a,b) => b.count-a.count || b.threshold-a.threshold || a.name.localeCompare(b.name,'es')).slice(0,10);
 }
 return reports;
}

type Sample = ReturnType<typeof summarizeGames>;
export type DailyTrendRow = {
 id:string; name:string; team:string; opponent:string; home:boolean; line:number;
 form:Sample; season:Sample; versus:Sample; grade:string|null; defense:DefenseRank|null;
 recent:{value:number|null;opponent:string}[];
};
export type DailyTrends = { day:string; season:number; games:number; reports:ReturnType<typeof dailyTrends> | null; streaks?:DailyStreaks };

