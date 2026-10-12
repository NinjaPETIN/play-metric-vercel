import {cachedNbaRead} from '../../../../lib/read-cache';
import {internalRead,ApiError} from '../../../../lib/internal-api';
import {accountPlan,authorizePlayer,basicPlayer,PlanError} from '../../../../lib/account-plan';
export async function GET(req:Request,{params}:{params:Promise<{path:string[]}>}){
 try{const {path}=await params;let account=path[0]==='players'&&path[1]?await authorizePlayer(path[1]):await accountPlan();const data:any=await cachedNbaRead(req.url,()=>internalRead(path,req.url),req.headers.get('cache-control')?.includes('no-cache'));if(path[0]==='players'&&path[1]){if(!account.plan||account.plan!=='pro'){if(path[2]==='league-context')throw new PlanError(403,'La comparativa con la liga está disponible en Pro.');if(path[2]==='traits')return Response.json({...data,sources:{zones:data.sources?.zones??null}},{headers:{'Cache-Control':'no-store'}});}}
 const result=data.players?{...data,players:data.players.map((p:any)=>basicPlayer(p,account.plan==='pro'&&path[0]==='players'&&!!path[1]))}:data;
 return Response.json(result,{headers:{'Cache-Control':'no-store','X-Play-Metric-API':'1'}});}catch(e){if(e instanceof ApiError||e instanceof PlanError)return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});console.error('Internal NBA API read failed',e instanceof Error?e.message:'Unknown');return Response.json({error:'No se pudo consultar el historial. Los datos guardados se conservan.'},{status:503});}
}
