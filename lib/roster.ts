import {z} from 'zod';
import type {Player} from './data';
export const rosterTeams=['ATL','BOS','CLE','NOP','CHI','DAL','DEN','GSW','HOU','LAC','LAL','MIA','MIL','MIN','BKN','NYK','ORL','IND','PHI','PHX','POR','SAC','SAS','OKC','TOR','UTA','MEM','WAS','DET','CHA'] as const;
export const rosterSchema=z.object({source:z.literal('NBA.com'),fetchedAt:z.string().datetime(),players:z.array(z.object({id:z.string().regex(/^\d{1,10}$/),name:z.string().min(1).max(150),team:z.enum(rosterTeams),position:z.string().max(60)})).min(300).max(1000)}).superRefine((r,c)=>{
 if(new Set(r.players.map(p=>p.id)).size!==r.players.length)c.addIssue({code:'custom',message:'Jugadores duplicados'});
 for(const team of rosterTeams)if(r.players.filter(p=>p.team===team).length<10)c.addIssue({code:'custom',message:'Plantilla incompleta: '+team});
});
export type Roster=z.infer<typeof rosterSchema>;
export function rosterFreshness(fetchedAt:string|null,now=Date.now()){
 const time=fetchedAt?Date.parse(fetchedAt):NaN;
 return {fetchedAt,status:!Number.isFinite(time)?'pending':now-time>2*3600_000?'stale':'ready'} as {fetchedAt:string|null;status:'pending'|'stale'|'ready'};
}
// Current affiliations never overwrite a game's historical team or the selected-season team.
export function applyRoster(players:Player[],roster:Roster|null,includeMissing=false){
 if(!roster)return players;
 const entries=new Map(roster.players.map(p=>[p.id,p]));
 const result:Player[]=players.map(p=>({...p,currentTeam:entries.get(p.id)?.team??null,rosterFetchedAt:roster.fetchedAt}));
 if(includeMissing){const ids=new Set(players.map(p=>p.id));for(const p of roster.players)if(!ids.has(p.id))result.push({id:p.id,name:p.name,team:p.team,currentTeam:p.team,rosterFetchedAt:roster.fetchedAt,position:p.position,color:'#91b9ed',base:[0,0,0,0],lines:Object.fromEntries(['points','rebounds','assists','threes','pa','pr','ra','pra','steals','blocks','sb','turnovers','fieldGoalsAttempted','fieldGoalsMade','threeAttempts','freeThrowsAttempted','freeThrowsMade','offensiveRebounds','defensiveRebounds'].map(m=>[m,.5])) as Player['lines'],games:[]});}
 return result;
}
