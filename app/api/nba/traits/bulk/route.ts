import {collectorOnly} from '../../../../../lib/service-access';
import {z} from 'zod';
import {and,gte,lt,sql} from 'drizzle-orm';
import {getDb} from '../../../../../db';
import {providerCache} from '../../../../../db/schema';
import {dataSchemas} from '@/lib/traits-schema';
import {traitsKey} from '../../../../../lib/traits-store';
const scope=z.object({season:z.number().int().min(2000).max(2100),competition:z.enum(['regular','preseason','playoffs'])});
export async function GET(req:Request){const denied=await collectorOnly();if(denied)return denied;const q=new URL(req.url).searchParams,p=scope.safeParse({season:Number(q.get('season')),competition:q.get('competition')});if(!p.success)return Response.json({error:'Selección no válida'},{status:400});const prefix=traitsKey('',p.data.season,p.data.competition),rows=await getDb().select({payload:providerCache.payload}).from(providerCache).where(and(gte(providerCache.key,prefix),lt(providerCache.key,prefix+'\uffff')));return Response.json({players:rows.map(r=>JSON.parse(r.payload))},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:Request){const denied=await collectorOnly();if(denied)return denied;
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no válido'},{status:403});
 const raw=await req.text();if(raw.length>150000)return Response.json({error:'Archivo demasiado grande'},{status:413});
 let p;try{p=scope.extend({source:z.enum(['zones','passes','defense']),fetchedAt:z.string().datetime({offset:true}),players:z.array(z.object({playerId:z.string().regex(/^\d{1,10}$/),data:z.unknown()})).min(1).max(50)}).parse(JSON.parse(raw));if(Date.parse(p.fetchedAt)>Date.now()+300000||new Set(p.players.map(r=>r.playerId)).size!==p.players.length)throw Error();for(const r of p.players){const d=dataSchemas[p.source].parse(r.data);r.data=d;if('zones' in d&&(!d.zones.length||new Set(d.zones.map(z=>z.key)).size!==d.zones.length||d.zones.some(z=>z.made>z.attempts)||!d.zones.some(z=>z.attempts>0)))throw Error();if('made' in d&&(d.made>d.attempts||!d.attempts))throw Error();if('passes' in d&&(!d.games||!d.passes))throw Error();}}catch{return Response.json({error:'Datos no válidos; historial conservado.'},{status:400});}
 const db=getDb(),expiresAt=new Date(Date.now()+7*86400000).toISOString();
 const writes=p.players.map(r=>{const sourcePayload={fetchedAt:p.fetchedAt,data:r.data},payload=JSON.stringify({playerId:r.playerId,season:p.season,competition:p.competition,sources:{[p.source]:sourcePayload}});return db.insert(providerCache).values({key:traitsKey(r.playerId,p.season,p.competition),payload,expiresAt}).onConflictDoUpdate({target:providerCache.key,set:{payload:sql`CASE WHEN julianday(json_extract(${providerCache.payload}, ${'$.sources.'+p.source+'.fetchedAt'})) >= julianday(${p.fetchedAt}) THEN ${providerCache.payload} ELSE json_set(${providerCache.payload}, ${'$.sources.'+p.source}, json(${JSON.stringify(sourcePayload)})) END`,expiresAt}});});
 await db.batch([writes[0],...writes.slice(1),db.insert(providerCache).values({key:`nba_traits_revision:${p.competition}:${p.season}`,payload:JSON.stringify({at:Date.now(),first:p.players[0].playerId,source:p.source}),expiresAt}).onConflictDoUpdate({target:providerCache.key,set:{payload:JSON.stringify({at:Date.now(),first:p.players[0].playerId,source:p.source}),expiresAt}})]);
 return Response.json({ok:true,count:p.players.length});
}
