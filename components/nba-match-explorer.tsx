'use client';

import {useEffect, useMemo, useState} from 'react';
import {markets, value, type Game, type Market} from '../lib/analytics';
import {explorerWindows, lineResults, type ExplorerWindow} from '../lib/nba-explorer';
import {loadCachedData} from '../lib/client-data-cache';
import {competitions, type Competition} from '../lib/competitions';
import type {MatchPreviewData} from '../lib/match-preview';
import type {Player} from '../lib/data';
import type {ScheduledGame} from './calendar-panel';
import Portrait from './match-player-portrait';
import TeamLogo from './team-logo';
import './nba-match-explorer.css';

const number = new Intl.NumberFormat('es-AR', {maximumFractionDigits:1});
const format = (v: number | null) => v === null ? '—' : number.format(v);

type Props = {
  match: ScheduledGame;
  players: Player[];
  supported: Market[];
  market: Market;
  last: ExplorerWindow;
  competition: Competition;
  season: string;
  seasons: number[];
  team: string;
  focus: {id: string} | null;
  loading: boolean;
  gamesFor: (player: Player) => Game[];
  onChange: (market: Market, last: ExplorerWindow) => void;
  onTeam: (team: string) => void;
  onSeason: (season: string) => void;
  onCompetition: (competition: Competition) => void;
  onOpen: (player: Player, market: Market, last: ExplorerWindow, line: number) => void;
};

