import { getChatGPTUser } from '../../../chatgpt-auth';
import { database } from '../../../../lib/database-env';
import {accountRequestBudget} from '../../../../lib/account-request-budget';
import { accountJson } from '../../../../lib/account-security';
import { PlanError,authorizePlayer } from '../../../../lib/account-plan';
import {gameReferencePrefix,saveFrozenNote} from '../../../../lib/frozen-analysis-store';
import { cachedNbaRead } from '../../../../lib/read-cache';
import { loadCalendar, loadDashboard, loadPlayerDashboard } from '../../../../lib/provider';
import { markets, value, type Market } from '../../../../lib/analytics';
import { isCompetition, type Competition } from '../../../../lib/competitions';
import { teamNames } from '../../../../lib/team-overview';
import type { Calendar } from '../../../../lib/nba-snapshot';
import {reviewMetrics} from '../../../../lib/analysis-experience';
import {freezeSample,type FrozenSample} from '../../../../lib/research-context';

type Reference = {
 playerId: string; name: string; team: string; opponent: string; matchId: string;
 startsAt: string; season: number; competition: Competition; market: Market;
 line: number; side: 'over' | 'under'; savedAt: string;
 snapshot?:ReturnType<typeof freezeSample>;note?:string;
};

const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
const fail = (error: unknown) => reply({ error: error instanceof PlanError ? error.message : 'No pudimos consultar tus referencias.' }, error instanceof PlanError ? error.status : 503);
const history = (season: number, competition: Competition) => cachedNbaRead('preview-history:' + season + ':' + competition, () => loadDashboard(season, competition, true));
const calendarRead = () => cachedNbaRead<Calendar | null>('calendar', loadCalendar);
const namespace = gameReferencePrefix;

