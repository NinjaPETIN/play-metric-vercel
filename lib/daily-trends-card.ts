import { markets } from './analytics';
import type { DailyStreak, DailyTrendRow, DailyTrends } from './daily-trends';
import { teamColors } from './team-colors';
import type { DefenseMetric } from './team-defense';
import { socialCardStyle } from './performance-card';

import {dailyPercent,dailyNumber,dailyDate} from './daily-trends-format';
export {dailyPercent,dailyNumber,dailyDate} from './daily-trends-format';

export function drawStreakCard(canvas: HTMLCanvasElement, day: string, metric: DefenseMetric, rows: DailyStreak[], images: Record<string, HTMLImageElement | undefined>, direction?:'atLeast'|'below') {
 const width = 1080, height = 1350;
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 if (!ctx || !rows.length) return;
 const {pad,content,ink,muted,highlight,label,tile,teamGlow,masthead} = socialCardStyle(ctx,'vertical',false,width,height);
 teamGlow(rows[0].team, width * .78);
 masthead();
 const portrait = images.portrait;
 const hasPortrait = !!(portrait?.naturalWidth && portrait.naturalHeight);
 if (hasPortrait && portrait) {
  const portraitLeft = 690, portraitTop = 26, portraitBottom = 302;
  const w = 415, h = w * portrait.naturalHeight / portrait.naturalWidth;
  ctx.save();
  ctx.beginPath();
  ctx.rect(portraitLeft, portraitTop, width - portraitLeft - 20, portraitBottom - portraitTop);
  ctx.clip();
  ctx.drawImage(portrait, 670, portraitBottom - h, w, h);
  const fade = ctx.createLinearGradient(0, portraitBottom - 95, 0, portraitBottom);
  fade.addColorStop(0,'#10192c00');
  fade.addColorStop(1,'#10192c');
  ctx.fillStyle = fade;
  ctx.fillRect(portraitLeft,portraitBottom-95,width-portraitLeft,95);
  ctx.restore();
 }
 const titleWidth = hasPortrait ? 603 : content;
 label('Rachas de', pad, 163, 36, muted, 700, titleWidth);
 label(markets[metric], pad, 230, 62, ink, 800, titleWidth);
 label('NBA · ' + dailyDate(day), pad, 275, 28, muted, 600, titleWidth);
 rows.forEach((row, i) => {
  const y = 320 + i * 85, logo = images[row.team];
  tile(pad, y, content, 69);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, y, 118, 69, [12,0,0,12]);
  ctx.clip();
  ctx.fillStyle = teamColors[row.team] ?? '#454e80';
  ctx.fillRect(pad, y, 118, 69);
  if (logo?.naturalWidth) ctx.drawImage(logo, pad + 29, y + 4, 60, 60);
  else label(row.team, pad + 59, y + 44, 27, '#fff', 800, 100, 'center');
  ctx.restore();
  const threshold=direction==='below'?'<'+row.threshold:row.threshold+'+';
  label(row.name + ' · ' + threshold, pad + 139, y + (row.windows?31:44), 32, ink, 800, content - 315);
  if(row.windows)label(row.windows.map((s,i)=>'L'+[5,10,20][i]+' '+(s.n?s.hits+'/'+s.n:'—')).join(' · '),pad+139,y+56,17,muted,600,content-315);
  label(row.count ? row.count + '/' + row.count + ' PJ' : 'Sin racha', width-pad-20, y+44, 31, highlight, 800, 150, 'right');
 });
 label('Partidos jugados consecutivos · Temporada regular', pad, height - 108, 25, muted, 600);
 label('El umbral indicado se alcanzó en todos los partidos de la racha.', pad, height - 68, 22, muted, 600);
}