export default function NbaMatchExplorer({
  match, players, supported, market, last, competition, season, seasons, team, focus, loading,
  gamesFor, onChange, onTeam, onSeason, onCompetition, onOpen,
}: Props) {
  const [lineText, setLineText] = useState('');
  const [selection, setSelection] = useState<{id: string; focus: Props['focus']}>();
  const [preview, setPreview] = useState<MatchPreviewData | null | undefined>();
  useEffect(() => {
    let active = true;
    loadCachedData<MatchPreviewData>('/api/nba/preview/' + match.id)
      .then(data => {if (active) setPreview(data);})
      .catch(() => {if (active) setPreview(null);});
    return () => {active = false;};
  }, [match.id]);

  const samples = useMemo(() => players.map(player => {
    const stats = player.catalogStats?.[market];
    const games = stats ? [] : gamesFor(player).sort((a,b) => b.date.localeCompare(a.date)).slice(0,last);
    return {
      player,
      recent:stats ? (stats.recent ?? []).slice(-last) : games.map(game => value(game,market)).reverse(),
      minutes:stats?.minutesAverage ?? (games.length ? games.reduce((sum,game) => sum + game.minutes,0) / games.length : null),
    };
  }), [players, market, last, gamesFor]);
  const fallbackLine = market === 'points' ? 24.5 : market === 'threes' ? 1.5 : 5.5;
  const enteredLine = Number(lineText);
  const line = lineText !== '' && enteredLine >= 0 && enteredLine <= 200 ? enteredLine : fallbackLine;
  const ranked = useMemo(() => samples.map(sample => ({...sample,...lineResults(sample.recent,line)}))
    .filter(row => row.n)
    .sort((a,b) => b.rate - a.rate || b.n - a.n || (b.average ?? 0) - (a.average ?? 0) ||
      a.player.name.localeCompare(b.player.name,'es')), [samples,line]);
  const playerId = selection && selection.focus === focus ? selection.id : focus?.id;
  const selected = ranked.find(row => row.player.id === playerId) ?? ranked[0];
  const chartMax = Math.max(1,line,...(selected?.recent ?? []).map(v => v ?? 0)) * 1.1;
  const latestMeeting = preview?.meetings[0];

  return <div className="sl-nba-explorer">
    <section className="card sl-explorer-preview" aria-label="Previa rápida">
      <h2>Previa rápida</h2>
      {preview === undefined ? <p role="status">Cargando el historial del cruce…</p> : preview === null ?
        <p>Historial previo no disponible.</p> : <div className="sl-explorer-facts">
        {[match.away,match.home].map(code => {
          const rest = preview.teams.find(entry => entry.team === code)?.restDays;
          return <div key={code}><TeamLogo team={code} size={28}/><span><strong>{code}</strong>
            <small>{rest == null ? 'Descanso sin datos' : rest + (rest === 1 ? ' día de descanso' : ' días de descanso')}</small></span></div>;
        })}
        <div><span><strong>Último cruce</strong><small>{latestMeeting ?
          `${latestMeeting.away} ${latestMeeting.awayScore} – ${latestMeeting.homeScore} ${latestMeeting.home}` : 'Sin cruces registrados'}</small></span></div>
      </div>}
    </section>
    <section className="card sl-explorer-board" aria-labelledby="nba-explorer-title">
      <div className="sl-explorer-heading"><div><h2 id="nba-explorer-title">Explorador del partido</h2>
        <p>Compará a ambos equipos con la misma línea y el historial de la temporada elegida.</p></div>
        <div className="sl-explorer-controls sl-explorer-history">
          <select aria-label="Competición del historial" value={competition} onChange={e => onCompetition(e.target.value as Competition)}>
            {Object.entries(competitions).map(([key,entry]) => <option key={key} value={key}>{entry.label}</option>)}
          </select>
          <select aria-label="Temporada del historial" value={season} onChange={e => onSeason(e.target.value)}>
            {seasons.map(year => <option key={year} value={year}>{year}/{String(year+1).slice(-2)}</option>)}
          </select>
        </div>
      </div>
      <div className="sl-explorer-controls">
        <label>Estadística<select value={market} onChange={e => {setLineText('');onChange(e.target.value as Market,last);}}>
          {supported.map(key => <option key={key} value={key}>{markets[key]}</option>)}
        </select></label>
        <label>Línea de referencia<input type="number" min={0} max={200} step={0.5} placeholder={String(fallbackLine)}
          value={lineText} onChange={e => setLineText(e.target.value)} onBlur={() => setLineText(String(line))}/></label>
        <label>Equipo<select value={team} onChange={e => onTeam(e.target.value)}>
          <option value="all">Ambos equipos</option><option value={match.away}>{match.away}</option><option value={match.home}>{match.home}</option>
        </select></label>
        <div className="segmented" aria-label="Últimos partidos">{explorerWindows.map(window =>
          <button key={window} type="button" className={last === window ? 'selected' : ''}
            aria-pressed={last === window} onClick={() => onChange(market,window)}>L{window}</button>)}</div>
      </div>
      <div className="sl-explorer-content" aria-busy={loading}>
        {loading ? <p role="status">Cargando las estadísticas seleccionadas…</p> : !selected ?
          <p>No hay partidos con datos para esta selección.</p> : <>
          <div className="sl-explorer-table"><table><thead><tr>
            <th scope="col">Jugador</th><th scope="col">Promedio</th><th scope="col">MIN</th><th scope="col">Más de {format(line)}</th>
          </tr></thead><tbody>{ranked.map(row => <tr key={row.player.id} className={row.player.id === selected.player.id ? 'active' : ''}>
            <th scope="row"><button type="button" onClick={() => setSelection({id:row.player.id,focus})} aria-pressed={row.player.id === selected.player.id}>
              <Portrait person={row.player}/><span><strong>{row.player.name}</strong><small><TeamLogo team={row.player.team} size={15}/>{row.player.team}</small></span>
            </button></th>
            <td>{format(row.average)}</td><td>{format(row.minutes)}</td><td><strong>{row.hits}/{row.n}</strong><small>{Math.round(row.rate * 100)} %</small></td>
          </tr>)}</tbody></table></div>
          <aside className="sl-explorer-detail">
            <h3>{selected.player.name}</h3><p>{markets[market]} · {selected.n} PJ con datos</p>
            <div className="sl-explorer-chart" style={{'--line':100 * line / chartMax + '%'} as React.CSSProperties} role="img"
              aria-label={`Del más antiguo al más reciente: ${selected.recent.map(format).join(' / ')}. Línea de referencia: ${format(line)}.`}>
              {selected.recent.map((stat,index) => <div key={index} className={stat === null ? 'missing' : stat > line ? 'above' : stat === line ? 'equal' : ''}
                style={{height:stat === null ? '2px' : `max(2px, ${100 * stat / chartMax}%)`}}
                title={`Partido ${index+1} · ${format(stat)}`}><span className="sr-only">{format(stat)}</span></div>)}
            </div>
            <dl><div><dt>Minutos promedio</dt><dd>{format(selected.minutes)}</dd></div>
              <div><dt>Condición en este partido</dt><dd>{selected.player.team === match.home ? 'Local' : 'Visitante'}</dd></div>
              <div><dt>Rival</dt><dd>{selected.player.team === match.home ? match.away : match.home}</dd></div>
              {selected.pushes > 0 && <div><dt>Igualó la línea</dt><dd>{selected.pushes} PJ</dd></div>}
            </dl>
            <button className="button" type="button" onClick={() => onOpen(selected.player,market,last,line)}>Ver perfil completo</button>
          </aside>
        </>}
      </div>
    </section>
  </div>;
}
