import {accountJson} from '../../../../lib/account-security';
import {createCode,listCodes,disableCode} from '../../../../lib/pro-codes';
import {PlanError} from '../../../../lib/account-plan';
const response=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const failure=(e:unknown)=>response({error:e instanceof PlanError?e.message:'No pudimos gestionar los códigos.'},e instanceof PlanError?e.status:503);
export async function GET(){try{return response({codes:await listCodes()});}catch(e){return failure(e);}}
export async function POST(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Origen no válido.'},403);try{const body=await accountJson(req);if(!body||typeof body!=='object')throw new PlanError(400,'Solicitud no válida.');if(body.action==='disable'){await disableCode(body.id);return response({ok:true});}return response(await createCode(body));}catch(e){return failure(e);}}
