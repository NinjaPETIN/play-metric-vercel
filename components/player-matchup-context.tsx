'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { markets, summarizeGames, type Game, type Market } from '../lib/analytics';
import { loadCachedData } from '../lib/client-data-cache';
import type { Competition } from '../lib/competitions';
import type { TeamGame } from '../lib/nba-snapshot';
import { matchupGrade, type DefenseRank } from '../lib/team-defense';
import { teamNames } from '../lib/team-overview';
import { useReadingPreferences } from './reading-preferences';
import TeamLogo from './team-logo';
import PositionDefenseView from './position-defense';

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 0 });

export default function PlayerMatchupContext({ games, history, teamGames, team, opponent, onOpponent, season, competition, market, line, side }: {
 games: Game[]; history: Game[]; teamGames: TeamGame[]; team: string; opponent: string;
 onOpponent: (team: string) => void; season: number; competition: Competition;
 market: Market; line: number; side: 'over' | 'under';
}) {
 const { reduced } = useReadingPreferences();
 const [result, setResult] = useState<{ scope: string; teams: Record<string, DefenseRank[]> | null } | null>(null);
 const scope = season + ':' + competition;
 const selected = opponent !== 'all';
 useEffect(() => {
  if (!selected||reduced) return;
  let active = true;
  const query = new URLSearchParams({ season: String(season), competition });
  void loadCachedData<{ teams: Record<string, DefenseRank[]> }>('/api/nba/team-defense?' + query)
   .then(data => { if (active) setResult({ scope, teams: data.teams }); })
   .catch(() => { if (active) setResult({ scope, teams: null }); });
  return () => { active = false; };
 }, [competition, scope, season, selected, reduced]);

 const ranks = result?.scope === scope ? result.teams?.[opponent] ?? [] : [];
 const grade = matchupGrade(ranks, market, side);
 const defense = ranks.find(row=>row.metric===market);
 const recent = teamGames.filter(game => game.home === opponent || game.away === opponent)
  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
 const sample = summarizeGames(games, market, line, side);
 const versus = summarizeGames(history.filter(game => game.opponent === opponent), market, line, side);
 const reference = (side === 'over' ? 'Más de ' : 'Menos de ') + number.format(line);

 return <aside className="card profile-matchup-context" aria-label="Contexto del cruce">
  <h3>Contexto del cruce</h3>
  <label className="profile-context-select">Rival para comparar
   <select value={opponent} onChange={event => onOpponent(event.target.value)}>
    <option value="all">Elegir rival</option>
    {Object.entries(teamNames).filter(([code]) => code !== team).sort((a,b) => a[1].localeCompare(b[1]))
     .map(([code, name]) => <option key={code} value={code}>{name}</option>)}
   </select>
  </label>
  {selected && <>
   <div className="profile-context-team"><TeamLogo team={opponent} size={37}/><strong>{teamNames[opponent]}</strong></div>
   {!reduced&&<div className="profile-context-grade">
    <div><small>{markets[market]}</small><strong>{reference}</strong></div>
        <details className="profile-grade-detail">
     <summary className="profile-grade-value" data-grade={grade?.[0]} aria-label={'Nota defensiva: '+(grade??'sin datos')}>{grade??'—'}</summary>
     <p>{defense ? teamNames[opponent]+' está '+defense.rank+'.º de '+defense.teams+' en '+markets[market].toLowerCase()+' permitidos · '+defense.games+' partidos.' : 'Sin puesto defensivo para esta estadística.'}</p>
     <p>La nota ordena la defensa según lo que permite por partido: A+ corresponde al 10% más favorable, A al siguiente 15%, B al siguiente 15%, C al tramo intermedio, D al siguiente 20% y F al 20% menos favorable. Para «Menos de» se invierte el orden. Mide el contexto defensivo, no la probabilidad de cumplir esta línea.</p>
    </details>
   </div>}
   <div className="profile-split-results">
    <div><span>Muestra actual</span><strong>{sample.rate === null ? '—' : percent.format(sample.rate)}</strong><small>{sample.hits}/{sample.n} cumplen</small></div>
    <div><span>Historial vs. {opponent}</span><strong>{versus.rate === null ? '—' : percent.format(versus.rate)}</strong><small>{versus.n ? versus.hits + '/' + versus.n + ' cumplen' : 'Sin partidos válidos'}</small></div>
   </div>
   {!reduced&&<div className="profile-defense-ranks">
    <h4>Defensa del rival</h4>
    {ranks.length ? <>
     {ranks.map(rank => <div key={rank.metric}>
      <div><span>{markets[rank.metric]}</span><strong>{rank.rank}.º de {rank.teams}</strong></div>
      <meter min={1} max={rank.teams} value={rank.rank} aria-label={markets[rank.metric] + ', puesto ' + rank.rank}/>
      <small>{number.format(rank.average)} permitidos por partido · {rank.games} PJ</small>
     </div>)}
     <p>El 1.º permite menos. La nota cruza el puesto con «{side === 'over' ? 'Más de' : 'Menos de'}».</p>
    </> : <p role="status">{result?.scope === scope ? 'Ranking no disponible para esta temporada y rival.' : 'Consultando el ranking defensivo…'}</p>}
   </div>}
   {!reduced&&<PositionDefenseView opponent={opponent} season={season} competition={competition}/>}
   <div className="profile-rival-results">
    <h4>Últimos partidos de {opponent}</h4>
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
    })}</ul> : <p>Sin resultados recientes en el historial.</p>}
   </div>
  </>}
  {!selected && <div className="profile-split-results">
   {[true, false].map(home => {
    const stats = summarizeGames(games.filter(game => game.home === home), market, line, side);
    return <div key={String(home)}><span>{home ? 'Local' : 'Visitante'}</span><strong>{stats.rate === null ? '—' : percent.format(stats.rate)}</strong>
     <small>{stats.n ? stats.hits + '/' + stats.n + ' cumplen' : 'Sin partidos'}</small></div>;
   })}
  </div>}
 </aside>;
}
