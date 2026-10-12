import {eq,sql} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {providerCache} from '../../../../db/schema';
import {collectorOnly} from '../../../../lib/service-access';
import {loadRoster} from '../../../../lib/roster-store';
import {rosterSchema,rosterFreshness} from '../../../../lib/roster';
const headers={'Cache-Control':'no-store'};
export async function GET(){const roster=await loadRoster();return Response.json({...rosterFreshness(roster?.fetchedAt??null),source:roster?.source??null,players:roster?.players??[]},{headers});}
export async function POST(req:Request){const denied=await collectorOnly();if(denied)return denied;
 let parsed;try{const text=await req.text();if(text.length>300_000)return Response.json({error:'Carga demasiado grande'},{status:413});parsed=rosterSchema.safeParse(JSON.parse(text));}catch{return Response.json({error:'JSON no válido'},{status:400});}
 if(!parsed.success)return Response.json({error:'Plantillas incompletas o no válidas'},{status:400});
 const roster={...parsed.data,fetchedAt:new Date(parsed.data.fetchedAt).toISOString()},age=Date.now()-Date.parse(roster.fetchedAt);
 if(age < -60_000||age>15*60_000)return Response.json({error:'La comprobación de plantillas es demasiado antigua'},{status:400});
 const db=getDb();await db.insert(providerCache).values({key:'nba_roster',payload:JSON.stringify(roster),expiresAt:'2099-01-01T00:00:00.000Z'}).onConflictDoUpdate({target:providerCache.key,set:{payload:JSON.stringify(roster)},setWhere:sql`json_extract(${providerCache.payload}, '$.fetchedAt') < ${roster.fetchedAt}`});
 const saved=await loadRoster();if(saved?.fetchedAt!==roster.fetchedAt)return Response.json({error:'Existe una plantilla más reciente; se conservó'},{status:409});
 return Response.json({ok:true,verified:true,fetchedAt:saved.fetchedAt,players:saved.players.length,teams:30},{headers});
}
