import Link from 'next/link';
import type { Game, Market } from '../lib/analytics';
import { markets, summarizeGames } from '../lib/analytics';
import type { TeamGame } from '../lib/nba-snapshot';
import TeamLogo from './team-logo';

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 });

export default function PlayerMatchupContext({ games, teamGames, opponent, opponentName, market, line, side }: {
 games: Game[];
 teamGames: TeamGame[];
 opponent: string;
 opponentName: string;
 market: Market;
 line: number;
 side: 'over' | 'under';
}) {
 const recent = teamGames.filter(game => game.home === opponent || game.away === opponent)
  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
 const samples = [
  { label: 'Local', games: games.filter(game => game.home) },
  { label: 'Visitante', games: games.filter(game => !game.home) },
 ];
 return <aside className="card profile-matchup-context" aria-label="Contexto de la muestra">
  <h3>{opponent === 'all' ? 'Local y visitante' : 'Contexto vs. ' + opponent}</h3>
  <p>{markets[market]} · {side === 'over' ? 'Más de' : 'Menos de'} {number.format(line)}</p>
  <div className="profile-split-results">
   {samples.map(sample => {
    const stats = summarizeGames(sample.games, market, line, side);
    return <div key={sample.label}>
     <span>{sample.label}</span>
     <strong>{stats.rate === null ? '—' : percent.format(stats.rate)}</strong>
     <small>{stats.n ? stats.hits + '/' + stats.n + ' sobre la muestra' : 'Sin partidos'}</small>
    </div>;
   })}
  </div>
  {opponent !== 'all' && <div className="profile-rival-results">
   <h4><TeamLogo team={opponent} size={25}/> Últimos partidos de {opponentName}</h4>
   {recent.length ? <ul>{recent.map(game => {
    const home = game.home === opponent;
    const scored = home ? game.homeScore : game.awayScore;
    const allowed = home ? game.awayScore : game.homeScore;
    return <li key={game.id}><Link href={'/partidos/' + game.id}>
     <span className={scored > allowed ? 'profile-win' : 'profile-loss'}>{scored > allowed ? 'V' : 'D'}</span>
     <span>{home ? 'vs.' : '@'} {home ? game.away : game.home}</span>
     <strong>{scored} - {allowed}</strong>
     <time dateTime={game.date}>{game.date.slice(8)}/{game.date.slice(5, 7)}</time>
    </Link></li>;
   })}</ul> : <p>Sin resultados del rival en el historial cargado.</p>}
  </div>}
 </aside>;
}
