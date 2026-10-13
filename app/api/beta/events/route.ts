import {createHash} from 'node:crypto';
import {z} from 'zod';
import {database} from '../../../../lib/database-env';
import {accountJson} from '../../../../lib/account-security';
import {PlanError} from '../../../../lib/account-plan';
import {betaEvents} from '../../../../lib/beta-events';
const schema=z.object({name:z.enum(betaEvents),visitor:z.string().uuid(),consent:z.literal(true)}).strict();
// Best-effort protection for this optional, non-billing measurement endpoint.
const recent=new Map<string,{at:number;n:number}>();
export async function POST(req:Request){try{
 const parsed=schema.safeParse(await accountJson(req));if(!parsed.success)return Response.json({error:'Evento no válido'},{status:400});
 const {name,visitor}=parsed.data,hash=createHash('sha256').update('play-metric-beta:'+visitor).digest('hex'),now=Date.now(),entry=recent.get(hash);
 if(entry&&now-entry.at<60000&&entry.n>=20)return Response.json({error:'Esperá un momento'},{status:429});
 recent.set(hash,entry&&now-entry.at<60000?{at:entry.at,n:entry.n+1}:{at:now,n:1});if(recent.size>1000)recent.delete(recent.keys().next().value!);
 const day=new Date(now-3*3600_000).toISOString().slice(0,10),expiresAt=new Date(now+30*86400_000).toISOString(),visitorKey='pm:beta:visitor:'+hash;
 const statements=[];
 for(const event of name==='visit'?['visit','return_visit']:[name]){
 const seen='pm:beta:seen:'+day+':'+event+':'+hash,key='pm:beta:counts:'+day+':'+event;
 const returning=event==='return_visit'?"and exists(select 1 from provider_cache where key=? and expires_at>? and json_extract(payload,'$.firstDay')<?)":'',extra=event==='return_visit'?[visitorKey,new Date(now).toISOString(),day]:[];
 statements.push(database.prepare(`insert into provider_cache(key,payload,expires_at) select ?,json_object('count',1),? where not exists(select 1 from provider_cache where key=?) ${returning} on conflict(key) do update set payload=json_object('count',json_extract(provider_cache.payload,'$.count')+1)`).bind(key,expiresAt,seen,...extra));
 statements.push(database.prepare(`insert into provider_cache(key,payload,expires_at) select ?,'{}',? where 1=1 ${returning} on conflict(key) do nothing`).bind(seen,expiresAt,...extra));
 }
 if(name==='visit')statements.push(database.prepare("insert into provider_cache(key,payload,expires_at) values(?,json_object('firstDay',?),?) on conflict(key) do nothing").bind(visitorKey,day,expiresAt));
 // Drizzle batches execute atomically; concurrent requests cannot count a marker twice.
 await database.batch(statements);
 await database.prepare("delete from provider_cache where key in (select key from provider_cache where key like 'pm:beta:%' and expires_at<? limit 100)").bind(new Date(now).toISOString()).run();
 return new Response(null,{status:204});
 }catch(e){return Response.json({error:e instanceof PlanError?e.message:'Medición no disponible'},{status:e instanceof PlanError?e.status:503});}}
