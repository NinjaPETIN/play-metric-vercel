import {accountJson} from '../../../../lib/account-security';
import {redeemCode} from '../../../../lib/pro-codes';
import {PlanError} from '../../../../lib/account-plan';
export async function POST(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no válido.'},{status:403});try{let body;try{body=await accountJson(req);}catch(e){if(e instanceof PlanError)throw e;throw new PlanError(400,'Solicitud no válida.');}return Response.json(await redeemCode(body?.code),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({error:e instanceof PlanError?e.message:'No pudimos canjear el código. Intentá nuevamente.'},{status:e instanceof PlanError?e.status:503,headers:{'Cache-Control':'no-store'}});}}
