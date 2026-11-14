import type { Game } from '../lib/analytics';

const percent = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 });

const shots = [
 { label: 'Tiros de campo', read: (game: Game) => [game.fieldGoalsMade, game.fieldGoalsAttempted] },
 { label: 'Dobles', read: (game: Game) => [
  game.fieldGoalsMade === undefined || game.threeAttempts === undefined ? undefined : game.fieldGoalsMade - game.threes,
  game.fieldGoalsAttempted === undefined || game.threeAttempts === undefined ? undefined : game.fieldGoalsAttempted - game.threeAttempts,
 ] },
 { label: 'Triples', read: (game: Game) => [game.threes, game.threeAttempts] },
 { label: 'Tiros libres', read: (game: Game) => [game.freeThrowsMade, game.freeThrowsAttempted] },
];

export default function PlayerShootingProfile({ games }: { games: Game[] }) {
 const rows = shots.map(({label, read}) => {
  const sample = games.reduce((totals, game) => {
   const [made, attempted] = read(game);
   if (!game.played || game.minutes <= 0 || made === undefined || attempted === undefined || made < 0 || made > attempted) return totals;
   return { made: totals.made + made, attempted: totals.attempted + attempted, count: totals.count + 1 };
  }, { made: 0, attempted: 0, count: 0 });
  return { label, ...sample, rate: sample.attempted ? sample.made / sample.attempted : null };
 });
 if (!rows.some(row => row.count)) return null;
 return <section className="card profile-shooting" aria-label="Perfil de tiro">
  <h3>Perfil de tiro</h3>
  <div className="profile-shooting-grid">{rows.map(row => <div key={row.label}>
   <h4>{row.label}</h4>
   <strong>{row.rate === null ? '—' : percent.format(row.rate)}</strong>
   {row.rate !== null && <meter aria-label={'Eficacia en ' + row.label.toLowerCase()} min={0} max={1} value={row.rate}/>}
   <small>{row.count ? row.made + '/' + row.attempted + ' · ' + row.count + ' PJ' : 'Sin datos en esta muestra'}</small>
  </div>)}</div>
 </section>;
}
