import {getChatGPTUser} from '../../../chatgpt-auth';
import {accountJson} from '../../../../lib/account-security';
import {PlanError,usageDay} from '../../../../lib/account-plan';
import {database} from '../../../../lib/database-env';
import {problemReportSchema} from '../../../../lib/problem-report';
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 try{
  const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Ingresá a tu cuenta para enviar el reporte.');
  const parsed=problemReportSchema.safeParse(await accountJson(request,200000));if(!parsed.success)throw new PlanError(400,'Escribí entre 10 y 1000 caracteres y revisá la captura.');
  if(parsed.data.image){const bytes=Buffer.from(parsed.data.image.split(',')[1],'base64');if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new PlanError(400,'Captura no válida.');}
  await database.prepare("delete from provider_cache where key like 'pm:problem:%' and expires_at<?").bind(new Date().toISOString()).run();
  const submittedAt=new Date().toISOString(),prefix='pm:problem:'+user.userId+':'+usageDay()+':';
  // A bounded number of account-owned daily slots also limits concurrent submissions.
  let stored=false;for(let slot=0;slot<3;slot++){const result=await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do nothing').bind(prefix+slot,JSON.stringify({...parsed.data,submittedAt}),new Date(Date.now()+14*86400000).toISOString()).run();if(result.meta.changes){stored=true;break;}}
  if(!stored)throw new PlanError(429,'Ya recibimos tres reportes tuyos hoy. Gracias por ayudarnos.');
  return Response.json({ok:true},{headers});
 }catch(e){return Response.json({error:e instanceof PlanError?e.message:'No pudimos enviar el reporte. Intentá nuevamente.'},{status:e instanceof PlanError?e.status:503,headers});}
}
