import type { Game } from './analytics';
import { readEspn } from './espn-nba-read';
import { normalizeLiveScores } from './live-scores';
import { normalizeLiveBoxscore } from './live-boxscore';
import { identityName } from './player-identity';
import { cachedNbaRead } from './read-cache';

async function readShots(game: Game, name: string) {
 const day = game.date.replaceAll('-', '');
 const date = Date.parse(game.date + 'T12:00:00Z');
 const games = await cachedNbaRead('historical-espn-scoreboard:' + day, async () => ({ games:
  normalizeLiveScores(await readEspn('scoreboard?dates=' + day), date) }));
 const matches = games.games.filter(match => match.state === 'final'
  && new Date(match.startsAt).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) === game.date
  && (game.home ? match.home : match.away) === game.team
  && (game.home ? match.away : match.home) === game.opponent);
 if (matches.length !== 1) return [];
 const match = matches[0];
 const box = await cachedNbaRead('historical-espn-box:' + match.id, async () =>
  normalizeLiveBoxscore(await readEspn('summary?event=' + match.id), match));
 const candidates = box.teams.find(team => team.code === game.team)?.players.filter(player =>
  !player.didNotPlay && identityName(player.name) === identityName(name) && player.points === game.points);
 if (candidates?.length !== 1) return [];
 return (box.context?.plays ?? []).flatMap(play =>
  play.athleteId === candidates[0].id && play.team === game.team && play.shot && play.shot.value !== 1 && play.shotLocation
   ? [{ id: match.id + ':' + play.id, date: game.date, opponent: game.opponent, made: play.shot.made, value: play.shot.value, ...play.shotLocation }]
   : []);
}

export async function recentPlayerShots(games: Game[], name: string) {
 const recent = games.filter(game => game.played && game.minutes > 0 && game.team && game.gameId)
  .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
 const results = await Promise.allSettled(recent.map(game => readShots(game, name)));
 const shots = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
 if (recent.length && results.every(result => result.status === 'rejected')) throw new Error('No se pudieron leer las jugadas.');
 return { shots, games: new Set(shots.map(shot => shot.id.split(':')[0])).size, checked: recent.length };
}

export type RecentPlayerShots = Awaited<ReturnType<typeof recentPlayerShots>>;
