import {z} from 'zod';
import type {LiveGame} from './live-scores';

const teamAliases:Record<string,string> = {NY:'NYK',GS:'GSW',SA:'SAS',NO:'NOP',UTAH:'UTA',WSH:'WAS'};
const teamCode = (code:string) => teamAliases[code] ?? code;
const statuses:Record<string,string> = {
  Out:'Fuera', Doubtful:'En duda (improbable)', Questionable:'En duda', Probable:'Probable',
  'Day-To-Day':'Día a día', Available:'Disponible', 'Game Time Decision':'Decisión antes del partido',
  'Injured Reserve':'Fuera (lista de lesionados)', 'Suspended':'Suspendido',
};
const team = z.object({abbreviation:z.string().max(5)});
const player = z.object({id:z.string().regex(/^\d{1,12}$/),displayName:z.string().trim().min(1).max(100)});
const competition = z.object({
  id:z.string(), date:z.string(),
  competitors:z.array(z.object({homeAway:z.enum(['home','away']),team})).length(2),
  status:z.object({type:z.object({state:z.enum(['pre','in','post'])})}),
});
const summary = z.object({
  header:z.object({id:z.string(),league:z.object({abbreviation:z.literal('NBA')}),competitions:z.array(competition).length(1)}),
  injuries:z.unknown().optional(), boxscore:z.unknown().optional(),
});
const injuryTeam = z.object({team,injuries:z.array(z.unknown()).max(30)});
const injury = z.object({athlete:player,status:z.string().min(1).max(60),date:z.string()});
const boxscore = z.object({players:z.array(z.object({
  team,
  statistics:z.array(z.object({athletes:z.array(z.object({athlete:player,starter:z.boolean(),didNotPlay:z.boolean()})).max(30)})).min(1),
})).length(2)});

export type MatchAvailability = {
  fetchedAt:string;
  dataStale?:boolean;
  teams:Array<{code:string; injuries:Array<{id:string; name:string; status:string; reportedAt:string}>|null; starters:string[]|null}>;
};

export function normalizeMatchAvailability(raw:unknown, game:LiveGame, now=Date.now()):MatchAvailability {
  const data = summary.parse(raw);
  const event = data.header.competitions[0];
  const participants = event.competitors;
  if (data.header.id!==game.id || event.id!==game.id || Date.parse(event.date)!==Date.parse(game.startsAt) ||
      !participants.some(entry=>entry.homeAway==='home'&&teamCode(entry.team.abbreviation)===game.home) ||
      !participants.some(entry=>entry.homeAway==='away'&&teamCode(entry.team.abbreviation)===game.away)) {
    throw new Error('El resumen no corresponde al partido.');
  }
  const injuryGroups = z.array(injuryTeam).max(2).safeParse(data.injuries);
  const box = boxscore.safeParse(data.boxscore);
  const pregame = event.status.type.state==='pre' && game.state==='scheduled';
  return {
    fetchedAt:new Date(now).toISOString(),
    teams:[game.away,game.home].map(code=>{
      const group = pregame&&injuryGroups.success ? injuryGroups.data.filter(entry=>teamCode(entry.team.abbreviation)===code) : [];
      const rows = group.length===1 ? group[0].injuries.flatMap(row=>{
        const entry = injury.safeParse(row);
        if (!entry.success) return [];
        const {athlete,status,date} = entry.data;
        const timestamp = Date.parse(date);
        if (!Number.isFinite(timestamp)||timestamp>now+300_000) return [];
        return [{id:athlete.id,name:athlete.displayName,status:Object.hasOwn(statuses,status)?statuses[status]:status,reportedAt:new Date(timestamp).toISOString()}];
      }) : null;
      const injuries = rows && Array.from(new Map(rows.sort((a,b)=>a.reportedAt.localeCompare(b.reportedAt)).map(row=>[row.id,row])).values())
        .sort((a,b)=>b.reportedAt.localeCompare(a.reportedAt));
      const lineup = !pregame&&event.status.type.state!=='pre'&&box.success ?
        box.data.players.filter(entry=>teamCode(entry.team.abbreviation)===code) : [];
      const starters = lineup.length===1 ? lineup[0].statistics[0].athletes.filter(entry=>entry.starter&&!entry.didNotPlay) : [];
      return {code,injuries,starters:starters.length===5&&new Set(starters.map(entry=>entry.athlete.id)).size===5 ?
        starters.map(entry=>entry.athlete.displayName) : null};
    }),
  };
}
