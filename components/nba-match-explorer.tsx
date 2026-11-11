'use client';

import {useEffect, useMemo, useState} from 'react';
import {markets, value, type Game, type Market} from '../lib/analytics';
import {explorerWindows, lineResults, type ExplorerWindow, type LineSide} from '../lib/nba-explorer';
import {loadCachedData} from '../lib/client-data-cache';
import {competitions, type Competition} from '../lib/competitions';
import {catalogDetailSample,catalogGameResult} from '../lib/catalog-detail';
import type {MatchPreviewData} from '../lib/match-preview';
import type {TeamGame} from '../lib/nba-snapshot';
import type {Player} from '../lib/data';
import type {ScheduledGame} from './calendar-panel';
import type {BoxFeed} from '../lib/live-boxscore';
import ExplorerLineTracker from './explorer-line-tracker';
import MatchAvailability from './match-availability';
import Portrait from './match-player-portrait';
import TeamLogo from './team-logo';
import './nba-match-explorer.css';

const number = new Intl.NumberFormat('es-AR', {maximumFractionDigits:1});
const format = (v: number | null) => v === null ? '—' : number.format(v);
const gameDate = new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short',timeZone:'UTC'});
type GameDetail = {player:Player; teamGames:TeamGame[]};

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
  initialFeed: BoxFeed|null;
  venue: string;
  minMinutes: number;
  opponent: string;
  loading: boolean;
  gamesFor: (player: Player) => Game[];
  onChange: (market: Market, last: ExplorerWindow) => void;
  onTeam: (team: string) => void;
  onSeason: (season: string) => void;
  onCompetition: (competition: Competition) => void;
  onVenue: (venue:string) => void;
  onMinutes: (minutes:number) => void;
  onOpponent: (opponent:string) => void;
  onLive: () => void;
  onOpen: (player: Player, market: Market, last: ExplorerWindow, line: number, side:LineSide) => void;
};

