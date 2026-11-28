import {getChatGPTUser} from '../../../chatgpt-auth';
import {accountJson} from '../../../../lib/account-security';
import {PlanError} from '../../../../lib/account-plan';
import {accountRequestBudget} from '../../../../lib/account-request-budget';
import {visitCheckpoint} from '../../../../lib/visit-checkpoints';
import type {VisitPoint} from '../../../../lib/analysis-experience';
export async function POST(request:Request){
 try{
  const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión para recordar tus visitas.');
  const body=await accountJson(request),p=body.point as VisitPoint;
  if(typeof body.scope!=='string'||(!body.scope.length||body.scope.length>6000)||!p||typeof p.line!=='number'||!Number.isFinite(p.line)||p.line<0||p.line>200||!Number.isInteger(p.n)||p.n<0||p.n>3000||![p.minutes,p.average].every(n=>n===null||typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=300)||!(p.lastDate===null||typeof p.lastDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.lastDate))||!(p.availability===undefined||p.availability===null||typeof p.availability==='string'&&p.availability.length<=100)||typeof body.mark!=='boolean')throw new PlanError(400,'Referencia de visita no válida.');
  if(p.teammates!==undefined&&(!p.teammates||typeof p.teammates!=='object'||Array.isArray(p.teammates)||Object.keys(p.teammates).length>30||Object.entries(p.teammates).some(([name,status])=>!name.length||name.length>100||typeof status!=='string'||status.length>100)))throw new PlanError(400,'Disponibilidad no válida.');
  const point:VisitPoint={line:p.line,minutes:p.minutes,average:p.average,n:p.n,lastDate:p.lastDate,availability:p.availability,teammates:p.teammates===undefined?undefined:Object.fromEntries(Object.entries(p.teammates))};
  await accountRequestBudget(user.userId,'visits');
  return Response.json(await visitCheckpoint(user.userId,body.scope,point,body.mark),{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof PlanError?e.message:'No pudimos consultar tu visita.'},{status:e instanceof PlanError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
}
