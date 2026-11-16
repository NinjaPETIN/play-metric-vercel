import { cachedNbaRead } from '../../../../lib/read-cache';
import { loadDashboard } from '../../../../lib/provider';
import { isCompetition } from '../../../../lib/competitions';
import { teammateSplits } from '../../../../lib/teammate-splits';

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
  const splits = await cachedNbaRead('teammates:' + season + ':' + competition + ':' + team + ':' + (before ?? ''), async () => {
   const data = await cachedNbaRead('preview-history:' + season + ':' + competition, () => loadDashboard(Number(season), competition, true));
   return teammateSplits(data.players, data.teamGames, team, before);
  });
  return Response.json({ players: splits.players, comparison: subject && teammate ? splits.compare(subject, teammate) : null }, { headers });
 } catch {
  return Response.json({ error: 'No pudimos consultar el historial.' }, { status: 503, headers });
 }
}
