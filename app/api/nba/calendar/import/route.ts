import {collectorOnly} from '../../../../../lib/service-access';
import {getDb} from '../../../../../db';
import {providerCache} from '../../../../../db/schema';
import {calendarSchema} from '../../../../../lib/nba-snapshot';
import {eq} from 'drizzle-orm';
// Protected by the confirmed owner-private Site access boundary.
export async function POST(req:Request){const denied=await collectorOnly();if(denied)return denied;
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no válido'},{status:403});
 const reader=req.body?.getReader();if(!reader)return Response.json({error:'Sin contenido'},{status:400});let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1_500_000){await reader.cancel();return Response.json({error:'Calendario demasiado grande'},{status:413});}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}let raw;try{raw=JSON.parse(new TextDecoder().decode(bytes));}catch{return Response.json({error:'JSON no válido'},{status:400});}
 const parsed=calendarSchema.safeParse(raw);if(!parsed.success)return Response.json({error:'Calendario no válido'},{status:400});const data=parsed.data;
 if(new Set(data.games.map(g=>g.id)).size!==data.games.length||Date.parse(data.fetchedAt)>Date.now()+300_000)return Response.json({error:'Calendario duplicado o fecha futura'},{status:400});
 const db=getDb(),key='nba_calendar';const [previous]=await db.select().from(providerCache).where(eq(providerCache.key,key));if(previous&&Date.parse(JSON.parse(previous.payload).fetchedAt)>=Date.parse(data.fetchedAt))return Response.json({error:'Ya hay un calendario más reciente'},{status:409});
 const write=db.insert(providerCache).values({key,payload:JSON.stringify(data),expiresAt:'2099-01-01T00:00:00Z'}).onConflictDoUpdate({target:providerCache.key,set:{payload:JSON.stringify(data),expiresAt:'2099-01-01T00:00:00Z'}});if(previous){const backup=db.insert(providerCache).values({key:'nba_backup:calendar',payload:previous.payload,expiresAt:'2099-01-01T00:00:00Z'}).onConflictDoUpdate({target:providerCache.key,set:{payload:previous.payload,expiresAt:'2099-01-01T00:00:00Z'}});await db.batch([backup,write]);}else await write;
 return Response.json({ok:true,games:data.games.length,fetchedAt:data.fetchedAt});
}
