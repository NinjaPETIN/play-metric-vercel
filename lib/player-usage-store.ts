import {env} from './database-env';

// Internal storage helper. Callers must supply the verified session's user ID.
export async function reservePlayerSlot(userId:string,id:string,day:string,limit:number){
 const key='pm:usage:'+userId+':'+day;
 const row=await env.DB!.prepare(`INSERT INTO provider_cache(key,payload,expires_at) VALUES (?,json_object('playerIds',json_array(?)),?) ON CONFLICT(key) DO UPDATE SET payload=CASE WHEN EXISTS(SELECT 1 FROM json_each(provider_cache.payload,'$.playerIds') WHERE value=?) THEN provider_cache.payload ELSE json_insert(provider_cache.payload,'$.playerIds[#]',?) END WHERE json_array_length(provider_cache.payload,'$.playerIds')<? OR EXISTS(SELECT 1 FROM json_each(provider_cache.payload,'$.playerIds') WHERE value=?) RETURNING payload`).bind(key,id,new Date(Date.now()+3*86400000).toISOString(),id,id,limit,id).first<{payload:string}>();
 return row?JSON.parse(row.payload).playerIds as string[]:null;
}
