import {cachedNbaRead} from '../../../../../lib/read-cache';
import {loadCalendar} from '../../../../../lib/provider';
import {readRecentNbaBoxscore} from '../../../../../lib/live-boxscore-store';
export const dynamic='force-dynamic';
export const maxDuration=25;
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,headers={'Cache-Control':'no-store'};
 if(!/^\d{10}$/.test(id)||new URL(req.url).search)return Response.json({error:'Partido no válido'},{status:400,headers});
 try{
  const calendar=await cachedNbaRead('calendar',loadCalendar),feed=await readRecentNbaBoxscore(id,calendar);
  return Response.json(feed??{provider:'ESPN',status:'unavailable',fetchedAt:null,data:null},{headers});
 }catch{return Response.json({provider:'ESPN',status:'unavailable',fetchedAt:null,data:null},{status:503,headers});}
}
