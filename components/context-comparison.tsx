'use client';
import { contextSamples } from '../lib/context-samples';
import { markets, type Game, type Market } from '../lib/analytics';
const number = (n: number | null) => n === null ? '—' : n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
export default function ContextComparison({ games, market, line, side, limit, opponent, minMinutes }: {
    games: Game[];
    market: Market;
    line: number;
    side: 'over' | 'under';
    limit: number;
    opponent: string;
    minMinutes: number;
}) {
    const rows = contextSamples(games, market, line, side, limit, opponent, minMinutes);
    return <details className="card ux-context"><summary>Comparar contextos <small>Localía y períodos</small></summary><p>{markets[market]} · {side === 'over' ? 'Más de' : 'Menos de'} {number(line)} · {opponent === 'all' ? 'Todos los rivales' : 'vs. ' + opponent} · mínimo {minMinutes} min.</p><div className="table-scroll"><table className="history"><caption className="sr-only">Cada contexto usa la misma línea y muestra sus propios partidos válidos.</caption><thead><tr><th scope="col">Contexto</th><th scope="col">Promedio</th><th scope="col">Cumplen</th><th scope="col">Frecuencia</th><th scope="col">Muestra</th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{number(row.average)}</td><td>{row.hits}/{row.n}</td><td>{row.rate === null ? '—' : Math.round(row.rate * 100) + '%'}</td><td>{row.n} PJ{row.n > 0 && row.n < 10 ? ' · pequeña' : ''}</td></tr>)}</tbody></table></div><small>Local y visitante toman hasta {limit || 'todos los'} partidos por contexto. Los períodos incluyen ambas localías. Frecuencias históricas, no probabilidades futuras.</small></details>;
}
