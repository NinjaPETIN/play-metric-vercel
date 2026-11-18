import { argentinaDay } from '../../../../lib/arena-schedule';
import { dailyTrends, type DailyTrends } from '../../../../lib/daily-trends';
import { loadCalendar, loadDashboard } from '../../../../lib/provider';
import { cachedNbaRead } from '../../../../lib/read-cache';
import type { Calendar } from '../../../../lib/nba-snapshot';

export const maxDuration = 30;

export async function GET(request: Request) {
 const today = argentinaDay(new Date().toISOString());
 const day = new URL(request.url).searchParams.get('day') ?? today;
 const time = Date.parse(day + 'T12:00:00Z');
 if (!/^20\d{2}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== day
  || Math.abs(time-Date.parse(today+'T12:00:00Z')) > 7*86400000) {
  return Response.json({error:'Elegí una fecha dentro de los próximos o últimos siete días.'},{status:400});
 }
 try {
  const result = await cachedNbaRead<DailyTrends>('daily-trends-v2:' + day, async () => {
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
   const reports = dailyTrends(fixtures,season.players,previous?.players ?? [],season.teamGames,day,streaks);
   return {day,season:season.season,games:fixtures.length,reports,streaks};
  });
  return Response.json(result);
 } catch {
  return Response.json({error:'No pudimos preparar las tendencias de la jornada.'},{status:503});
 }
}

