import {readMarketLines} from '../../../../../lib/market-lines';
import {loadCalendar} from '../../../../../lib/provider';
import {cachedNbaRead} from '../../../../../lib/read-cache';
import type {Calendar} from '../../../../../lib/nba-snapshot';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^\d{10}$/.test(id))return Response.json({error:'Partido no válido.'},{status:400});
 try{
  const calendar=await cachedNbaRead<Calendar|null>('calendar',loadCalendar);
  const game=calendar?.games.find(game=>game.id===id);
  if(!game)return Response.json({error:'Partido no encontrado.'},{status:404});
  return Response.json(await cachedNbaRead('market-lines:'+id,()=>readMarketLines(game)));
 }catch{
  return Response.json({state:'unavailable',lines:[]},{status:503});
 }
}
