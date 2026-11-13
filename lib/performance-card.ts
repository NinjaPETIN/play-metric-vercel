import type {BoxData} from './live-boxscore';
import {teamColors} from './team-colors';

export type CardFormat='square'|'vertical'|'wide';
export type CardPlayer=BoxData['teams'][number]['players'][number];

export function drawPerformanceCard(canvas:HTMLCanvasElement,format:CardFormat,light:boolean,player:CardPlayer,team:string,game:BoxData['game'],portrait?:HTMLImageElement){
 const wide=format==='wide',vertical=format==='vertical';
 const w=wide?1600:1080,h=wide?900:vertical?1350:1080;
 canvas.width=w;
 canvas.height=h;
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 const ink=light?'#172239':'#f4f7fc',muted=light?'#4c5d78':'#aab9d2';
 const accent=light?'#4848b8':'#a9a5ff',mint=light?'#08765f':'#67e3bb';
 const pad=wide?72:56,content=w-2*pad,statsY=h-(wide?262:vertical?334:300),footerY=h-105;
 const hero=ctx.createLinearGradient(0,0,w,h*.6);
 hero.addColorStop(0,light?'#f6f8ff':'#101827');
 hero.addColorStop(1,light?'#e8ebfa':'#23254b');
 ctx.fillStyle=hero;
 ctx.fillRect(0,0,w,h);
 ctx.fillStyle=accent;
 ctx.fillRect(0,0,w,12);

 const portraitWidth=wide?685:vertical?580:530,portraitX=w-pad-portraitWidth;
 ctx.save();
 ctx.beginPath();
 ctx.rect(0,0,w,statsY);
 ctx.clip();
 ctx.globalAlpha=light?.12:.26;
 ctx.fillStyle=teamColors[team]??accent;
 ctx.beginPath();
 ctx.arc(w-pad-portraitWidth*.43,statsY*.61,portraitWidth*.48,0,Math.PI*2);
 ctx.fill();
 ctx.globalAlpha=1;
 if(portrait){
  const scale=Math.min(portraitWidth/portrait.naturalWidth,(statsY-125)/portrait.naturalHeight);
  const dw=portrait.naturalWidth*scale,dh=portrait.naturalHeight*scale;
  ctx.drawImage(portrait,portraitX+(portraitWidth-dw)/2,statsY-dh,dw,dh);
 }
 ctx.restore();

 const label=(text:string,x:number,y:number,size:number,color:string,bold=false,maxWidth?:number)=>{
  ctx.font=(bold?'700 ':'')+size+'px Arial, sans-serif';
  ctx.fillStyle=color;
  ctx.fillText(text,x,y,maxWidth);
 };
 label('STATLANE',pad,90,43,ink,true);
 label('ACTUACIÓN DEL PARTIDO',pad,138,24,muted,true);
 const nameWidth=portrait?portraitX-pad+35:content;
 const nameSize=wide?90:vertical?82:75;
 const words=player.name.trim().split(/\s+/);
 const split=words.length>1?words.length-1:words.length;
 const lines=[words.slice(0,split).join(' '),words.slice(split).join(' ')].filter(Boolean);
 const nameY=vertical?382:wide?280:319;
 lines.forEach((line,i)=>label(line,pad,nameY+i*nameSize,nameSize,ink,true,nameWidth));
 label(team,pad,nameY+lines.length*nameSize+13,32,accent,true);

 const statsH=footerY-statsY-20,column=content/3;
 ctx.fillStyle=light?'#e1e6f7':'#151e33';
 ctx.beginPath();
 ctx.roundRect(pad,statsY,content,statsH,24);
 ctx.fill();
 const stats=[['PTS',player.points],['REB',player.rebounds],['AST',player.assists]] as const;
 stats.forEach(([name,value],index)=>{
  const x=pad+column*index;
  if(index){
   ctx.fillStyle=light?'#bec8e0':'#384461';
   ctx.fillRect(x,statsY+22,2,statsH-44);
  }
  ctx.textAlign='center';
  label(String(value??'—'),x+column/2,statsY+statsH*.54,statsH*.49,index===0?mint:ink,true);
  label(name,x+column/2,statsY+statsH*.81,25,muted,true);
 });
 ctx.textAlign='left';
 const score=game.away+' '+(game.awayScore??'—')+' - '+(game.homeScore??'—')+' '+game.home;
 const status=game.state==='final'?'Final':game.detail;
 label(score+' · '+status,pad,h-60,wide?34:30,ink,true,content-160);
 ctx.textAlign='right';
 label('ESPN',w-pad,h-60,25,muted,true);
 ctx.textAlign='left';
}
