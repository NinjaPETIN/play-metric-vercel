import {normalizeMatchAvailability} from '../../../../../lib/match-availability';
import {readLiveScores} from '../../../../../lib/live-scores-store';
import {linkLiveCalendar,normalizeLiveScores} from '../../../../../lib/live-scores';
import {cachedNbaRead} from '../../../../../lib/read-cache';
import {loadCalendar} from '../../../../../lib/provider';
import type {Calendar} from '../../../../../lib/nba-snapshot';

export const maxDuration=30;
const headers = {'Cache-Control':'public, max-age=0, s-maxage=60'};
const espn='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';

async function readEspn(path:string) {
  const response=await fetch(espn+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  if (!response.ok||!response.headers.get('content-type')?.includes('json')||!response.body) throw new Error('Resumen no disponible');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];
  let bytes=0;
  for (;;) {
    const part=await reader.read();
    if (part.done) break;
    bytes+=part.value.byteLength;
    if (bytes>2_000_000) {await reader.cancel();throw new Error('Resumen demasiado grande');}
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

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
