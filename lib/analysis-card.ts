import { markets, summarizeGames, value, type Game, type Market } from './analytics';
import { cardSizes, socialCardStyle, type CardFormat } from './performance-card';

import { defenseMetrics, matchupGrade, type DefenseRank } from './team-defense';

type Images = Record<string, HTMLImageElement | undefined>;

function cardImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined, x: number, y: number, size: number, fill: string) {
 if (!image?.naturalWidth || !image.naturalHeight) return false;
 ctx.save();
 ctx.beginPath();
 ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
 ctx.clip();
 ctx.fillStyle = fill;
 ctx.fillRect(x, y, size, size);
 const width = Math.min(size * 1.3, size * image.naturalWidth / image.naturalHeight);
 const height = width * image.naturalHeight / image.naturalWidth;
 ctx.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
 ctx.restore();
 return true;
}

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export function drawAnalysisCard(canvas: HTMLCanvasElement, format: CardFormat, light: boolean, data: {
 name: string; team: string; teamCode?: string; position?: string; games: Game[]; market: Market; line: number; side: 'over' | 'under';
 season: number; competition: string; filters: string;
}, images: Images, rival: string, ranks: DefenseRank[]) {
 const portrait = images.portrait;
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

 const heroEnd = Math.round(height * .35);
 if (portrait?.naturalWidth) {
  const assetWidth = Math.min(content * .45, (heroEnd - 85) * portrait.naturalWidth / portrait.naturalHeight);
  const assetHeight = assetWidth * portrait.naturalHeight / portrait.naturalWidth;
  ctx.drawImage(portrait, width - pad - assetWidth, heroEnd - assetHeight, assetWidth, assetHeight);
 }
 const nameLimit = portrait ? content * .55 : content;
 text('ANÁLISIS DEL JUGADOR', pad, 155, 24, accent, 800, nameLimit);
 text(data.name, pad, 211, 67, ink, 800, nameLimit);
 text(data.team, pad, 246, 23, muted, 600, nameLimit);
 if (data.position && format !== 'wide') text(data.position, pad, 276, 21, muted, 600, nameLimit);
 if (rival && format !== 'wide') {
  const y = heroEnd - 70;
  if (!cardImage(ctx, images.team, pad, y, 56, border)) text(data.teamCode ?? '—', pad + 28, y + 35, 22, ink, 800, 55, 'center');
  text('VS', pad + 75, y + 34, 18, accent, 800, 35, 'center');
  if (!cardImage(ctx, images.rival, pad + 94, y, 56, border)) text(rival, pad + 122, y + 35, 22, ink, 800, 55, 'center');
 }

 const reference = (data.side === 'over' ? 'Más de ' : 'Menos de ') + number.format(data.line);
 const metrics = [
  ['ESTADÍSTICA', markets[data.market]], ['REFERENCIA', reference],
  ['PROMEDIO', summary.average === null ? '—' : number.format(summary.average)],
  ['CUMPLEN', summary.hits + '/' + summary.n],
 ];
 const grade = matchupGrade(ranks, data.market, data.side);
 const gauge = rival ? Math.min(205, content * .20) : 0;
 const cell = (content - gauge) / metrics.length;
 ctx.fillStyle = border;
 ctx.fillRect(pad, heroEnd, content, 2);
 metrics.forEach(([label, result], index) => {
  const x = pad + index * cell + 10;
  text(label, x, heroEnd + 39, 19, muted, 700, cell - 18);
  text(result, x, heroEnd + 79, 34, index === 3 ? highlight : ink, 800, cell - 18);
 });
 if (rival) {
  const x = width - pad - gauge / 2;
  tile(width - pad - gauge + 8, heroEnd + 12, gauge - 8, 105);
  ctx.beginPath();
  ctx.arc(x + 4, heroEnd + 58, 34, Math.PI * .77, Math.PI * 2.23);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = grade?.startsWith('A') || grade === 'B' ? highlight : grade === 'D' || grade === 'F' ? red : accent;
  ctx.stroke();
  ctx.lineCap = 'butt';
  text(grade ?? '—', x + 4, heroEnd + 68, 27, ink, 800, 65, 'center');
  text('Cruce vs. ' + rival, x + 4, heroEnd + 103, 16, muted, 700, gauge - 15, 'center');
 }
 const left = pad + 77;
 const right = width - pad;
 const top = heroEnd + 172;
 const bottom = height - 220;
 const step = (right - left) / Math.max(1, entries.length);
 const y = (stat: number) => bottom - (bottom - top) * stat / max;
 text(entries.length + ' PARTIDOS RECIENTES DE LA MUESTRA', pad, top - 28, 21, muted, 700);
 entries.forEach(({ game, stat }, index) => {
  const x = left + (index + .5) * step;
  const bar = Math.min(step * .83, 90);
  if (stat !== null) {
   const color = stat === data.line ? accent : (data.side === 'over' ? stat > data.line : stat < data.line) ? highlight : red;
   ctx.fillStyle = color;
   ctx.fillRect(x - bar / 2, Math.min(y(stat), bottom - 3), bar, Math.max(3, bottom - y(stat)));
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
 text(rival ? 'Cruce según defensa de equipo' : 'Frecuencia histórica', pad, height - 48, 22, muted, 600, content - 440);
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

export function drawDefenseCard(canvas: HTMLCanvasElement, format: CardFormat, light: boolean, data: {
 name: string; teamCode?: string; season: number; competition: string;
}, rivalName: string, rival: string, rows: DefenseRank[], images: Images) {
 const [width, height] = cardSizes[format];
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;
 const { pad, content, ink, muted, accent, highlight, border, label, teamGlow } = socialCardStyle(ctx, format, light, width, height);
 teamGlow(data.teamCode ?? '', 0);
 teamGlow(rival, width);
 const avatar = Math.min(height * .15, 185);
 const headerY = Math.round(height * .055);
 const left = pad + content * .22;
 const right = width - left;
 if (!cardImage(ctx, images.portrait, left - avatar / 2, headerY, avatar, border)) {
  label(data.name.split(/\s+/).slice(0, 2).map(word => word[0]).join(''), left, headerY + avatar * .65, 40, ink, 800, avatar, 'center');
 }
 if (!cardImage(ctx, images.rival, right - avatar / 2, headerY, avatar, border)) {
  label(rival, right, headerY + avatar * .65, 40, ink, 800, avatar, 'center');
 }
 label('VS', width / 2, headerY + avatar * .61, 42, highlight, 800, content * .12, 'center');
 label(data.name, left, headerY + avatar + 56, 47, ink, 800, content * .43, 'center');
 label(rivalName, right, headerY + avatar + 56, 47, ink, 800, content * .43, 'center');
 const dividerY = headerY + avatar + 89;
 ctx.fillStyle = border;
 ctx.fillRect(pad, dividerY, content, 2);
 label('Defensa del rival', pad, dividerY + 60, 48, ink, 800);
 const start = dividerY + 108;
 const step = (height - 120 - start) / 4;
 defenseMetrics.forEach((metric, index) => {
  const row = rows.find(entry => entry.metric === metric);
  const top = start + step * index;
  label(markets[metric], pad, top + 10, 34, muted, 700);
  label(row ? row.rank + '.º' : '—', width - pad, top + 10, 33, accent, 800, content * .25, 'right');
  const track = top + 37;
  ctx.fillStyle = border;
  ctx.fillRect(pad + 11, track, content - 22, 4);
  if (row) {
   const x = pad + 11 + (content - 22) * (row.rank - 1) / (row.teams - 1);
   ctx.fillStyle = accent;
   ctx.beginPath();
   ctx.arc(x, track + 2, 11, 0, Math.PI * 2);
   ctx.fill();
   label(number.format(row.average) + ' permitidos/PJ · ' + row.games + ' PJ · ' + row.teams + ' equipos', pad, track + 32, 17, muted, 600);
  }
 });
 label('NBA · ' + data.competition + ' · ' + data.season + '/' + String(data.season + 1).slice(-2), pad, height - 54, 21, muted, 700, content * .66);
 ctx.save();
 ctx.translate(width - pad - 216, height - 90);
 ctx.scale(1.45, 1.45);
 ctx.fillStyle = '#6574ff';
 ctx.fill(new Path2D('M21 2 3 8v5l12 4-12 4v3l18-6v-5L9 9l12-4Z'));
 ctx.restore();
 label('STATLANE', width - pad, height - 54, 31, ink, 800, 174, 'right');
}
