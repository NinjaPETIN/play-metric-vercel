import type {Calendar} from './nba-snapshot';
import type {Player} from './data';
import {matchContext} from './calendar-context';
type Match=Calendar['games'][number];
export function buildMatchPreview(calendar:Calendar,match:Match,players:Player[],historicalFetchedAt:string|null,venue:'all'|'split'='all'){
 const cutoff=Date.parse(match.startsAt??match.date+'T12:00:00Z');
 const finals=calendar.games.filter(g=>g.id!==match.id&&g.competition===match.competition&&g.status===3&&g.homeScore!==null&&g.awayScore!==null&&Date.parse(g.startsAt??g.date+'T12:00:00Z')<cutoff).sort((a,b)=>(b.startsAt??b.date).localeCompare(a.startsAt??a.date));
 const context=matchContext(calendar.games,match);
 const teams=[match.away,match.home].map(team=>{
  const games=finals.filter(g=>(g.home===team||g.away===team)&&(venue==='all'||(team===match.home?g.home===team:g.away===team))),allowed=new Map(games.map(g=>[g.id,g]));
  const boxes=new Map<string,{points:number;rebounds:number;assists:number;ids:Set<string>;valid:boolean}>();
  for(const p of players)for(const g of p.games){if(!g.gameId||!allowed.has(g.gameId)||g.team!==team||!g.played||g.minutes<=0)continue;
   const b=boxes.get(g.gameId)??{points:0,rebounds:0,assists:0,ids:new Set<string>(),valid:true};
   if(b.ids.has(p.id)||![g.points,g.rebounds,g.assists].every(v=>Number.isFinite(v)&&v>=0))b.valid=false;
   b.ids.add(p.id);b.points+=g.points;b.rebounds+=g.rebounds;b.assists+=g.assists;boxes.set(g.gameId,b);
  }
  const complete=[...boxes].filter(([id,b])=>{const g=allowed.get(id)!;return b.valid&&b.ids.size>=5&&b.points===(g.home===team?g.homeScore:g.awayScore);});
  const verified=new Set(complete.map(([id])=>id));
  const candidates=players.filter(p=>p.currentTeam===team||p.currentTeam===undefined&&p.team===team).flatMap(p=>{
   const sample=p.games.filter(g=>g.gameId&&verified.has(g.gameId)&&g.team===team&&g.played&&g.minutes>0);
   if(!sample.length)return [];
   return [{id:p.id,name:p.name,team,n:sample.length,points:sample.reduce((s,g)=>s+g.points,0)/sample.length,rebounds:sample.reduce((s,g)=>s+g.rebounds,0)/sample.length,assists:sample.reduce((s,g)=>s+g.assists,0)/sample.length}];
  }).sort((a,b)=>b.points-a.points||b.n-a.n||a.name.localeCompare(b.name));
  return {...context.teams.find(t=>t.team===team)!,form:games.slice(0,5).reverse().map(g=>(g.home===team?g.homeScore!>g.awayScore!:g.awayScore!>g.homeScore!)?'V':'D'),n:games.length,boxGames:complete.length,points:games.length?games.reduce((s,g)=>s+(g.home===team?g.homeScore!:g.awayScore!),0)/games.length:null,rebounds:complete.length?complete.reduce((s,[,b])=>s+b.rebounds,0)/complete.length:null,assists:complete.length?complete.reduce((s,[,b])=>s+b.assists,0)/complete.length:null,leader:candidates[0]??null};
 });
 return {venue,season:calendar.season,competition:match.competition,calendarFetchedAt:calendar.fetchedAt,historicalFetchedAt,teams,meetings:finals.filter(g=>[g.home,g.away].includes(match.home)&&[g.home,g.away].includes(match.away)).slice(0,2).map(g=>({id:g.id,date:g.date,home:g.home,away:g.away,homeScore:g.homeScore,awayScore:g.awayScore}))};
}
export type MatchPreviewData=ReturnType<typeof buildMatchPreview>;
