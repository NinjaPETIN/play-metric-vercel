import { competitions, type Competition } from '../../../../lib/competitions';
import { loadDashboard } from '../../../../lib/provider';
import { cachedNbaRead } from '../../../../lib/read-cache';
import { rankTeamDefense } from '../../../../lib/team-defense';
import { positionDefense } from '../../../../lib/position-defense-source';
import type { DefensePeriod } from '../../../../lib/position-defense';
import {loadRoster} from '../../../../lib/roster-store';

export const maxDuration = 30;

export async function GET(request: Request) {
 const params = new URL(request.url).searchParams;
 const competition = params.get('competition') ?? 'regular';
 const season = Number(params.get('season'));
 const period=params.get('period') as DefensePeriod|null;
 const before=params.get('before');
 if((period&&!['game','q1','h1'].includes(period))||(before&&!/^20\d\d-\d\d-\d\d$/.test(before)))return Response.json({error:'Período no válido.'},{status:400});
 if (!Object.hasOwn(competitions, competition) || !Number.isInteger(season) || season < 2000 || season > 2100) {
  return Response.json({ error: 'Temporada o competición inválida.' }, { status: 400 });
 }
 try {
  const data = await cachedNbaRead('team-defense-v2:' + competition + ':' + season + ':'+(period??'total')+':'+(before??''), async () => {
   const snapshot = await cachedNbaRead('preview-history:'+season+':'+competition,()=>loadDashboard(season, competition as Competition, true));
   const games=before?snapshot.teamGames.filter(game=>game.date<before):snapshot.teamGames;
   if(!period)return {teams:rankTeamDefense(games,snapshot.players)};
   const roster=await loadRoster().catch(()=>null);
   const positions=new Map(roster?.players.map(player=>[player.id,player.position]));
   const players=snapshot.players.map(player=>({...player,position:player.position||positions.get(player.id)||''}));
   return {positions:await positionDefense(players,games,period)};
  });
  return Response.json(data);
 } catch {
  return Response.json({ error: 'Defensa no disponible.' }, { status: 503 });
 }
}
