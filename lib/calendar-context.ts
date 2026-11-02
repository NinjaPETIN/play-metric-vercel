import type {Calendar} from './nba-snapshot';
type Game=Calendar['games'][number];
export function matchContext(games:Game[],match:Game){
 const cutoff=Date.parse(match.startsAt??match.date+'T12:00:00Z');
 const finals=games.filter(g=>g.id!==match.id&&g.competition===match.competition&&g.status===3&&g.homeScore!==null&&g.awayScore!==null&&Date.parse(g.startsAt??g.date+'T12:00:00Z')<cutoff).sort((a,b)=>(b.startsAt??b.date).localeCompare(a.startsAt??a.date));
 const won=(g:Game,team:string)=>g.home===team?g.homeScore!>g.awayScore!:g.awayScore!>g.homeScore!;
 const teams=[match.away,match.home].map(team=>{const last=finals.filter(g=>g.home===team||g.away===team).slice(0,5);return {team,form:last.slice().reverse().map(g=>won(g,team)?'V':'D'),restDays:last[0]?Math.max(0,Math.floor((Date.parse(match.date+'T12:00:00Z')-Date.parse(last[0].date+'T12:00:00Z'))/86400000)-1):null};});
 const meetings=finals.filter(g=>[g.home,g.away].includes(match.home)&&[g.home,g.away].includes(match.away));
 return {teams,meetings:meetings.length,awayWins:meetings.filter(g=>won(g,match.away)).length,homeWins:meetings.filter(g=>won(g,match.home)).length};
}
