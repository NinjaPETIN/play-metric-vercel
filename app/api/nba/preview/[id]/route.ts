import {cachedNbaRead} from '../../../../../lib/read-cache';
import {loadCalendar,loadDashboard} from '../../../../../lib/provider';
import {buildMatchPreview} from '../../../../../lib/match-preview';
import type {Calendar} from '../../../../../lib/nba-snapshot';
export const dynamic='force-dynamic';
export const maxDuration=30;
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,headers={'Cache-Control':'private, no-store'};
 const query=new URL(req.url).searchParams,venue=query.get('venue')??'all';
 if(!/^\d{10}$/.test(id)||![...query.keys()].every(k=>k==='venue')||query.getAll('venue').length>1||!['all','split'].includes(venue))return Response.json({error:'Partido no válido.'},{status:400,headers});
 try{
  const calendar=await cachedNbaRead<Calendar|null>('calendar',loadCalendar),match=calendar?.games.find(g=>g.id===id);
  if(!calendar||!match)return Response.json({error:'Partido no encontrado.'},{status:404,headers});
  // Public output contains bounded aggregates, never individual histories or Pro fields.
  const history=await cachedNbaRead('preview-history:'+calendar.season+':'+match.competition,()=>loadDashboard(calendar.season,match.competition,true)).catch(()=>null);
  return Response.json(buildMatchPreview(calendar,match,history?.players??[],history?.fetchedAt??null,venue as 'all'|'split'),{headers});
 }catch{return Response.json({error:'No se pudo cargar la previa.'},{status:503,headers});}
}
