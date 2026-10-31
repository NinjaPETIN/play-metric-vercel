import {readLiveScores} from '../../../../lib/live-scores-store';
import {linkLiveCalendar} from '../../../../lib/live-scores';
import {cachedNbaRead} from '../../../../lib/read-cache';
import {loadCalendar} from '../../../../lib/provider';
export const dynamic='force-dynamic';
export const maxDuration=15;
export async function GET(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(new URL(req.url).search)return Response.json({error:'Este marcador no admite filtros.'},{status:400,headers});
 try{
  const feed=await readLiveScores();
  const calendar=await cachedNbaRead('calendar',loadCalendar).catch(()=>null);
  return Response.json({...feed,games:linkLiveCalendar(feed.games,calendar)},{headers});
 }catch{return Response.json({provider:'ESPN',status:'unavailable',fetchedAt:null,checkedAt:null,games:[]},{status:503,headers});}
}
