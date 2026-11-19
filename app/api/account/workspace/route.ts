import {getChatGPTUser} from '../../../chatgpt-auth';
import {accountJson} from '../../../../lib/account-security';
import {PlanError} from '../../../../lib/account-plan';
import {isHomeView,validRecent} from '../../../../lib/workspace-state';
import {clearRecentAnalyses,readWorkspace,rememberAnalysis,saveWorkspaceHome} from '../../../../lib/workspace-store';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const fail=(e:unknown)=>reply({error:e instanceof PlanError?e.message:'No pudimos sincronizar tu espacio. Volvé a intentar.'},e instanceof PlanError?e.status:503);
async function identity(){const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Ingresá a tu cuenta para ver tu espacio.');return user.userId;}
export async function GET(){try{return reply(await readWorkspace(await identity()));}catch(e){return fail(e);}}
export async function POST(request:Request){try{const id=await identity(),body=await accountJson(request,16384);if(body.home!==undefined&&Object.keys(body).length===1&&isHomeView(body.home)){await saveWorkspaceHome(id,body.home);return reply(await readWorkspace(id));}if(body.recent!==undefined&&Object.keys(body).length===1){const recent=validRecent(body.recent);if(recent)return reply(await rememberAnalysis(id,recent));}throw new PlanError(400,'La selección no es válida.');}catch(e){return fail(e);}}
export async function DELETE(request:Request){try{const id=await identity(),body=await accountJson(request);if(Object.keys(body).length!==1||body.clear!==true)throw new PlanError(400,'Acción no válida.');return reply(await clearRecentAnalyses(id));}catch(e){return fail(e);}}