export default function NbaMatchExplorer({
  match, players, supported, market, last, competition, season, seasons, team, focus, initialFeed, venue, minMinutes, opponent, loading,
  gamesFor, onChange, onTeam, onSeason, onCompetition, onVenue, onMinutes, onOpponent, onOpen, onLive,
}: Props) {
  const [lineText, setLineText] = useState('');
  const [side,setSide] = useState<LineSide>('over');
  const [pickedBar,setPickedBar] = useState<{sample:string;index:number}>();
  const [details,setDetails] = useState<Record<string,GameDetail|'loading'|string>>({});
  const [quotes,setQuotes] = useState([{line:'',odds:''},{line:'',odds:''}]);
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
    const history = stats ? [] : gamesFor(player).sort((a,b) => b.date.localeCompare(a.date));
    const games = history.slice(0,last);
    const previous = history.slice(last,last*2);
    const averageMinutes = (sample:Game[]) => sample.reduce((sum,game) => sum+game.minutes,0)/sample.length;
    return {
      player,
      recent:stats ? (stats.recent ?? []).slice(-last) : games.map(game => value(game,market)).reverse(),
      games:games.reverse(),
      minutes:stats?.minutesAverage ?? (games.length ? averageMinutes(games) : null),
      minutesDelta:stats?.comparison?.minutesDelta ?? (games.length===last&&previous.length===last ? averageMinutes(games)-averageMinutes(previous) : null),
    };
  }), [players, market, last, gamesFor]);
  const fallbackLine = market === 'points' ? 24.5 : market === 'threes' ? 1.5 : 5.5;
  const enteredLine = Number(lineText);
  const line = lineText !== '' && enteredLine >= 0 && enteredLine <= 200 ? enteredLine : fallbackLine;
  const ranked = useMemo(() => samples.map(sample => ({...sample,...lineResults(sample.recent,line,side)}))
    .filter(row => row.n)
    .sort((a,b) => b.rate - a.rate || b.n - a.n || (b.average ?? 0) - (a.average ?? 0) ||
      a.player.name.localeCompare(b.player.name,'es')), [samples,line,side]);
  const playerId = selection && selection.focus === focus ? selection.id : focus?.id;
  const selected = ranked.find(row => row.player.id === playerId) ?? ranked[0];
  const chartMax = Math.max(1,line,...(selected?.recent ?? []).map(v => v ?? 0)) * 1.1;
  const latestMeeting = preview?.meetings[0];
  const sampleKey = [selected?.player.id,market,last,competition,season,venue,minMinutes,opponent].join(':');
  const detailKey = [selected?.player.id,competition,season].join(':');
  const detail = details[detailKey];
  const detailSample = selected && typeof detail === 'object' ? catalogDetailSample(detail.player,{
    market,last,venue,opponent,minutes:minMinutes,side,
  },selected.recent) : null;
  const pickedIndex = pickedBar?.sample === sampleKey ? pickedBar.index : (selected?.recent.length ?? 1)-1;
  const gameDetail = selected?.games[pickedIndex] ?? detailSample?.[pickedIndex];
  const gameResult = gameDetail && typeof detail === 'object' ? catalogGameResult(gameDetail,detail.teamGames) : null;
  const lineLabel = side === 'over' ? 'Más de' : 'Menos de';
  const trackedLine = selected ? {playerId:selected.player.id,name:selected.player.name,market,side,line} : null;
  const injuryYear = match.date.slice(5,7) >= '09' ? Number(match.date.slice(0,4)) : Number(match.date.slice(0,4))-1;
  const injuryReport = 'https://official.nba.com/nba-injury-report-' + injuryYear + '-' + String(injuryYear+1).slice(-2) + '-season/';

  async function loadGameDetail() {
    if (!selected || detail==='loading' || typeof detail==='object') return;
    const id = selected.player.id;
    setDetails(previous=>({...previous,[detailKey]:'loading'}));
    try {
      const query = new URLSearchParams({format:'compact',competition});
      if (season) query.set('season',season);
      const response = await loadCachedData<{players:Player[];teamGames?:TeamGame[]}>('/api/v1/players/'+id+'?'+query);
      const player = response.players.find(item=>item.id===id);
      if (!player) throw new Error('No encontramos el historial.');
      setDetails(previous=>({...previous,[detailKey]:{player,teamGames:response.teamGames??[]}}));
      window.dispatchEvent(new Event('pm:usage'));
    } catch (error) {
      setDetails(previous=>({...previous,[detailKey]:error instanceof Error ? error.message : 'El detalle no está disponible.'}));
    }
  }

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
    <MatchAvailability key={match.id} id={match.id} away={match.away} home={match.home} reportUrl={injuryReport}/>
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
        <label>Dirección<select value={side} onChange={e=>setSide(e.target.value as LineSide)}>
          <option value="over">Más de</option><option value="under">Menos de</option>
        </select></label>
        <label>Equipo<select value={team} onChange={e => onTeam(e.target.value)}>
          <option value="all">Ambos equipos</option><option value={match.away}>{match.away}</option><option value={match.home}>{match.home}</option>
        </select></label>
        <div className="segmented" aria-label="Últimos partidos">{explorerWindows.map(window =>
          <button key={window} type="button" className={last === window ? 'selected' : ''}
            aria-pressed={last === window} onClick={() => onChange(market,window)}>L{window}</button>)}</div>
      </div>
      <div className="sl-explorer-controls sl-explorer-filters" aria-label="Filtros de la muestra">
        <label>Localía histórica<select value={venue} onChange={e=>onVenue(e.target.value)}>
          <option value="all">Todos</option><option value="home">De local</option><option value="away">De visitante</option>
        </select></label>
        <label>Minutos mínimos<select value={minMinutes} onChange={e=>onMinutes(Number(e.target.value))}>
          {[...new Set([0,15,20,25,30,35,minMinutes])].sort((a,b)=>a-b).map(minutes=>
            <option key={minutes} value={minutes}>{minutes===0?'Sin mínimo':minutes+'+ min'}</option>)}
        </select></label>
        <label>Rival histórico<select value={opponent} onChange={e=>onOpponent(e.target.value)}>
          <option value="all">Cualquier rival</option>
          {[...new Set([match.away,match.home,opponent])].filter(code=>code!=='all').map(code=><option key={code} value={code}>{code}</option>)}
        </select></label>
      </div>
      <div className="sl-explorer-content" aria-busy={loading}>
        {loading ? <p role="status">Cargando las estadísticas seleccionadas…</p> : !selected ?
          <p>No hay partidos con datos para esta selección.</p> : <>
          <div className="sl-explorer-table"><table><thead><tr>
            <th scope="col">Jugador</th><th scope="col">Promedio</th><th scope="col">MIN</th><th scope="col">{lineLabel} {format(line)}</th>
          </tr></thead><tbody>{ranked.map(row => <tr key={row.player.id} className={row.player.id === selected.player.id ? 'active' : ''}>
            <th scope="row"><button type="button" onClick={() => setSelection({id:row.player.id,focus})} aria-pressed={row.player.id === selected.player.id}>
              <Portrait person={row.player}/><span><strong>{row.player.name}</strong><small><TeamLogo team={row.player.team} size={15}/>{row.player.team}</small></span>
            </button></th>
            <td>{format(row.average)}</td><td>{format(row.minutes)}</td><td><strong>{row.hits}/{row.n}</strong><small>{Math.round(row.rate * 100)} %</small></td>
          </tr>)}</tbody></table></div>
          <aside className="sl-explorer-detail">
            <h3>{selected.player.name}</h3><p>{markets[market]} · {selected.n} PJ con datos</p>
            <div className="sl-explorer-chart" style={{'--line':100 * line / chartMax + '%'} as React.CSSProperties} role="group"
              aria-label="Partidos del más antiguo al más reciente">
              {selected.recent.map((stat,index) => <button key={index} type="button" aria-pressed={index===pickedIndex}
                aria-label={`Partido ${index+1} · ${format(stat)}`} onClick={()=>setPickedBar({sample:sampleKey,index})}>
                <span className={stat===null?'missing':stat===line?'equal':(side==='over'?stat>line:stat<line)?'above':''}
                  style={{height:stat===null?'2px':`max(2px, ${100*stat/chartMax}%)`}}/>
              </button>)}
            </div>
            <div className="sl-bar-detail"><p aria-live="polite"><b>{format(selected.recent[pickedIndex]??null)} {markets[market].toLowerCase()}</b>
              {gameDetail&&<> · {gameDate.format(new Date(gameDetail.date+'T12:00:00Z'))} · {gameDetail.home?'Local':'Visitante'} vs. {gameDetail.opponent} · {format(gameDetail.minutes)} min{gameResult&&' · '+gameResult}</>}
              {detail==='loading'&&<small>Cargando detalle…</small>}
              {typeof detail==='string'&&detail!=='loading'&&<small>{detail}</small>}
              {typeof detail==='object'&&!gameDetail&&<small>Actualizá la selección para consultar el detalle de esta muestra.</small>}
            </p>{!gameDetail&&typeof detail!=='object'&&detail!=='loading'&&<button className="button subtle" type="button" onClick={()=>void loadGameDetail()}>Ver rival y minutos</button>}</div>
            <dl><div><dt>Minutos promedio</dt><dd>{format(selected.minutes)}</dd></div>
              {selected.minutesDelta!==null&&<div><dt>Minutos vs. los {last} PJ anteriores</dt><dd>{selected.minutesDelta>0?'+':''}{format(selected.minutesDelta)}</dd></div>}
              <div><dt>Condición en este partido</dt><dd>{selected.player.team === match.home ? 'Local' : 'Visitante'}</dd></div>
              <div><dt>Rival</dt><dd>{selected.player.team === match.home ? match.away : match.home}</dd></div>
              {selected.pushes > 0 && <div><dt>Igualó la línea</dt><dd>{selected.pushes} PJ</dd></div>}
            </dl>
            <div className="sl-explorer-links">
              <button className="button" type="button" onClick={() => onOpen(selected.player,market,last,line,side)}>Ver perfil completo</button>
            </div>
          </aside>
        </>}
      </div>
      {selected&&<details className="sl-explorer-odds"><summary>Comparar cuotas manualmente</summary>
        <p>{selected.player.name} · {markets[market]} · {lineLabel}</p>
        <div className="sl-explorer-quotes">{quotes.map((quote,index)=>{
          const decimal = Number(quote.odds.trim().replace(',','.'));
          const threshold = quote.line.trim()==='' ? line : Number(quote.line.trim().replace(',','.'));
          const valid = Number.isFinite(threshold)&&threshold>=0&&threshold<=200;
          const result = valid ? lineResults(selected.recent,threshold,side) : null;
          const decisions = result ? result.n-result.pushes : 0;
          const update = (field:'line'|'odds',text:string) => setQuotes(items=>items.map((item,i)=>i===index?{...item,[field]:text}:item));
          return <fieldset key={index}><legend>Opción {index+1}</legend>
            <div className="sl-explorer-controls"><label>Línea<input inputMode="decimal" value={quote.line} placeholder={format(line)} onChange={e=>update('line',e.target.value)}/></label>
              <label>Cuota decimal<input inputMode="decimal" value={quote.odds} placeholder="2,00" onChange={e=>update('odds',e.target.value)}/></label></div>
            <div><b>{Number.isFinite(decimal)&&decimal>1 ? format(100/decimal)+' %' : '—'}</b> para quedar en equilibrio</div>
            <div><b>{result&&decisions ? format(100*result.hits/decisions)+' %' : '—'}</b> en el historial {result&&`(${result.hits}/${decisions})`}</div>
            {!!result?.pushes&&<small>{result.pushes} PJ con devolución excluidos de esta frecuencia.</small>}
          </fieldset>;
        })}</div>
      </details>}
    </section>
    <ExplorerLineTracker match={match} initial={initialFeed} selection={trackedLine} identities={players} onLive={onLive}/>
  </div>;
}