export function drawDailyCard(canvas: HTMLCanvasElement, report: DailyTrends, metric: DefenseMetric, rows: DailyTrendRow[], portrait?: HTMLImageElement) {
 const width = 1400, height = 520 + rows.length * 61;
 canvas.width=width;
 canvas.height=height;
 const ctx=canvas.getContext('2d');
 if(!ctx || !rows.length) return;
 const {pad,content,ink,muted,accent,highlight,border,label,tile,teamGlow,masthead}=socialCardStyle(ctx,'vertical',false,width,height);
 const [leader,...rest] = rows;
 teamGlow(leader.team,0);
 masthead();
 label('NBA · ' + dailyDate(report.day) + ' · ' + report.games + ' PJ', width-pad, 85, 24, muted, 700, 670, 'right');
 label('Tendencias de la jornada · ' + markets[metric],pad,158,49,ink,800);
 tile(pad,190,content,247);
 if(portrait?.naturalWidth) {
  const pictureWidth = 175;
  const pictureHeight = pictureWidth * portrait.naturalHeight / portrait.naturalWidth;
  ctx.drawImage(portrait,pad+10,432-pictureHeight,pictureWidth,pictureHeight);
 }
 const textX=pad+(portrait?.naturalWidth?205:24);
 label(leader.name,textX,253,40,ink,800,540-(textX-pad));
 label(leader.team+' · '+(leader.home?'vs. ':'@ ')+leader.opponent+' · Más de '+dailyNumber.format(leader.line),textX,292,23,muted,700,540-(textX-pad));
 label(leader.form.hits+'/'+leader.form.n+' · '+dailyPercent(leader.form),textX,356,51,highlight,800,450);
 label('L20',textX,402,22,muted,700,145);
 label('TEMP. '+dailyPercent(leader.season)+' · VS. '+dailyPercent(leader.versus)+' · CRUCE '+(leader.grade??'—'),textX+65,402,21,accent,700,455-(textX-pad));
 label('ÚLTIMOS PARTIDOS',pad+675,243,19,muted);
 bars(leader,pad+675,258,content-716,138,true);

 const cols=[pad+23,pad+70,pad+458,pad+812,pad+937,pad+1061,pad+1190];
 ['#','JUGADOR','ÚLTIMOS 10','L20','TEMP.','VS. RIVAL','CRUCE'].forEach((text,i)=>label(text,cols[i],479,19,muted,700,186));
 rest.forEach((row,index)=>{
  const y=495+index*61;
  ctx.fillStyle=border;
  ctx.fillRect(pad,y,content,1);
  label(String(index+2),cols[0],y+36,21,muted);
  label(row.name,cols[1],y+25,24,ink,800,360);
  label(row.team+' · '+(row.home?'vs. ':'@ ')+row.opponent+' · Más de '+dailyNumber.format(row.line),cols[1],y+48,17,muted,600,360);
  bars(row,cols[2],y+10,292,39,false);
  [row.form,row.season,row.versus].forEach((sample,i)=>{
   label((sample.n?sample.hits+'/'+sample.n+' · ':'')+dailyPercent(sample),cols[i+3],y+29,18,highlight,800,116);
   if(i===2&&sample.n>0&&sample.n<5) label('Muestra corta',cols[i+3],y+49,14,muted,600,116);
  });
  label(row.grade??'—',cols[6],y+37,23,accent,800);
 });
 label('Referencias de Statlane · Frecuencia histórica · Nota según defensa del rival',pad,height-38,19,muted,600);

 function bars(row: DailyTrendRow, x:number, y:number, w:number, h:number, large:boolean) {
  const max=Math.max(1,row.line,...row.recent.map(game=>game.value??0))*1.18;
  const step=w/Math.max(1,row.recent.length);
  row.recent.forEach((game,index)=>{
   const left=x+index*step;
   if(game.value!==null) {
    const bar=Math.max(2,h*game.value/max);
    ctx!.fillStyle=game.value>row.line?highlight:game.value===row.line?accent:'#ff8796';
    ctx!.fillRect(left,y+h-bar,step*.77,bar);
   }
   if(large) label(game.opponent,left+step*.38,y+h+21,16,muted,700,step-2,'center');
  });
  ctx!.strokeStyle=accent;
  ctx!.setLineDash([5,5]);
  ctx!.beginPath();
  ctx!.moveTo(x,y+h-h*row.line/max);
  ctx!.lineTo(x+w,y+h-h*row.line/max);
  ctx!.stroke();
  ctx!.setLineDash([]);
 }
}
