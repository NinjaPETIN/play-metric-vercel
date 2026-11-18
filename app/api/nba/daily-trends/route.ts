import { argentinaDay } from '../../../../lib/arena-schedule';
import { dailyTrends, streakThresholds, type StreakFilter, type DailyTrends } from '../../../../lib/daily-trends';
import { loadCalendar, loadDashboard } from '../../../../lib/provider';
import { cachedNbaRead } from '../../../../lib/read-cache';
import type { Calendar } from '../../../../lib/nba-snapshot';

export const maxDuration = 30;

export async function GET(request: Request) {
 const today = argentinaDay(new Date().toISOString());
 const query=new URL(request.url).searchParams;
 const day = query.get('day') ?? today;
 const metric=query.get('metric') as StreakFilter['metric']|null;
 const side=query.get('side') ?? 'atLeast';
 const threshold=Number(query.get('threshold'));
 const filtered=query.has('threshold')||query.has('metric')||query.has('side');
 if(filtered&&(!metric||!Object.hasOwn(streakThresholds,metric)||!streakThresholds[metric].includes(threshold)||(side!=='atLeast'&&side!=='below')))
  return Response.json({error:'Umbral no válido.'},{status:400});
 const filter:StreakFilter|undefined=filtered&&metric?{metric,threshold,side:side==='below'?'below':'atLeast'}:undefined;
 const time = Date.parse(day + 'T12:00:00Z');
 if (!/^20\d{2}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== day
  || Math.abs(time-Date.parse(today+'T12:00:00Z')) > 7*86400000) {
  return Response.json({error:'Elegí una fecha dentro de los próximos o últimos siete días.'},{status:400});
 }
 try {
  const result = await cachedNbaRead<DailyTrends>('daily-trends-v3:' + day+(filter?':'+metric+':'+threshold+':'+side:''), async () => {
   const calendar = await cachedNbaRead<Calendar|null>('calendar', loadCalendar);
   if (!calendar) throw new Error('Calendario no disponible');
   const fixtures = calendar.games.filter(game => game.competition === 'regular'
    && !/postpon|cancel|posterg|suspend/i.test(game.statusText)
    && (game.startsAt ? argentinaDay(game.startsAt) : game.date) === day);
   if (!fixtures.length) return {day,season:calendar.season,games:0,reports:null};
   const [season, previous] = await Promise.all([
    loadDashboard(calendar.season,'regular',true),
    loadDashboard(calendar.season-1,'regular',true).catch(() => null),
   ]);
   const streaks = {points:[],rebounds:[],assists:[],threes:[]};
   const reports = dailyTrends(fixtures,season.players,previous?.players ?? [],season.teamGames,day,streaks,filter);
   return {day,season:season.season,games:fixtures.length,reports,streaks};
  });
  return Response.json(result);
 } catch {
  return Response.json({error:'No pudimos preparar las tendencias de la jornada.'},{status:503});
 }
}
