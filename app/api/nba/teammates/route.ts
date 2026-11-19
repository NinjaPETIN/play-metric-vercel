import { cachedNbaRead } from '../../../../lib/read-cache';
import { loadCalendar, loadDashboard } from '../../../../lib/provider';
import { isCompetition } from '../../../../lib/competitions';
import type { Calendar } from '../../../../lib/nba-snapshot';
import { rosterFreshness } from '../../../../lib/roster';
import { teammateSplits } from '../../../../lib/teammate-splits';
import {authorizePlayer,PlanError} from '../../../../lib/account-plan';
import {samplePlayer} from '../../../../lib/public-access';

export async function GET(request: Request) {
 const query = new URL(request.url).searchParams;
 const season = query.get('season') ?? '';
 const competition = query.get('competition') ?? 'regular';
 const team = query.get('team') ?? '';
 const subject = query.get('subject');
 const teammate = query.get('teammate');
 const before = query.get('before') ?? undefined;
 const headers = { 'Cache-Control': 'private, no-store' };
 if (!/^20\d{2}$/.test(season) || !isCompetition(competition) || !/^[A-Z]{2,4}$/.test(team) ||
     (before && !/^20\d\d-\d\d-\d\d$/.test(before)) ||
     [subject, teammate].some(id => id !== null && !/^\d{1,12}$/.test(id))) {
  return Response.json({ error: 'Filtros no válidos.' }, { status: 400, headers });
 }
 try {
  const sample=query.get('sample')==='1';
  if(sample){if(!subject||!teammate||!/^\d{1,10}$/.test(subject)||!/^\d{1,10}$/.test(teammate)||!['with','without'].includes(query.get('mode')??''))throw new PlanError(400,'Seleccioná jugador y compañero.');if(!samplePlayer(subject,competition))await authorizePlayer(subject);}
  const splits = await cachedNbaRead('teammates:' + season + ':' + competition + ':' + team + ':' + (before ?? ''), async () => {
   const [data, calendar] = await Promise.all([
    cachedNbaRead('preview-history:' + season + ':' + competition, () => loadDashboard(Number(season), competition, true)),
    cachedNbaRead<Calendar | null>('calendar', loadCalendar).catch(() => null),
   ]);
   const currentRoster = calendar?.season === Number(season) && rosterFreshness(data.roster.fetchedAt).status === 'ready';
   return teammateSplits(data.players, data.teamGames, team, before, currentRoster);
  });
  if(sample){const comparison=splits.compare(subject!,teammate!,true);if(!comparison)throw new PlanError(404,'No hay historial verificado para estos compañeros.');return Response.json({gameIds:comparison[query.get('mode')==='without'?'without':'with'].gameIds??[],name:splits.players.find(p=>p.id===teammate)?.name??'compañero'},{headers});}
  return Response.json({ players: splits.players, comparison: subject && teammate ? splits.compare(subject, teammate) : null }, { headers });
 } catch(e) {
  if(e instanceof PlanError)return Response.json({error:e.message},{status:e.status,headers});
  return Response.json({ error: 'No pudimos consultar el historial.' }, { status: 503, headers });
 }
}
