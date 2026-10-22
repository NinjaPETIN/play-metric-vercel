import {collectorOnly} from '../../../lib/service-access';
import {getChatGPTUser} from '../../chatgpt-auth';
import {accountPlan,basicPlayer} from '../../../lib/account-plan';
import {compactDashboard} from '../../../lib/compact-dashboard';
import {isCompetition} from '../../../lib/competitions';
import {loadDashboard} from '../../../lib/provider';
export async function GET(req:Request){const denied=await collectorOnly();if(denied)return denied;const q=new URL(req.url).searchParams,raw=q.get('season'),competition=q.get('competition')??'regular';if(!isCompetition(competition))return Response.json({error:'Competición no válida.'},{status:400});if(raw&&!/^20\d{2}$/.test(raw))return Response.json({error:'Temporada no válida.'},{status:400});try{const data=await loadDashboard(raw?Number(raw):undefined,competition);return Response.json(q.get('format')==='compact'?compactDashboard(data):data,{headers:{'Cache-Control':'no-store'}});}catch(e){console.error('NBA dashboard read failed:',e instanceof Error?e.message+'; '+(e.cause instanceof Error?e.cause.message:''):'Unknown read error');return Response.json({error:'No hay historial disponible para esta temporada.'},{status:503});}}
