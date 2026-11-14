import { markets, summarizeGames, value, type Game, type Market } from './analytics';
import { cardSizes, type CardFormat } from './performance-card';

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export function drawAnalysisCard(canvas: HTMLCanvasElement, format: CardFormat, light: boolean, data: {
 name: string; team: string; games: Game[]; market: Market; line: number; side: 'over' | 'under';
 season: number; competition: string; filters: string; fetchedAt: string;
}, portrait?: HTMLImageElement) {
 const [width, height] = cardSizes[format];
 canvas.width = width;
 canvas.height = height;
 const context = canvas.getContext('2d');
 if (!context) return;
 const ctx = context;
 const ink = light ? '#14213a' : '#f3f5ff';
 const muted = light ? '#485675' : '#aebcda';
 const accent = light ? '#4941b5' : '#a9a6ff';
 const green = light ? '#087659' : '#61dfb6';
 const red = light ? '#af3a51' : '#ff8796';
 const divider = light ? '#c4cee6' : '#344461';
 const pad = 62;
 const content = width - 2 * pad;
 const summary = summarizeGames(data.games, data.market, data.line, data.side);
 const rows = data.games.filter(game => game.played && game.minutes > 0).slice(0, 10).reverse();
 const entries = rows.map(game => ({ game, stat: value(game, data.market) }));
 const max = Math.max(1, data.line, ...entries.map(({stat}) => stat ?? 0)) * 1.18;

 function text(label: string, x: number, y: number, size: number, color = ink, weight = 700, limit = content) {
  ctx.font = weight + ' ' + size + 'px Poppins, Arial, sans-serif';
  while (ctx.measureText(label).width > limit && size > 16) {
   size--;
   ctx.font = weight + ' ' + size + 'px Poppins, Arial, sans-serif';
  }
  ctx.fillStyle = color;
  ctx.fillText(label, x, y, limit);
 }

 const gradient = ctx.createLinearGradient(0, 0, width, height);
 gradient.addColorStop(0, light ? '#f3f5ff' : '#0d1426');
 gradient.addColorStop(1, light ? '#e3eaff' : '#1a294b');
 ctx.fillStyle = gradient;
 ctx.fillRect(0, 0, width, height);
 ctx.fillStyle = '#6574ff';
 ctx.fillRect(pad, 0, 126, 10);
 text('STATLANE', pad, 76, 37, ink, 800);

 const heroEnd = height * .37;
 if (portrait?.naturalWidth) {
  const assetWidth = Math.min(content * .41, (heroEnd - 85) * portrait.naturalWidth / portrait.naturalHeight);
  const assetHeight = assetWidth * portrait.naturalHeight / portrait.naturalWidth;
  ctx.drawImage(portrait, width - pad - assetWidth, heroEnd - assetHeight, assetWidth, assetHeight);
 }
 const nameLimit = portrait ? content * .59 : content;
 text('ANÁLISIS NBA · ' + data.season + '/' + String(data.season + 1).slice(-2), pad, 155, 24, accent, 800, nameLimit);
 text(data.name, pad, 232, 72, ink, 800, nameLimit);
 text(data.team, pad, 277, 23, muted, 600, nameLimit);

 const reference = (data.side === 'over' ? 'Más de ' : 'Menos de ') + number.format(data.line);
 const metrics = [
  ['ESTADÍSTICA', markets[data.market]], ['REFERENCIA', reference],
  ['PROMEDIO', summary.average === null ? '—' : number.format(summary.average)],
  ['CUMPLEN', summary.hits + '/' + summary.n],
 ];
 const cell = content / metrics.length;
 ctx.fillStyle = light ? '#f8faff' : '#17243c';
 ctx.beginPath();
 ctx.roundRect(pad, heroEnd, content, 105, 19);
 ctx.fill();
 metrics.forEach(([label, result], index) => {
  const x = pad + index * cell + 15;
  text(label, x, heroEnd + 33, 20, muted, 700, cell - 30);
  text(result, x, heroEnd + 78, 36, index === 3 ? green : ink, 800, cell - 30);
 });

 const left = pad + 77;
 const right = width - pad;
 const top = heroEnd + 172;
 const bottom = height - 220;
 const step = (right - left) / Math.max(1, entries.length);
 const y = (stat: number) => bottom - (bottom - top) * stat / max;
 text(entries.length + ' PARTIDOS RECIENTES DE LA MUESTRA', pad, top - 28, 21, muted, 700);
 entries.forEach(({ game, stat }, index) => {
  const x = left + (index + .5) * step;
  const bar = Math.min(step * .63, 76);
  ctx.textAlign = 'center';
  if (stat !== null) {
   const color = stat === data.line ? accent : (data.side === 'over' ? stat > data.line : stat < data.line) ? green : red;
   ctx.fillStyle = color;
   ctx.beginPath();
   ctx.roundRect(x - bar / 2, Math.min(y(stat), bottom - 3), bar, Math.max(3, bottom - y(stat)), [6, 6, 0, 0]);
   ctx.fill();
  }
  text(stat === null ? '—' : number.format(stat), x, y(stat ?? 0) - 10, 23, ink, 800, step - 7);
  text((game.home ? 'vs ' : '@ ') + game.opponent, x, bottom + 34, 19, ink, 700, step - 7);
  text(game.date.slice(8) + '/' + game.date.slice(5, 7), x, bottom + 61, 17, muted, 600, step - 7);
 });
 ctx.textAlign = 'left';
 ctx.setLineDash([8, 6]);
 ctx.strokeStyle = accent;
 ctx.lineWidth = 2;
 ctx.beginPath();
 ctx.moveTo(left, y(data.line));
 ctx.lineTo(right, y(data.line));
 ctx.stroke();
 ctx.setLineDash([]);
 text(number.format(data.line), pad, y(data.line) + 7, 21, accent, 800, 69);
 ctx.fillStyle = divider;
 ctx.fillRect(pad, height - 128, content, 2);
 text(data.competition + ' · ' + data.filters, pad, height - 86, 20, ink, 600);
 text('Frecuencia histórica · Datos cargados al ' + new Date(data.fetchedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }), pad, height - 48, 20, muted, 600);
}
