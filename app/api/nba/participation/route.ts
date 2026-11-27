import {getChatGPTUser} from '../../../chatgpt-auth';
import {authorizePlayer,PlanError} from '../../../../lib/account-plan';
import {loadDashboard} from '../../../../lib/provider';
import {cachedNbaRead} from '../../../../lib/read-cache';
import {isCompetition} from '../../../../lib/competitions';
import {accountRequestBudget} from '../../../../lib/account-request-budget';
import {samplePlayer} from '../../../../lib/public-access';
import {offensiveParticipation} from '../../../../lib/player-research';
export async function GET(request:Request){
 try{const q=new URL(request.url).searchParams,id=q.get('player')??'',season=Number(q.get('season')),competition=q.get('competition')??'';
 if(!/^\d{1,10}$/.test(id)||!Number.isInteger(season)||season<2000||season>2100||!isCompetition(competition))throw new PlanError(400,'Selección no válida.');
 const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión.');
 if(!samplePlayer(id,competition))await authorizePlayer(id);
 await accountRequestBudget(user.userId,'participation',60);
 const data=await cachedNbaRead('preview-history:'+season+':'+competition,()=>loadDashboard(season,competition,true));
 return Response.json({rows:offensiveParticipation(data.players,data.teamGames??[],id),fetchedAt:data.fetchedAt},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return Response.json({error:e instanceof PlanError?e.message:'No pudimos consultar la participación del jugador.'},{status:e instanceof PlanError?e.status:503,headers:{'Cache-Control':'private, no-store'}});}
}
