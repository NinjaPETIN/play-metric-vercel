// Free-source normalization: exact identity/team/date reconciliation, never fuzzy guesses.
export const nbaTeams=new Set(['ATL','BOS','CLE','NOP','CHI','DAL','DEN','GSW','HOU','LAC','LAL','MIA','MIL','MIN','BKN','NYK','ORL','IND','PHI','PHX','POR','SAC','SAS','OKC','TOR','UTA','MEM','WAS','DET','CHA']);
export const teamCode=code=>({NY:'NYK',GS:'GSW',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS'}[code]??code);
export const nameKey=name=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(?:jr|sr|iii|ii)$/,'');
export function identityIndex(players){const map=new Map();for(const p of players){const key=nameKey(p.name),existing=map.get(key);if(!existing)map.set(key,{id:Number(p.id),name:p.name});else if(existing.id!==Number(p.id))map.set(key,{id:null,name:p.name});}return map;}
export function normalizeFinishedGame(event,summary,calendar,identities){
 const c=event.competitions?.[0];if(!event.status?.type?.completed||!c)throw Error('Partido no terminado');
 const home=c.competitors.find(t=>t.homeAway==='home'),away=c.competitors.find(t=>t.homeAway==='away');
 if(!home||!away)throw Error('Equipos incompletos');const h=teamCode(home.team.abbreviation),a=teamCode(away.team.abbreviation);if(!nbaTeams.has(h)&&!nbaTeams.has(a))throw Error('Partido ajeno a NBA');
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(event.date));
 const matches=calendar.games.filter(g=>g.home===h&&g.away===a&&g.date===date);if(matches.length!==1)throw Error('No coincide con un único partido del calendario NBA');const game=matches[0];
 const homeScore=Number(home.score),awayScore=Number(away.score);if(!Number.isInteger(homeScore)||!Number.isInteger(awayScore)||homeScore<=0||awayScore<=0||homeScore===awayScore)throw Error('Marcador inválido');
 const result=[],seen=new Set();
 for(const [team,opponent,score] of [[h,a,homeScore],[a,h,awayScore]]){
  const block=summary.boxscore?.players?.find(t=>teamCode(t.team.abbreviation)===team)?.statistics?.[0];if(!block?.athletes?.length)throw Error('Box score incompleto');let points=0,played=0;
  for(const row of block.athletes){if(row.didNotPlay)continue;const stats=Object.fromEntries(block.labels.map((key,i)=>[key,row.stats?.[i]]));const min=String(stats.MIN??'');const minutes=min.includes(':')?Number(min.split(':')[0])+Number(min.split(':')[1])/60:Number(min);if(!Number.isFinite(minutes)||minutes<0||!min||min==='--')throw Error('Minutos inválidos');if(!minutes)continue;
   const num=key=>{const n=Number(stats[key]);if(stats[key]===undefined||!Number.isFinite(n)||n<0)throw Error('Estadística inválida: '+key);return n;};const pair=key=>{const p=String(stats[key]).split('-').map(Number);if(p.length!==2||p.some(n=>!Number.isInteger(n)||n<0)||p[0]>p[1])throw Error('Tiros inválidos');return p;};
   const [fieldGoalsMade,fieldGoalsAttempted]=pair('FG'),[threes,threeAttempts]=pair('3PT'),[freeThrowsMade,freeThrowsAttempted]=pair('FT');
   const g={gameId:game.id,team,date:game.date,opponent,home:team===h,minutes,points:num('PTS'),rebounds:num('REB'),assists:num('AST'),threes,played:true,steals:num('STL'),blocks:num('BLK'),turnovers:num('TO'),offensiveRebounds:num('OREB'),defensiveRebounds:num('DREB'),fieldGoalsMade,fieldGoalsAttempted,threeAttempts,freeThrowsMade,freeThrowsAttempted};
   if(g.points!==2*fieldGoalsMade+threes+freeThrowsMade)throw Error('Puntos no concuerdan con tiros');points+=g.points;played++;if(nbaTeams.has(team)){const person=identities.get(nameKey(row.athlete.displayName));if(!person?.id||seen.has(person.id))throw Error('Identidad ausente o ambigua: '+row.athlete.displayName);seen.add(person.id);result.push({id:person.id,name:person.name,team,game:g});}
  }
  if(points!==score||played<5)throw Error('Cobertura incompleta: total de puntos no coincide');
 }
 return {season:calendar.season,competition:game.competition,players:result,teamGame:{id:game.id,date:game.date,home:h,away:a,homeScore,awayScore}};
}
export function mergeFinishedGames(previous,updates,season,competition,now=new Date().toISOString()){
 const ids=new Set(updates.map(u=>u.teamGame.id));if(ids.size!==updates.length)throw Error('Partidos duplicados en la actualización');const players=new Map((previous?.players??[]).map(p=>[Number(p.id),{...p,games:p.games.filter(g=>!ids.has(g.gameId))}]));
 for(const update of updates){if(update.season!==season||update.competition!==competition)throw Error('Temporada o competición no coinciden');for(const row of update.players){const p=players.get(row.id)??{id:row.id,name:row.name,team:row.team,games:[]};p.games.push(row.game);players.set(row.id,p);}}
 const normalized=[...players.values()].filter(p=>p.games.length).map(p=>{p.games.sort((a,b)=>b.date.localeCompare(a.date));return {...p,team:p.games[0].team??p.team};});
 const teamGames=[...(previous?.teamGames??[]).filter(g=>!ids.has(g.id)),...updates.map(u=>u.teamGame)].sort((a,b)=>b.date.localeCompare(a.date));
 return {source:'nba_api+espn',season,competition,fetchedAt:now,players:normalized,teamGames};
}
