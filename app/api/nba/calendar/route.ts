import {cachedNbaRead} from '../../../../lib/read-cache';
import {loadCalendar} from '../../../../lib/provider';
export async function GET(req:Request){const calendar=await cachedNbaRead('calendar',loadCalendar,req.headers.get('cache-control')?.includes('no-cache'));return calendar?Response.json(calendar,{headers:{'Cache-Control':'private, max-age=120'}}):Response.json({error:'El calendario todavía no está disponible.'},{status:503});}
