import {collectorOnly} from '../../../../lib/service-access';
import {clearNbaReadCache} from '../../../../lib/read-cache';
import {getDb} from '../../../../db';
import {providerCache} from '../../../../db/schema';
import {snapshotKey} from '../../../../lib/competitions';
import {snapshotSchema} from '../../../../lib/nba-snapshot';
import {and,eq,gte,lt,or,sql} from 'drizzle-orm';
// The owner-private Sites dispatch validates unattended service access.
// This shared writer must not be exposed publicly without separate authorization.
export async function POST(req:Request){const denied=await collectorOnly();if(denied)return denied;
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no válido'},{status:403});
 const limit=16_000_000,reader=req.body?.getReader();
 if(!reader)return Response.json({error:'Sin contenido'},{status:400});
 let length=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();return Response.json({error:'Archivo demasiado grande'},{status:413});}chunks.push(value);}
 const all=new Uint8Array(length);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
 chunks.length=0;let raw;try{raw=JSON.parse(new TextDecoder().decode(all));}catch{return Response.json({error:'JSON no válido'},{status:400});}
 const parsed=snapshotSchema.safeParse(raw);if(!parsed.success)return Response.json({error:'Snapshot no válido'},{status:400});
 const snapshot=parsed.data,ids=snapshot.players.map(p=>p.id);
 if(snapshot.teamGames&&(new Set(snapshot.teamGames.map(g=>g.id)).size!==snapshot.teamGames.length||snapshot.teamGames.some(g=>g.home===g.away||g.homeScore===g.awayScore)))return Response.json({error:'Resultados duplicados o no válidos'},{status:400});
 if(new Set(ids).size!==ids.length||snapshot.players.some(p=>new Set(p.games.map(g=>g.date)).size!==p.games.length))return Response.json({error:'Registros duplicados'},{status:400});
 if(Date.parse(snapshot.fetchedAt)>Date.now()+300_000)return Response.json({error:'Fecha de consulta futura'},{status:400});
 const db=getDb(),key=snapshotKey(snapshot.season,snapshot.competition),lockKey='nba_sync_lock',lease=crypto.randomUUID(),now=new Date().toISOString();
 const expiresAt=new Date(Date.now()+10*60_000).toISOString();
 const acquired=await db.insert(providerCache).values({key:lockKey,payload:lease,expiresAt}).onConflictDoUpdate({target:providerCache.key,set:{payload:lease,expiresAt},setWhere:sql`${providerCache.expiresAt} < ${now}`}).returning({payload:providerCache.payload});
 if(!acquired.length)return Response.json({error:'Ya hay una sincronización en curso.'},{status:409});
 const prefix=`${key}:${lease}:`;
 const lastGameDate=snapshot.players.flatMap(p=>p.games.map(g=>g.date)).sort().at(-1),totalGames=snapshot.players.reduce((n,p)=>n+p.games.length,0);
 try{
  const [previous]=await db.select().from(providerCache).where(eq(providerCache.key,key));
  if(previous&&Date.parse(JSON.parse(previous.payload).fetchedAt)>=Date.parse(snapshot.fetchedAt))return Response.json({error:'Ya existe una consulta más reciente.'},{status:409});
  if(previous){const meta=JSON.parse(previous.payload);if((meta.lastGameDate&&lastGameDate!<meta.lastGameDate)||(meta.playerCount&&ids.length<meta.playerCount*.7)||(meta.totalGames&&totalGames<meta.totalGames*.7))return Response.json({error:'La respuesta NBA tiene una cobertura incompleta. Se conserva el historial anterior.'},{status:409});}
  for(let i=0;i<snapshot.players.length;i+=40){const items=snapshot.players.slice(i,i+40).map(p=>db.insert(providerCache).values({key:prefix+p.id,payload:JSON.stringify(p),expiresAt:'2099-01-01T00:00:00Z'}));await db.batch([items[0],...items.slice(1)]);}
  const payload=JSON.stringify({source:snapshot.source,competition:snapshot.competition,season:snapshot.season,fetchedAt:snapshot.fetchedAt,teamGames:snapshot.teamGames,lastGameDate,playerCount:ids.length,totalGames,prefix});
  // New data becomes visible only after all rows have been written.
  const pointer=db.insert(providerCache).values({key,payload,expiresAt:'2099-01-01T00:00:00Z'}).onConflictDoUpdate({target:providerCache.key,set:{payload,expiresAt:'2099-01-01T00:00:00Z'}});
  if(previous){const backupKey='nba_backup:'+snapshot.competition+':'+snapshot.season;const backup=db.insert(providerCache).values({key:backupKey,payload:previous.payload,expiresAt:'2099-01-01T00:00:00Z'}).onConflictDoUpdate({target:providerCache.key,set:{payload:previous.payload,expiresAt:'2099-01-01T00:00:00Z'}});await db.batch([backup,pointer]);}else await pointer;
  clearNbaReadCache();
  // Bound storage growth from scheduled imports, while keeping the active generation.
  try{const previousPrefix=previous?JSON.parse(previous.payload).prefix:undefined;await db.delete(providerCache).where(and(gte(providerCache.key,key+':'),lt(providerCache.key,key+':\uffff'),or(lt(providerCache.key,prefix),gte(providerCache.key,prefix+'\uffff')),previousPrefix?or(lt(providerCache.key,previousPrefix),gte(providerCache.key,previousPrefix+'\uffff')):undefined));}catch{/* Cleanup can retry next hour; the new pointer is already committed. */}
  return Response.json({ok:true,players:ids.length,season:snapshot.season,competition:snapshot.competition,fetchedAt:snapshot.fetchedAt,lastGameDate});
 }catch{
  return Response.json({error:'La sincronización no se completó. Se conserva el historial anterior.'},{status:503});
 }finally{
  await db.delete(providerCache).where(and(eq(providerCache.key,lockKey),eq(providerCache.payload,lease)));
 }
}
