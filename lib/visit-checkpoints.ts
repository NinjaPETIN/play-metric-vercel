import {createHash} from 'node:crypto';
import {database} from './database-env';
import type {VisitPoint} from './analysis-experience';
export async function visitCheckpoint(userId:string,scope:string,point:VisitPoint,mark:boolean){
 const prefix='pm:visit-checkpoint:'+userId+':',key=prefix+createHash('sha256').update(scope).digest('hex'),seenAt=new Date().toISOString();
 const row=await database.prepare(`insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set
 payload=case when ? or provider_cache.expires_at<=? then excluded.payload else provider_cache.payload end,
 expires_at=case when ? or provider_cache.expires_at<=? then excluded.expires_at else provider_cache.expires_at end returning payload`)
 .bind(key,JSON.stringify({point,seenAt}),new Date(Date.now()+90*86400000).toISOString(),mark?1:0,seenAt,mark?1:0,seenAt).first<{payload:string}>();
 await database.prepare("delete from provider_cache where key>=? and key<? and key not in (select key from provider_cache where key>=? and key<? order by json_extract(payload,'$.seenAt') desc limit 50)").bind(prefix,prefix+'\uffff',prefix,prefix+'\uffff').run();
 return JSON.parse(row!.payload) as {point:VisitPoint;seenAt:string};
}
