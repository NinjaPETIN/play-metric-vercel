// Official NBA CDN: never import a live, mismatched or incomplete box score.
import {nbaTeams} from './free_source.mjs';
export function normalizeNbaBoxscore(payload, calendarGame, season){
 const g=payload?.game;
 if(!g||g.gameStatus!==3||g.gameId!==calendarGame.id)throw Error('NBA: partido no terminado o ID incorrecto');
 const h=g.homeTeam,a=g.awayTeam;
 if(h?.teamTricode!==calendarGame.home||a?.teamTricode!==calendarGame.away||h.teamId!==calendarGame.homeId||a.teamId!==calendarGame.awayId)throw Error('NBA: equipos no coinciden con calendario');
 if(!String(g.gameTimeUTC).startsWith(calendarGame.startsAt?.slice(0,10)??calendarGame.date))throw Error('NBA: fecha no coincide');
 const count=v=>{if(!Number.isInteger(v)||v<0)throw Error('NBA: estadística inválida');return v;};
 const homeScore=count(h.score),awayScore=count(a.score);
 if(!homeScore||!awayScore||homeScore===awayScore)throw Error('NBA: marcador inválido');
 const players=[],seen=new Set();
 for(const [t,o] of [[h,a],[a,h]]){
  if(!Array.isArray(t.players))throw Error('NBA: plantilla incompleta');let points=0,played=0;
  for(const p of t.players){
   if(p.played!=='1')continue;
   const s=p.statistics,m=/^PT(\d+)M([\d.]+)S$/.exec(s?.minutes??'');
   if(!m||Number(m[2])>=60)throw Error('NBA: minutos inválidos');
   const minutes=Number(m[1])+Number(m[2])/60;if(minutes===0)continue;if(minutes>100)throw Error('NBA: minutos fuera de rango');
   const stats={};
   for(const [target,key] of Object.entries({points:'points',rebounds:'reboundsTotal',assists:'assists',threes:'threePointersMade',steals:'steals',blocks:'blocks',turnovers:'turnovers',fieldGoalsMade:'fieldGoalsMade',fieldGoalsAttempted:'fieldGoalsAttempted',threeAttempts:'threePointersAttempted',freeThrowsMade:'freeThrowsMade',freeThrowsAttempted:'freeThrowsAttempted',offensiveRebounds:'reboundsOffensive',defensiveRebounds:'reboundsDefensive'}))stats[target]=count(s[key]);
   if(stats.points!==2*stats.fieldGoalsMade+stats.threes+stats.freeThrowsMade||stats.rebounds!==stats.offensiveRebounds+stats.defensiveRebounds||stats.fieldGoalsMade>stats.fieldGoalsAttempted||stats.threes>stats.threeAttempts||stats.freeThrowsMade>stats.freeThrowsAttempted||stats.threes>stats.fieldGoalsMade||stats.threeAttempts>stats.fieldGoalsAttempted)throw Error('NBA: totales inconsistentes');
   points+=stats.points;played++;
   if(nbaTeams.has(t.teamTricode)){
    if(!Number.isSafeInteger(p.personId)||p.personId<=0||seen.has(p.personId)||typeof p.name!=='string'||!p.name.trim())throw Error('NBA: identidad inválida o repetida');
    seen.add(p.personId);players.push({id:p.personId,name:p.name,team:t.teamTricode,game:{gameId:g.gameId,team:t.teamTricode,date:calendarGame.date,opponent:o.teamTricode,home:t===h,minutes,played:true,...stats}});
   }
  }
  if(played<5||points!==t.score)throw Error('NBA: cobertura incompleta');
 }
 return {season,competition:calendarGame.competition,players,teamGame:{id:g.gameId,date:calendarGame.date,home:h.teamTricode,away:a.teamTricode,homeScore,awayScore}};
}

export async function preferredBoxscore(game,season,official,fallback,state){
 if(!state.unavailable){
  try{const result=normalizeNbaBoxscore(await official(game.id),game,season);state.verified++;return result;}
  catch{state.failures++;if(state.failures>=2)state.unavailable=true;}
 }
 const result=await fallback();state.fallback++;return result;
}
