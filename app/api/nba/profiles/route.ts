import {collectorOnly} from '../../../../lib/service-access';
import {getDb} from '../../../../db';
import {providerCache} from '../../../../db/schema';
import {eq,gte,lt,and} from 'drizzle-orm';
import {z} from 'zod';
const profileSchema=z.object({id:z.string().regex(/^\d{1,10}$/),position:z.string().max(60).nullable(),birthYear:z.number().int().min(1900).max(2100).nullable(),country:z.string().max(100).nullable(),fetchedAt:z.string().datetime({offset:true})});
export async function GET(){const rows=await getDb().select({payload:providerCache.payload}).from(providerCache).where(and(gte(providerCache.key,'nba_profile:'),lt(providerCache.key,'nba_profile:\uffff')));return Response.json({profiles:rows.map(r=>JSON.parse(r.payload))},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:Request){const denied=await collectorOnly();if(denied)return denied;
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no válido'},{status:403});
 const raw=await req.text();if(raw.length>200_000)return Response.json({error:'Archivo demasiado grande'},{status:413});let parsed;try{parsed=z.object({profiles:z.array(profileSchema).min(1).max(100)}).safeParse(JSON.parse(raw));}catch{return Response.json({error:'JSON no válido'},{status:400});}if(!parsed.success)return Response.json({error:'Biografías no válidas'},{status:400});
 const profiles=parsed.data.profiles;if(new Set(profiles.map(p=>p.id)).size!==profiles.length||profiles.some(p=>p.birthYear!==null&&p.birthYear>new Date().getUTCFullYear()||Date.parse(p.fetchedAt)>Date.now()+300000||!p.position&&!p.birthYear&&!p.country))return Response.json({error:'Biografías duplicadas, vacías o futuras'},{status:400});
 const db=getDb();for(const p of profiles){const key='nba_profile:'+p.id;const [old]=await db.select().from(providerCache).where(eq(providerCache.key,key));const previous=old?JSON.parse(old.payload):null;if(previous&&Date.parse(previous.fetchedAt)>=Date.parse(p.fetchedAt))continue;const profile={...p,position:p.position??previous?.position??null,birthYear:p.birthYear??previous?.birthYear??null,country:p.country??previous?.country??null},payload=JSON.stringify(profile),expiresAt=new Date(Date.parse(p.fetchedAt)+30*86400000).toISOString();await db.insert(providerCache).values({key,payload,expiresAt}).onConflictDoUpdate({target:providerCache.key,set:{payload,expiresAt}});}
 return Response.json({ok:true,profiles:profiles.length});
}
