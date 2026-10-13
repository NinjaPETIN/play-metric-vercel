import {createHash} from 'node:crypto';
import {z} from 'zod';
import {database} from '../../../../lib/database-env';
import {accountJson} from '../../../../lib/account-security';
import {PlanError} from '../../../../lib/account-plan';
import {betaEvents} from '../../../../lib/beta-events';
const schema=z.object({name:z.enum(betaEvents),visitor:z.string().uuid(),consent:z.literal(true)}).strict();
import {consumeBudget,connectionHash} from '../../../../lib/metrics-budget';

export async function POST(req:Request){try{
 const parsed=schema.safeParse(await accountJson(req));if(!parsed.success)return Response.json({error:'Evento no válido'},{status:400});
 const {name,visitor}=parsed.data,hash=createHash('sha256').update('play-metric-beta:'+visitor).digest('hex'),now=Date.now();
 const secret=process.env.COLLECTOR_SECRET;if(!secret||secret.length<32)return Response.json({error:'Medición no disponible'},{status:503});
 const limited=()=>Response.json({error:'Límite de medición alcanzado'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
 // Global budgets run first: rotating visitors/IPs cannot create unbounded rows.
 if(!await consumeBudget('global-minute',500,60000,now)||!await consumeBudget('global-day',10000,86400_000,now))return limited();
 if(!await consumeBudget('connection:'+connectionHash(req,secret,now),30,60000,now)||!await consumeBudget('visitor:'+hash,20,60000,now))return limited();
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
 await database.prepare("delete from provider_cache where key in (select key from provider_cache where (key like 'pm:beta:%' or key like 'pm:limit:metrics:%') and expires_at<? limit 100)").bind(new Date(now).toISOString()).run();
 return new Response(null,{status:204});
 }catch(e){return Response.json({error:e instanceof PlanError?e.message:'Medición no disponible'},{status:e instanceof PlanError?e.status:503});}}
