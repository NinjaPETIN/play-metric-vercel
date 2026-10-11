import {accountJson} from '../../../lib/account-security';
import {PlanError} from '../../../lib/account-plan';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {favorites} from '../../../db/schema';
import {and,eq} from 'drizzle-orm';
import {loadDashboard} from '../../../lib/provider';
import {isCompetition} from '../../../lib/competitions';
import {markets} from '../../../lib/analytics';
export async function GET(){const u=await getChatGPTUser();if(!u)return Response.json({error:'Iniciá sesión para sincronizar favoritos.'},{status:401});const rows=await getDb().select().from(favorites).where(eq(favorites.userId,u.userId));return Response.json({favorites:rows.map(r=>r.propId)});}
export async function POST(req:Request){
 const u=await getChatGPTUser();if(!u)return Response.json({error:'Iniciá sesión.'},{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no válido'},{status:403});
 let b:Record<string,unknown>;try{const parsed=await accountJson(req);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return Response.json({error:'Solicitud no válida'},{status:400});b=parsed as Record<string,unknown>;}catch(e){return Response.json({error:e instanceof PlanError?e.message:'JSON no válido'},{status:e instanceof PlanError?e.status:400});}
 if(typeof b.propId!=='string'||typeof b.saved!=='boolean')return Response.json({error:'Solicitud no válida'},{status:400});
 const [id,market,...extra]=b.propId.split(':');if(extra.length||!/^[0-9]{1,8}$/.test(id)||!Object.hasOwn(markets,market))return Response.json({error:'Línea no válida'},{status:400});
 if(b.saved){const competition=b.competition??'regular';if(typeof competition!=='string'||!isCompetition(competition)||(b.season!==undefined&&(typeof b.season!=='number'||!Number.isInteger(b.season)||b.season<2000||b.season>2100)))return Response.json({error:'Historial no válido'},{status:400});try{const dashboard=await loadDashboard(b.season as number|undefined,competition);if(!dashboard.players.some(p=>p.id===id))return Response.json({error:'Jugador no encontrado'},{status:400});}catch{return Response.json({error:'Historial no disponible'},{status:503});}}
 const db=getDb();if(b.saved)await db.insert(favorites).values({userId:u.userId,propId:b.propId,createdAt:new Date().toISOString()}).onConflictDoNothing();else await db.delete(favorites).where(and(eq(favorites.userId,u.userId),eq(favorites.propId,b.propId)));
 return Response.json({ok:true});
}
