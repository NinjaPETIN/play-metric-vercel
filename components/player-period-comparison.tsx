'use client';

import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { comparePeriods } from '../lib/period-comparison';
import { cardSizes, type CardFormat } from '../lib/performance-card';
import type { Game } from '../lib/analytics';
import ShareCardDialog from './lazy-share-card-dialog';

const num = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const show = (n: number | null, suffix = '') => n === null ? '—' : num.format(n) + suffix;
const delta = (a: number | null, b: number | null, suffix = '') => {
 if (a === null || b === null) return '—';
 const diff = Math.round((a - b) * 10) / 10;
 return (diff > 0 ? '+' : '') + show(diff || 0, suffix);
};

export default function PlayerPeriodComparison({ games, name, path }: { games: Game[]; name: string; path: string }) {
 const comparison = useMemo(() => comparePeriods(games), [games]);
 const [sharing, setSharing] = useState(false);
 if (!comparison) return null;

 const { recent, prior, rows } = comparison;
 const labels = ['Estadística', 'Últimos ' + recent.length, prior.length + ' anteriores', 'Cambio'];
 const table = rows.map(row => {
  const percent = row.key === 'accuracy';
  const cell = (value: typeof row.recent, size: number) =>
   show(value.value, percent ? '%' : '') + (value.value !== null && value.n < size ? ' (' + value.n + ' PJ)' : '');
  return [row.label, cell(row.recent, recent.length), cell(row.prior, prior.length),
   delta(row.recent.value, row.prior.value, percent ? ' pp' : '')];
 });
 const draw = (canvas: HTMLCanvasElement, format: CardFormat, light: boolean) => {
  const [width, height] = cardSizes[format];
  const context = canvas.getContext('2d');
  if (!context) return;
  const ctx = context;
  const ink = light ? '#172036' : '#f3f5ff';
  const muted = light ? '#455470' : '#aebbd1';
  const accent = light ? '#414aca' : '#aaaaff';
  const pad = 64;
  const xs = [pad + 18, width * .53, width * .72, width - pad - 18];
  function label(text: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = 'left', maxWidth?: number) {
   ctx.fillStyle = color;
   ctx.font = weight + ' ' + size + 'px Poppins, sans-serif';
   ctx.textAlign = align;
   if (maxWidth) ctx.fillText(text, x, y, maxWidth);
   else ctx.fillText(text, x, y);
  }
  ctx.fillStyle = light ? '#f3f5fa' : '#111827';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 12);
  label('STATLANE', pad, 99, 30, 800, accent);
  label('Qué cambió', pad, 194, 62, 800, ink);
  label(name, pad, 247, 34, 700, muted, 'left', width - 2 * pad);
  const rowHeight = Math.min(112, (height - 395) / 6);
  [labels, ...table].forEach((row, i) => {
   const y = 282 + i * rowHeight;
   ctx.fillStyle = i % 2 ? (light ? '#ffffff' : '#192337') : (light ? '#e8ecf6' : '#202b42');
   ctx.fillRect(pad, y, width - 2 * pad, rowHeight);
   row.forEach((line, col) => label(line, xs[col], y + rowHeight / 2 + 9, 25, i === 0 ? 700 : 600,
    i === 0 ? muted : col === 3 ? accent : ink, col === 0 ? 'left' : 'right', col === 0 ? width * .24 : undefined));
  });
  label('Promedios por partido · Tiros de campo sobre intentos registrados', pad, height - 50, 23, 600, muted, 'left', width - 2 * pad);
 };

 return <section className="card player-period-comparison">
  <div className="player-period-heading">
   <div><h3>Qué cambió</h3><p className="muted">Promedios por partido · filtros aplicados{prior.length < 10 ? ' · muestra anterior parcial' : ''}</p></div>
   <button type="button" className="button subtle" onClick={() => setSharing(true)}><Share2 size={16}/> Compartir tarjeta</button>
  </div>
  <div className="table-scroll"><table className="history"><thead><tr>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
   <tbody>{table.map(([label, ...cells]) => <tr key={label}><th scope="row">{label}</th>{cells.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}</tbody>
  </table></div>
  <p className="muted">El porcentaje de tiros de campo se calcula sobre los intentos registrados.</p>
  {sharing && <ShareCardDialog title="Compartir Qué cambió" triggerLabel="Compartir tarjeta"
   text={name + ' · Qué cambió en sus últimos ' + recent.length + ' partidos. ' + table[0][3] + ' puntos y ' + table[1][3] + ' minutos por partido. Statlane.'}
   path={path} filename="statlane-que-cambio" assets={{}} draw={draw} onClose={() => setSharing(false)}/>}
 </section>;
}
