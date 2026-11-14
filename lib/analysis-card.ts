import { markets, summarizeGames, value, type Game, type Market } from './analytics';
import { cardSizes, socialCardStyle, type CardFormat } from './performance-card';

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export function drawAnalysisCard(canvas: HTMLCanvasElement, format: CardFormat, light: boolean, data: {
 name: string; team: string; teamCode?: string; games: Game[]; market: Market; line: number; side: 'over' | 'under';
 season: number; competition: string; filters: string;
}, portrait?: HTMLImageElement) {
 const [width, height] = cardSizes[format];
 canvas.width = width;
 canvas.height = height;
 const context = canvas.getContext('2d');
 if (!context) return;
 const ctx = context;
 const { pad, content, ink, muted, accent, highlight, border, label: text, tile, teamGlow, masthead } = socialCardStyle(ctx, format, light, width, height);
 const red = light ? '#af3a51' : '#ff8796';
 teamGlow(data.teamCode ?? '', width * .82);
 masthead();
 text('NBA  /  ' + data.season + '/' + String(data.season + 1).slice(-2), width - pad, 85, 25, muted, 600, content / 2, 'right');
 const summary = summarizeGames(data.games, data.market, data.line, data.side);
 const rows = data.games.filter(game => game.played && game.minutes > 0).slice(0, 10).reverse();
 const entries = rows.map(game => ({ game, stat: value(game, data.market) }));
 const max = Math.max(1, data.line, ...entries.map(({stat}) => stat ?? 0)) * 1.18;

 const heroEnd = height * .37;
 if (portrait?.naturalWidth) {
  const assetWidth = Math.min(content * .41, (heroEnd - 85) * portrait.naturalWidth / portrait.naturalHeight);
  const assetHeight = assetWidth * portrait.naturalHeight / portrait.naturalWidth;
  ctx.drawImage(portrait, width - pad - assetWidth, heroEnd - assetHeight, assetWidth, assetHeight);
 }
 const nameLimit = portrait ? content * .59 : content;
 text('ANÁLISIS DEL JUGADOR', pad, 155, 24, accent, 800, nameLimit);
 text(data.name, pad, 232, 72, ink, 800, nameLimit);
 text(data.team, pad, 277, 23, muted, 600, nameLimit);

 const reference = (data.side === 'over' ? 'Más de ' : 'Menos de ') + number.format(data.line);
 const metrics = [
  ['ESTADÍSTICA', markets[data.market]], ['REFERENCIA', reference],
  ['PROMEDIO', summary.average === null ? '—' : number.format(summary.average)],
  ['CUMPLEN', summary.hits + '/' + summary.n],
 ];
 const gap = 12;
 const cell = (content - gap * (metrics.length - 1)) / metrics.length;

 metrics.forEach(([label, result], index) => {
  const left = pad + index * (cell + gap);
  tile(left, heroEnd, cell, 105);
  const x = left + 15;
  text(label, x, heroEnd + 33, 20, muted, 700, cell - 30);
  text(result, x, heroEnd + 78, 36, index === 3 ? highlight : ink, 800, cell - 30);
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
  if (stat !== null) {
   const color = stat === data.line ? accent : (data.side === 'over' ? stat > data.line : stat < data.line) ? highlight : red;
   ctx.fillStyle = color;
   ctx.beginPath();
   ctx.roundRect(x - bar / 2, Math.min(y(stat), bottom - 3), bar, Math.max(3, bottom - y(stat)), [6, 6, 0, 0]);
   ctx.fill();
  }
  text(stat === null ? '—' : number.format(stat), x, y(stat ?? 0) - 10, 23, ink, 800, step - 7, 'center');
  text((game.home ? 'vs ' : '@ ') + game.opponent, x, bottom + 34, 19, ink, 700, step - 7, 'center');
  text(game.date.slice(8) + '/' + game.date.slice(5, 7), x, bottom + 61, 17, muted, 600, step - 7, 'center');
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
 ctx.fillStyle = border;
 ctx.fillRect(pad, height - 128, content, 2);
 text(data.competition + ' · ' + data.filters, pad, height - 86, 20, ink, 600);
 text('Frecuencia histórica', pad, height - 48, 22, muted, 600);
 const legend = [['Cumple', highlight], ['No cumple', red], ['Iguala', accent]] as const;
 legend.forEach(([name, color], index) => {
  const x = width - pad - 394 + index * 140;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, height - 62, 13, 13, 3);
  ctx.fill();
  text(name, x + 20, height - 49, 17, muted, 700, 115);
 });
}
