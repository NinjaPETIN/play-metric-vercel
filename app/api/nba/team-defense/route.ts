import { competitions, type Competition } from '../../../../lib/competitions';
import { loadDashboard } from '../../../../lib/provider';
import { cachedNbaRead } from '../../../../lib/read-cache';
import { rankTeamDefense } from '../../../../lib/team-defense';

export const maxDuration = 30;

export async function GET(request: Request) {
 const params = new URL(request.url).searchParams;
 const competition = params.get('competition') ?? 'regular';
 const season = Number(params.get('season'));
 if (!Object.hasOwn(competitions, competition) || !Number.isInteger(season) || season < 2000 || season > 2100) {
  return Response.json({ error: 'Temporada o competición inválida.' }, { status: 400 });
 }
 try {
  const data = await cachedNbaRead('team-defense:' + competition + ':' + season, async () => {
   const snapshot = await loadDashboard(season, competition as Competition, true);
   return { teams: rankTeamDefense(snapshot.teamGames, snapshot.players) };
  });
  return Response.json(data);
 } catch {
  return Response.json({ error: 'Defensa no disponible.' }, { status: 503 });
 }
}
