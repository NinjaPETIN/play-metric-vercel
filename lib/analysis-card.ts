import {referenceLabel,type AnalysisReference} from './market-reference';
import {gameKey} from './analysis-selection';
import { markets, summarizeGames, value, type Game, type Market } from './analytics';
import { cardSizes, socialCardStyle, type CardFormat } from './performance-card';

import { defenseMetrics, matchupGrade, type DefenseRank } from './team-defense';
import { teamNames } from './team-overview';

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
const positionLabel=(position:string)=>position.split('-').map(part=>({Guard:'Base / Escolta',Forward:'Alero',Center:'Pívot'}[part.trim()]??part.trim())).join(' / ');
type CardData = {
 reference?:AnalysisReference; name: string; team: string; teamCode?: string; position?: string; games: Game[]; market: Market; line: number; side: 'over' | 'under';
 season: number; competition: string; filters: string;windowGames?:Game[];excluded?:string[];
};

export function drawAnalysisCard(canvas: HTMLCanvasElement, format: CardFormat, light: boolean, data: CardData, images: Images, rival: string, ranks: DefenseRank[], reduced = false) {
 if (format === 'vertical' && !reduced) return drawEditorialAnalysis(canvas, light, data, images, rival, ranks);
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
 const max = Math.max(1, reduced ? 0 : data.line, ...entries.map(({stat}) => stat ?? 0)) * 1.18;

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
 if (data.position && format !== 'wide') text(positionLabel(data.position), pad, 276, 21, muted, 600, nameLimit);
 if (rival && format !== 'wide') {
  const y = heroEnd - 70;
  if (!cardImage(ctx, images.team, pad, y, 56, border)) text(data.teamCode ?? '—', pad + 28, y + 35, 22, ink, 800, 55, 'center');
  text('VS', pad + 75, y + 34, 18, accent, 800, 35, 'center');
  if (!cardImage(ctx, images.rival, pad + 94, y, 56, border)) text(rival, pad + 122, y + 35, 22, ink, 800, 55, 'center');
 }

 const reference = (data.side === 'over' ? 'Más de ' : 'Menos de ') + number.format(data.line);
 const metrics = reduced ? [
  ['ESTADÍSTICA', markets[data.market]],
  ['PROMEDIO', summary.average === null ? '—' : number.format(summary.average)],
  ['PARTIDOS', String(summary.n)],
 ] : [
  ['ESTADÍSTICA', markets[data.market]], [referenceLabel(data.reference??{kind:'automatic'}).toUpperCase(), reference],
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
   const color = reduced ? accent : stat === data.line ? accent : (data.side === 'over' ? stat > data.line : stat < data.line) ? highlight : red;
   ctx.fillStyle = color;
   ctx.fillRect(x - bar / 2, Math.min(y(stat), bottom - 3), bar, Math.max(3, bottom - y(stat)));
  }
  text(stat === null ? '—' : number.format(stat), x, !reduced&&Math.abs(y(stat??0)-10-y(data.line))<27?y(data.line)-20:y(stat??0)-10, 23, ink, 800, step - 7, 'center');
  text((game.home ? 'vs ' : '@ ') + game.opponent, x, bottom + 34, 19, ink, 700, step - 7, 'center');
  text(game.date.slice(8) + '/' + game.date.slice(5, 7), x, bottom + 61, 17, muted, 600, step - 7, 'center');
 });
 if (!reduced) {
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
 }
 ctx.fillStyle = border;
 ctx.fillRect(pad, height - 128, content, 2);
 if(!reduced){const origin=data.reference;const source=referenceLabel(origin??{kind:'automatic'})+(origin?.kind==='market'?' · Cuota '+origin.price.toLocaleString('es-AR',{maximumFractionDigits:2})+' · '+new Date(origin.updatedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' ARG':'');text(source,pad,height-137,16,accent,600);}
 text(data.competition + (reduced ? '' : ' · ' + data.filters), pad, height - 86, 20, ink, 600);
 if (reduced) return;
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

function drawEditorialAnalysis(canvas: HTMLCanvasElement, light: boolean, data: CardData, images: Images, rival: string, ranks: DefenseRank[]) {
 const [width,height] = cardSizes.vertical;
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;
 const {pad,content,ink,muted,accent,highlight,border,label,tile,teamGlow,masthead} = socialCardStyle(ctx,'vertical',light,width,height);
 const red = light ? '#aa3956' : '#ff7489';
 const games = data.games.filter(game=>game.played && game.minutes > 0);
 const summarize = (rows:Game[]) => summarizeGames(rows,data.market,data.line,data.side);
 const window=data.windowGames??games,include=(rows:Game[])=>rows.filter(game=>!data.excluded?.includes(gameKey(game)));
 const sample = summarize(games), last5 = summarize(include(window.slice(0,5))), last10 = summarize(include(window.slice(0,10)));
 const entries = games.slice(0,10).reverse();
 const pct = sample.rate === null ? '—' : Math.round(sample.rate * 100) + '%';
 const line = number.format(data.line);
 const side = data.side === 'over' ? 'Más de' : 'Menos de';
 const season = data.season + '/' + String(data.season + 1).slice(-2);
 const [surname,...given] = data.name.trim().split(/\s+/).reverse();
 const nameWidth = images.portrait?.naturalWidth ? 495 : content - 70;

 teamGlow(data.teamCode ?? '',width * .79);
 masthead();
 label('NBA · ' + season,width-pad,86,26,muted,700,420,'right');
 tile(pad,118,content,365);
 ctx.save();
 ctx.beginPath();
 ctx.roundRect(pad,118,content,365,24);
 ctx.clip();
 teamGlow(data.teamCode ?? '',width * .81);
 const mark = images.team, portrait = images.portrait;
 if (mark?.naturalWidth) {
  ctx.globalAlpha=.18;
  ctx.drawImage(mark, width-pad-416,130,390,340);
  ctx.globalAlpha=1;
 }
 if (portrait?.naturalWidth) {
  const w = Math.min(570, 365 * portrait.naturalWidth / portrait.naturalHeight);
  const h = w * portrait.naturalHeight / portrait.naturalWidth;
  ctx.drawImage(portrait,width-pad-w+18,483-h,w,h);
 }
 ctx.restore();
 const teamName = data.teamCode ? teamNames[data.teamCode] ?? data.teamCode : '';
 label([data.position?positionLabel(data.position):'',teamName].filter(Boolean).join(' · '),pad+34,184,24,accent,700,nameWidth);
 if (given.length) label(given.reverse().join(' '),pad+34,249,44,muted,700,nameWidth);
 label(surname.toLocaleUpperCase('es-AR'),pad+34,353,91,ink,800,nameWidth);
 cardImage(ctx,mark,pad+34,395,45,border);
 label(data.teamCode ?? '—',pad+90,426,25,ink,800,76);
 if (rival) {
  label('VS.',pad+168,425,19,muted,700,56);
  cardImage(ctx,images.rival,pad+226,395,45,border);
  label(rival,pad+280,426,25,ink,800,94);
 }

 tile(pad,502,content,150);
 label(line,pad+30,605,90,ink,800,210);
 label(markets[data.market].toUpperCase(),pad+246,563,34,ink,800,325);
 label(side + ' · '+referenceLabel(data.reference??{kind:'automatic'}),pad+246,608,22,muted,600,335);
 label('FRECUENCIA',width-pad-253,558,22,muted,800,158,'right');
 label(sample.hits + ' de ' + sample.n,width-pad-253,602,22,muted,700,150,'right');
 label(pct,width-pad-28,607,78,highlight,800,206,'right');

 const rank = ranks.find(row=>row.metric===data.market);
 const tiles = [
  ['HASTA 5 PJ',last5.n ? last5.hits+'/'+last5.n : '—','Cumplen la línea'],
  ['HASTA 10 PJ',last10.n ? last10.hits+'/'+last10.n : '—','Cumplen la línea'],
  ['PROM. '+last10.n+' PJ',last10.average === null ? '—' : number.format(last10.average),markets[data.market]+' por partido'],
  ['CRUCE',rival ? matchupGrade(ranks,data.market,data.side) ?? '—' : '—',rank ? rank.rank+'.º de '+rank.teams+' · '+rival : rival || 'Rival sin seleccionar'],
 ];
 const tileWidth = (content-45)/4;
 tiles.forEach(([title,result,note],index)=>{
  const x = pad+index*(tileWidth+15), middle = x+tileWidth/2;
  tile(x,668,tileWidth,132);
  label(title,middle,701,20,muted,800,tileWidth-20,'center');
  label(result,middle,756,48,index===3?accent:highlight,800,tileWidth-20,'center');
  label(note,middle,782,17,muted,600,tileWidth-20,'center');
 });

 tile(pad,817,content,356);
 label('ÚLTIMOS ' + entries.length + ' PARTIDOS',pad+25,860,24,muted,800);
 label('— —  Línea '+line,width-pad-25,860,23,accent,700,290,'right');
 const values = entries.map(game=>value(game,data.market));
 const max = Math.max(1,data.line,...values.map(stat=>stat??0))*1.12;
 const y = (stat:number) => 1100 - stat/max*204;
 const step=(content-50)/Math.max(1,entries.length);
 entries.forEach((game,index)=>{
  const x=pad+25+step*(index+.5), stat=values[index], bar=Math.min(step*.82,96);
  if (stat !== null) {
   ctx.fillStyle=stat===data.line?accent:(data.side==='over'?stat>data.line:stat<data.line)?highlight:red;
   ctx.beginPath();
   ctx.roundRect(x-bar/2, Math.min(1095,y(stat)),bar,Math.max(5,1100-y(stat)),5);
   ctx.fill();
  }
  label(stat === null ? '—' : number.format(stat),x,Math.abs(y(stat??0)-12-y(data.line))<28?y(data.line)-20:y(stat??0)-12,24,ink,800,step-8,'center');
  if (!cardImage(ctx,images[game.opponent],x-18,1115,36,border)) label(game.opponent,x,1140,16,muted,700,step-6,'center');
 });
 ctx.strokeStyle=accent;
 ctx.lineWidth=2;
 ctx.setLineDash([9,7]);
 ctx.beginPath();
 ctx.moveTo(pad+25,y(data.line));
 ctx.lineTo(width-pad-25,y(data.line));
 ctx.stroke();
 ctx.setLineDash([]);
 label(data.name+' cumplió la línea en '+sample.hits+' de '+sample.n+' partidos de la muestra.',pad,1225,28,ink,700);
 const source=data.reference?.kind==='market'?data.reference.book+' · Cuota '+data.reference.price.toLocaleString('es-AR',{maximumFractionDigits:2})+' · '+new Date(data.reference.updatedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' ARG':referenceLabel(data.reference??{kind:'automatic'});
 label(source,pad,1253,18,accent,600);
 label(data.competition+' · '+data.filters,pad,1282,18,muted,600);
 label('Frecuencia histórica · Statlane',pad,1310,21,muted,600);
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
