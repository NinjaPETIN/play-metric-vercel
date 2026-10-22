import {cachedNbaRead} from '../../../../lib/read-cache';
import {loadCalendar} from '../../../../lib/provider';
export async function GET(req:Request){const force=req.headers.get('cache-control')?.includes('no-cache')??false;const calendar=await cachedNbaRead('calendar',loadCalendar,force);return calendar?Response.json(calendar,{headers:{'Cache-Control':force?'no-store':'private, max-age=60'}}):Response.json({error:'El calendario todavía no está disponible.'},{status:503,headers:{'Cache-Control':'no-store'}});}
