import {cachedNbaRead,forceNbaRead} from '../../../../lib/read-cache';
import {internalRead,ApiError} from '../../../../lib/internal-api';
import {accountPlan,authorizePlayer,PlanError} from '../../../../lib/account-plan';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {scopedNbaRead} from '../../../../lib/scoped-nba-read';
export async function GET(req:Request,{params}:{params:Promise<{path:string[]}>}){
 try{const {path}=await params;const result=await scopedNbaRead(path,req.url,{user:getChatGPTUser,plan:accountPlan,authorize:authorizePlayer,read:()=>cachedNbaRead(req.url,()=>internalRead(path,req.url),forceNbaRead(req))});return Response.json(result,{headers:{'Cache-Control':'no-store','X-Play-Metric-API':'1'}});
 }catch(e){if(e instanceof ApiError||e instanceof PlanError)return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});console.error('Internal NBA API read failed',e instanceof Error?e.message:'Unknown');return Response.json({error:'No se pudo consultar el historial. Los datos guardados se conservan.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
