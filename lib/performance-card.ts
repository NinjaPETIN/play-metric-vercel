import type { BoxData } from './live-boxscore';
import { periodLabel } from './match-period-stats';
import { teamColors } from './team-colors';

export const cardSizes = { square: [1080, 1080], vertical: [1080, 1350], wide: [1600, 900] } as const;
export type CardFormat = keyof typeof cardSizes;
export type CardPlayer = BoxData['teams'][number]['players'][number];
type Team = BoxData['teams'][number];
type Card = { kind: 'player'; player: CardPlayer; team: string; game: BoxData['game'] } | { kind: 'result'; data: BoxData };

export function matchLeaders(data: BoxData) {
 return data.teams.map(team => team.players.reduce<CardPlayer | undefined>((leader, player) => {
  if (player.didNotPlay || player.points === null) return leader;
  return player.points > (leader?.points ?? -1) ? player : leader;
 }, undefined));
}

export function matchCardLink(game: BoxData['game']) {
 return game.nbaId ? '/partidos/' + game.nbaId + '?matchTab=live' : null;
}

export function drawSocialCard(canvas: HTMLCanvasElement, format: CardFormat, light: boolean, card: Card, images: Readonly<Record<string, HTMLImageElement | undefined>>) {
 const [width, height] = cardSizes[format];
 canvas.width = width;
 canvas.height = height;
 const context = canvas.getContext('2d');
 if (!context) return;
 const ctx = context;
 const wide = format === 'wide';
 const pad = wide ? 72 : 56;
 const content = width - pad * 2;
 const ink = light ? '#172039' : '#f3f5ff';
 const muted = light ? '#455473' : '#b2bed7';
 const accent = light ? '#423ab0' : '#a9a6ff';
 const highlight = light ? '#076955' : '#61e1b9';
 const panel = light ? '#f8faff' : '#18243b';
 const border = light ? '#cbd4e7' : '#354463';
 const game = card.kind === 'result' ? card.data.game : card.game;

 function label(value: string, x: number, y: number, size: number, color = ink, weight = 700, maxWidth = content, align: CanvasTextAlign = 'left') {
  ctx.textAlign = align;
  ctx.font = weight + ' ' + size + 'px Poppins, Arial, sans-serif';
  while (ctx.measureText(value).width > maxWidth && size > 14) {
   size -= 1;
   ctx.font = weight + ' ' + size + 'px Poppins, Arial, sans-serif';
  }
  ctx.fillStyle = color;
  ctx.fillText(value, x, y, maxWidth);
 }

 function tile(x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 24);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();
 }

 function image(key: string, x: number, y: number, w: number, h: number) {
  const asset = images[key];
  if (!asset?.naturalWidth || !asset.naturalHeight) return false;
  const scale = Math.min(w / asset.naturalWidth, h / asset.naturalHeight);
  const dw = asset.naturalWidth * scale;
  const dh = asset.naturalHeight * scale;
  ctx.drawImage(asset, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return true;
 }

 const background = ctx.createLinearGradient(0, 0, width, height);
 background.addColorStop(0, light ? '#f1f5ff' : '#0b1325');
 background.addColorStop(1, light ? '#e3e9fa' : '#172744');
 ctx.fillStyle = background;
 ctx.fillRect(0, 0, width, height);

 function teamGlow(code: string, x: number) {
  const glow = ctx.createRadialGradient(x, height * .28, 0, x, height * .28, width * .48);
  const color = teamColors[code] ?? '#6574ff';
  glow.addColorStop(0, color + (light ? '28' : '64'));
  glow.addColorStop(1, color + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
 }

 teamGlow(card.kind === 'player' ? card.team : game.away, card.kind === 'player' ? width * .82 : 0);
 if (card.kind === 'result') teamGlow(game.home, width);
 ctx.fillStyle = '#6574ff';
 ctx.fillRect(pad, 0, 134, 10);
 const mark = new Path2D('M21 2 3 8v5l12 4-12 4v3l18-6v-5L9 9l12-4Z');
 ctx.save();
 ctx.translate(pad, 54);
 ctx.scale(1.7, 1.7);
 ctx.fill(mark);
 ctx.restore();
 label('STATLANE', pad + 54, 88, 36, ink, 800);
 const date = new Date(game.startsAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
 label('NBA  /  ' + date, width - pad, 85, 25, muted, 600, content / 2, 'right');

 if (card.kind === 'player') {
  const { player, team } = card;
  const statsY = height - (wide ? 296 : 315);
  const portraitWidth = Math.min(width * .53, 690);
  const portraitX = width - portraitWidth - pad / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 105, width, statsY - 105);
  ctx.clip();
  ctx.globalAlpha = .16;
  image(team, portraitX, 126, portraitWidth, statsY - 140);
  ctx.globalAlpha = 1;
  const hasPortrait = image('portrait', portraitX, 124, portraitWidth, statsY - 124);
  ctx.restore();
  const nameWidth = hasPortrait ? portraitX - pad + 48 : content;
  const name = player.name.trim();
  const space = name.indexOf(' ');
  const nameLines = space > 0 ? [name.slice(0, space), name.slice(space + 1)] : [name];
  const nameY = Math.round(statsY * .52);
  label('ACTUACIÓN DEL PARTIDO', pad, nameY - 93, 26, accent, 800);
  nameLines.forEach((line, index) => label(line, pad, nameY + index * 96, 94, ink, 800, nameWidth));
  const teamY = nameY + (nameLines.length - 1) * 96 + 69;
  const hasLogo = image(team, pad, teamY - 34, 38, 38);
  label(team + (player.didNotPlay ? '  ·  No participó' : player.minutes ? '  ·  ' + player.minutes + ' MIN' : ''), pad + (hasLogo ? 52 : 0), teamY, 29, muted, 700);
  const stats = [['PUNTOS', player.points], ['REBOTES', player.rebounds], ['ASISTENCIAS', player.assists]] as const;
  const col = (content - 32) / 3;
  stats.forEach(([name, value], index) => {
   const x = pad + index * (col + 16);
   tile(x, statsY, col, 162);
   label(String(value ?? '—'), x + col / 2, statsY + 91, 76, index === 0 ? highlight : ink, 800, col - 24, 'center');
   label(name, x + col / 2, statsY + 133, 23, muted, 700, col - 24, 'center');
  });
 } else {
  const { teams, context } = card.data;
  const periodRows = context?.periods ?? [];
  const periodCount = Math.max(0, ...periodRows.map(row => row.scores.length));
  const heroY = Math.round(height * .235);
  const scoreY = heroY + (wide ? 146 : 165);
  const badgeSize = wide ? 118 : 122;
  const scoreWidth = content * .38;
  const leaders = matchLeaders(card.data);
  label('RESULTADO FINAL', width / 2, heroY - 26, 31, accent, 800, content, 'center');
  const teamCenter = (index: number) => width / 2 + (index === 0 ? -1 : 1) * content * .33;
  teams.forEach((team, index) => {
   const center = teamCenter(index);
   if (!image(team.code, center - badgeSize / 2, heroY, badgeSize, badgeSize)) label(team.code, center, heroY + 88, 62, accent, 800, badgeSize * 1.3, 'center');
   label(team.name, center, heroY + badgeSize + 40, 28, ink, 700, content * .29, 'center');
  });
  label(teams.map(team => team.score).join(' - '), width / 2, scoreY - 36, wide ? 110 : 101, ink, 800, scoreWidth, 'center');
  const detailY = Math.round(height * .55);
  if (periodCount) {
   const tableHeight = 128;
   const start = pad + 103;
   const step = (content - 120) / periodCount;
   tile(pad, detailY, content, tableHeight);
   teams.forEach((team: Team, index) => label(team.code, pad + 23, detailY + 74 + index * 34, 22, muted, 700, 72));
   for (let index = 0; index < periodCount; index++) {
    const x = start + step * (index + .5);
    const period = index < 4 ? 'C' + (index + 1) : periodLabel(index + 1).replace('Prórroga', 'PR');
    label(period, x, detailY + 35, 23, muted, 700, step - 4, 'center');
    teams.forEach((team, side) => label(String(periodRows.find(row => row.team === team.code)?.scores[index] ?? '—'), x, detailY + 74 + side * 34, 26, ink, 700, step - 4, 'center'));
   }
  }
  const leadersY = detailY + (periodCount ? 150 : 16);
  const column = (content - 18) / 2;
  leaders.forEach((leader, index) => {
   if (!leader) return;
   const x = pad + index * (column + 18);
   tile(x, leadersY, column, 102);
   label(teams[index].code + '  /  LÍDER EN PUNTOS', x + 22, leadersY + 32, 19, muted, 700, column - 112);
   label(leader.name, x + 22, leadersY + 73, 29, ink, 700, column - 112);
   label(String(leader.points), x + column - 21, leadersY + 74, 47, highlight, 800, 74, 'right');
  });
 }

 const footerY = height - 56;
 ctx.fillStyle = border;
 ctx.fillRect(pad, footerY - 46, content, 2);
 if (card.kind === 'player') {
  const score = game.away + ' ' + (game.awayScore ?? '—') + ' - ' + (game.homeScore ?? '—') + ' ' + game.home;
  label(score + '  ·  ' + (game.state === 'final' ? 'Final' : game.detail), pad, footerY, 27, ink, 700, content - 195);
 } else {
  label('Marcador NBA', pad, footerY, 26, ink);
 }
 label('Datos de ESPN', width - pad, footerY, 24, muted, 600, 180, 'right');
}
