import {readEspn} from '../../../../../lib/espn-nba-read';
import {normalizeMatchAvailability} from '../../../../../lib/match-availability';
import {readLiveScores} from '../../../../../lib/live-scores-store';
import {linkLiveCalendar,normalizeLiveScores} from '../../../../../lib/live-scores';
import {cachedNbaRead} from '../../../../../lib/read-cache';
import {loadCalendar} from '../../../../../lib/provider';
import type {Calendar} from '../../../../../lib/nba-snapshot';

export const maxDuration=30;
const headers = {'Cache-Control':'public, max-age=0, s-maxage=60'};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if (!/^\d{10}$/.test(id)) return Response.json({error:'Partido no válido.'},{status:400});
  try {
    const data = await cachedNbaRead('match-availability:'+id,async()=>{
      const calendar = await cachedNbaRead<Calendar|null>('calendar',loadCalendar);
      const match = calendar?.games.find(game=>game.id===id);
      if (!match || Math.abs(Date.parse(match.startsAt??match.date)-Date.now())>48*3600000) return null;
      const scores=await readLiveScores().catch(()=>null);
      let games=linkLiveCalendar(scores?.games??[],calendar).filter(game=>game.nbaId===id);
      if (!games.length) {
        const date=match.date.replaceAll('-','');
        const dated=await cachedNbaRead('availability-scoreboard:'+date,async()=>({
          games:normalizeLiveScores(await readEspn('scoreboard?dates='+date),Date.parse(match.date+'T12:00:00Z')),
        }));
        games=linkLiveCalendar(dated.games,calendar).filter(game=>game.nbaId===id);
      }
      if (games.length!==1) return null;
      const game=games[0];
      return normalizeMatchAvailability(await readEspn('summary?event='+game.id),game);
    });
    return Response.json({data},{headers});
  } catch {
    return Response.json({error:'Disponibilidad no publicada.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