export async function GET() {
 try {
  const user = await getChatGPTUser();
  if (!user) throw new PlanError(401, 'Iniciá sesión para consultar tus referencias.');
  await accountRequestBudget(user.userId,'references');
  const prefix = namespace(user.userId);
  const saved = await database.prepare("select payload from provider_cache where key>=? and key<? order by json_extract(payload,'$.savedAt') desc limit 50").bind(prefix, prefix + '\uffff').all<{ payload: string }>();
  const references = saved.results.map(row => JSON.parse(row.payload) as Reference);
  if (!references.length) return reply({ rows: [] });
  const calendar = await calendarRead().catch(() => null);
  const sources = new Map<string, Promise<Awaited<ReturnType<typeof history>> | null>>();
  const rows = await Promise.all(references.map(async ref => {
   if (Date.parse(ref.startsAt) > Date.now()) return { ...ref, result: null, state: 'upcoming' };
   const key = ref.season + ':' + ref.competition;
   let source = sources.get(key);
   if (!source) {
    const pending = history(ref.season, ref.competition).catch(() => null);
    sources.set(key, pending);
    source = pending;
   }
   const data = await source;
   const final = data?.teamGames.find(game => game.id === ref.matchId &&
     ((game.away === ref.team && game.home === ref.opponent) || (game.home === ref.team && game.away === ref.opponent)));
   const game = final && data?.players.find(player => player.id === ref.playerId)?.games.find(game =>
    game.gameId === ref.matchId && (game.team===ref.team||!game.team&&game.opponent===ref.opponent&&(game.home?final.home:final.away)===ref.team) && game.played && game.minutes > 0);
   const scheduled = calendar?.games.find(game => game.id === ref.matchId);
   return { ...ref, actual:game?reviewMetrics([game]):null, result: game ? value(game, ref.market) : null, state: final || scheduled?.status === 3 ? 'final' : 'pending' };
  }));
  return reply({ rows });
 } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
 try {
  const user = await getChatGPTUser();
  if (!user) throw new PlanError(401, 'Iniciá sesión para guardar una referencia.');
  const { playerId, team, market, line, side, matchId, snapshot } = await accountJson(request,16384);
  if (typeof playerId !== 'string' || !/^\d{1,12}$/.test(playerId) || typeof team !== 'string' || !Object.hasOwn(teamNames, team) ||
      typeof market !== 'string' || !Object.hasOwn(markets, market) || typeof line !== 'number' || !Number.isFinite(line) || line < 0 || line > 200 ||
      (side !== 'over' && side !== 'under') || (matchId !== undefined && (typeof matchId !== 'string' || !/^\d{10}$/.test(matchId)))) {
   throw new PlanError(400, 'Referencia no válida.');
  }
  await accountRequestBudget(user.userId,'references');
  const calendar = await calendarRead();
  const match = calendar?.games.filter(game => game.status === 1 && game.startsAt && Date.parse(game.startsAt) > Date.now() &&
    (!matchId || matchId === game.id) && (game.away === team || game.home === team) && isCompetition(game.competition))
   .sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!))[0];
  if (!calendar || !match?.startsAt) throw new PlanError(409, 'No hay un próximo partido con horario confirmado.');
  const data = await history(calendar.season, match.competition);
  const player = data.players.find(player => player.id === playerId && (player.currentTeam === undefined ? player.team : player.currentTeam) === team);
  if (!player) throw new PlanError(409, 'El jugador no figura en el equipo del próximo partido.');
  const now = Date.now();
  const startsAt = match.startsAt;
  if (Date.parse(startsAt) <= now) throw new PlanError(409, 'El partido ya está programado para comenzar o empezó.');
  const reference: Reference = { playerId, name: player.name, team, opponent: match.home === team ? match.away : match.home,
   matchId: match.id, startsAt, season: calendar.season, competition: match.competition, market: market as Market, line, side, savedAt: new Date(now).toISOString() };
  if(snapshot!==undefined){
   await authorizePlayer(playerId);
   const scope=snapshot as FrozenSample;
   if(!Number.isInteger(scope?.season)||scope.season<1946||scope.season>2100||!isCompetition(scope?.competition)||(scope.history!==undefined&&scope.history!=='all'&&scope.history!=='season'))throw new PlanError(400,'Muestra no válida.');
   const source=await loadPlayerDashboard(playerId,scope.season,scope.competition,scope.history==='all');
   const historical=source.players.find(p=>p.id===playerId);
   const before=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
   try{reference.snapshot=freezeSample(snapshot,historical?.games??[],market as Market,line,side,before);}catch(error){throw new PlanError(400,error instanceof Error?error.message:'Muestra no válida.');}
  }
  if(Date.parse(startsAt)<=Date.now())throw new PlanError(409,'El partido comenzó mientras guardabas. No se creó un análisis previo.');
  reference.savedAt=new Date().toISOString();
  const prefix = namespace(user.userId);
  const key = prefix + [match.id, playerId, market].join(':');
  const inserted = await database.prepare(`insert into provider_cache(key,payload,expires_at)
   select ?,?,? where (select count(*) from provider_cache where key>=? and key<?)<50
   on conflict(key) do nothing returning payload`).bind(key, JSON.stringify(reference), '2100-01-01T00:00:00Z', prefix, prefix + '\uffff').first<{ payload: string }>();
  const previous = inserted ?? await database.prepare('select payload from provider_cache where key=?').bind(key).first<{ payload: string }>();
  if (!previous) throw new PlanError(409, 'Tu historial alcanzó el límite de 50 referencias.');
  return reply({ reference: JSON.parse(previous.payload) as Reference, alreadySaved: !inserted });
 } catch (error) { return fail(error); }
}

export async function DELETE(request: Request) {
 try {
  const user = await getChatGPTUser();
  if (!user) throw new PlanError(401, 'Iniciá sesión para administrar tus referencias.');
  const { matchId, playerId, market } = await accountJson(request);
  if (typeof matchId !== 'string' || !/^\d{10}$/.test(matchId) || typeof playerId !== 'string' || !/^\d{1,12}$/.test(playerId) ||
      typeof market !== 'string' || !Object.hasOwn(markets, market)) throw new PlanError(400, 'Referencia no válida.');
  await accountRequestBudget(user.userId,'references');
  await database.prepare("delete from provider_cache where key=? and json_extract(payload,'$.startsAt')<=?").bind(
   namespace(user.userId) + [matchId, playerId, market].join(':'), new Date().toISOString()).run();
  return reply({ ok: true });
 } catch (error) { return fail(error); }
}

export async function PATCH(request:Request){
 try{
  const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión para editar tu nota.');
  const {matchId,playerId,market,note}=await accountJson(request);
  if(typeof matchId!=='string'||!/^\d{10}$/.test(matchId)||typeof playerId!=='string'||!/^\d{1,12}$/.test(playerId)||typeof market!=='string'||!Object.hasOwn(markets,market)||typeof note!=='string'||note.length>1500)throw new PlanError(400,'Nota no válida.');
  await accountRequestBudget(user.userId,'references');
  const updated=await saveFrozenNote(user.userId,matchId,playerId,market,note);
  if(!updated)throw new PlanError(404,'No encontramos este análisis.');
  return reply({ok:true});
 }catch(error){return fail(error);}
}
