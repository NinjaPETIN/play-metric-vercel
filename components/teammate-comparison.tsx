'use client';

import { useEffect, useState } from 'react';
import type { Competition } from '../lib/competitions';
import type { TeammateComparison } from '../lib/teammate-splits';
import { identityName } from '../lib/player-name';

type Data = { players: { id: string; name: string }[]; comparison: TeammateComparison | null };
const labels = { minutes: 'Minutos', fieldGoalsAttempted: 'Tiros intentados', points: 'Puntos', rebounds: 'Rebotes', assists: 'Asistencias' };

export default function TeammateComparison({ team, season, competition, playerId, teammateName, before }: {
 team: string; season: number; competition: Competition; playerId?: string; teammateName?: string; before?: string;
}) {
 const [open, setOpen] = useState(Boolean(teammateName));
 const [subject, setSubject] = useState(playerId ?? '');
 const [selected, setSelected] = useState('');
 const [data, setData] = useState<Data | null>(null);
 const [result, setResult] = useState<{ key: string; comparison: TeammateComparison | null } | null>(null);
 const [error, setError] = useState('');
 const query = new URLSearchParams({ team, season: String(season), competition });
 if (before) query.set('before', before);
 const endpoint = '/api/nba/teammates?' + query;
 const named = teammateName ? data?.players.filter(player => identityName(player.name) === identityName(teammateName)) : undefined;
 const teammate = teammateName ? named?.length === 1 ? named[0].id : '' : selected;
 const compareUrl = open && subject && teammate && subject !== teammate ? endpoint + '&subject=' + subject + '&teammate=' + teammate : '';
 useEffect(() => {
  if (!open) return;
  const request = new AbortController();
  void fetch(endpoint, { signal: request.signal }).then(async response => {
   if (!response.ok) throw Error();
   const payload: Data = await response.json();
   if (!request.signal.aborted) setData(payload);
  }).catch(() => { if (!request.signal.aborted) setError('Historial de compañeros no disponible.'); });
  return () => request.abort();
 }, [endpoint, open]);
 useEffect(() => {
  if (!compareUrl) return;
  const request = new AbortController();
  void fetch(compareUrl, { signal: request.signal }).then(async response => {
   if (!response.ok) throw Error();
   const payload: Data = await response.json();
   if (!request.signal.aborted) setResult({ key: compareUrl, comparison: payload.comparison });
  }).catch(() => { if (!request.signal.aborted) setResult({ key: compareUrl, comparison: null }); });
  return () => request.abort();
 }, [compareUrl]);
 const current = result?.key === compareUrl ? result : null;
 const comparison = current?.comparison;
 const format = (n: number | null) => n === null ? '—' : n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
 return <details className="card teammate-comparison" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
  <summary>Con y sin {teammateName ?? 'un compañero · ' + team}</summary>
  {open && <div>
   {!data && <p role="status">{error || 'Consultando el historial…'}</p>}
   {data && teammateName && !teammate && <p>Historial insuficiente para identificar a {teammateName} en este equipo.</p>}
   {data && !teammateName && data.players.length < 2 && <p>Sin suficientes registros de este equipo.</p>}
   {data && !playerId && (!teammateName || teammate) && data.players.length >= 2 && <label>Jugador a comparar <select value={subject} onChange={event => { setSubject(event.target.value); if (event.target.value === selected) setSelected(''); }}>
    <option value="">Elegí un jugador</option>{data.players.filter(player => player.id !== teammate).map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
   </select></label>}
   {data && !teammateName && data.players.length >= 2 && <label>Compañero <select value={selected} onChange={event => setSelected(event.target.value)}>
    <option value="">Elegí un compañero</option>{data.players.filter(player => player.id !== subject).map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
   </select></label>}
   {compareUrl && !current && <p role="status">Comparando partidos…</p>}
   {current && !comparison && <p>Comparación no disponible.</p>}
   {comparison && <>
    <div className="table-scroll"><table className="history">
     <thead><tr><th scope="col">Promedio</th><th scope="col">Con · {comparison.with.games} PJ</th><th scope="col">Sin · {comparison.without.games} PJ</th></tr></thead>
     <tbody>{comparison.with.metrics.map((row, index) => <tr key={row.key}><th scope="row">{labels[row.key]}</th>
      {[comparison.with, comparison.without].map((group, column) => {
       const metric = group.metrics[index];
       return <td key={column}>{format(metric.value)}{metric.value !== null && metric.games < group.games && <small> · {metric.games} PJ</small>}</td>;
      })}</tr>)}</tbody>
    </table></div>
    {Math.min(comparison.with.games, comparison.without.games) < 5 && <p className="muted">Muestra pequeña o incompleta.</p>}
    <p className="muted">Partidos con estadísticas de equipo verificadas. La muestra «Sin» cuenta encuentros entre la primera y la última aparición registrada del compañero con este equipo.</p>
   </>}
  </div>}
 </details>;
}
