'use client';
import { useState } from 'react';
import { markets, value, type Game, type Market } from '../lib/analytics';
import { useReadingPreferences } from './reading-preferences';
import type { TeamGame } from '../lib/nba-snapshot';
const number = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
export default function InteractiveHistoryChart({ games, market, line, side, teamGames = [] }: {
    games: Game[];
    market: Market;
    line: number;
    side: 'over' | 'under';
    teamGames?: TeamGame[];
}) {
    const { reduced } = useReadingPreferences();
    const [selected, setSelected] = useState<string | null>(null);
    const rows = [...games].filter(g => g.played && g.minutes > 0 && value(g, market) !== null).sort((a, b) => a.date.localeCompare(b.date));
    const max = Math.max(1, line, ...rows.map(g => value(g, market)!)) * 1.15;
    const active = rows.find(g => (g.gameId ?? g.date) === selected);
    const result = active ? teamGames.find(g => active.gameId ? g.id === active.gameId : g.date === active.date && (active.home ? g.away : g.home) === active.opponent && (!active.team || (active.home ? g.home : g.away) === active.team)) : null;
    return <div className="ux-chart"><div className="ux-chart-caption"><strong>{markets[market]}</strong><span>{rows.length} PJ{!reduced && <> · {side === 'over' ? 'Más de' : 'Menos de'} <b>{number(line)}</b></>}</span></div><div className="ux-chart-scroll"><div className="ux-chart-plot" style={{ minWidth: Math.max(280, rows.length * 36) }}>
 {!reduced && <div className="ux-chart-line" style={{ bottom: (line / max * 100) + '%' }}><span>{number(line)}</span></div>}
 {rows.map(g => { const v = value(g, market)!, id = g.gameId ?? g.date, hit = side === 'over' ? v > line : v < line; return <button type="button" key={id} aria-pressed={id === selected} aria-label={`${g.date}, ${g.home ? 'local' : 'visitante'} contra ${g.opponent}: ${number(v)} ${markets[market]}, ${number(g.minutes)} minutos${reduced ? '' : v === line ? ', empate' : hit ? ', cumple' : ', no cumple'}`} className={'ux-chart-bar ' + (reduced ? 'neutral' : v === line ? 'push' : hit ? 'positive' : 'negative')} onClick={() => setSelected(id)} onFocus={() => setSelected(id)} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = e.key === 'ArrowLeft' ? e.currentTarget.previousElementSibling : e.currentTarget.nextElementSibling;
        if (next instanceof HTMLButtonElement)
            next.focus();
    } }}><span className="ux-chart-column" style={{ height: Math.max(1, v / max * 100) + '%' }}><b>{v}</b></span><span className="ux-chart-opponent">{g.opponent}</span><small>{g.date.slice(8)}/{g.date.slice(5, 7)}</small></button>; })}</div></div><div className="ux-chart-inspector" aria-live="polite">{active ? <><strong>{new Date(active.date + 'T12:00:00Z').toLocaleDateString('es-AR')} · {active.home ? 'Local vs.' : 'Visitante vs.'} {active.opponent}</strong><span>{result && `${result.away} ${result.awayScore} – ${result.homeScore} ${result.home} · `}{number(value(active, market)!)} {markets[market].toLowerCase()} · {number(active.minutes)} min{!reduced && ' · ' + (value(active, market) === line ? 'Empate' : (side === 'over' ? value(active, market)! > line : value(active, market)! < line) ? 'Cumple' : 'No cumple')}</span><a href={active.gameId ? '/partidos/' + active.gameId : '#perfil-partidos'}>{active.gameId ? 'Ver resultado y partido' : 'Ver historial del jugador'} →</a></> : <span>Tocá una barra para consultar fecha, rival, minutos y resultado.</span>}</div></div>;
}
