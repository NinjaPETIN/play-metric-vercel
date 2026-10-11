import {getChatGPTUser} from '../../../chatgpt-auth';
import {profileFor,saveProfile} from '../../../../lib/account-profile';
import {accountJson} from '../../../../lib/account-security';
import {PlanError} from '../../../../lib/account-plan';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>reply({error:e instanceof PlanError?e.message:'No pudimos actualizar el perfil.'},e instanceof PlanError?e.status:503);
export async function GET(){try{const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión.');return reply(await profileFor(user));}catch(e){return fail(e);}}
export async function POST(req:Request){try{const body=await accountJson(req);return reply(await saveProfile(body.displayName));}catch(e){return fail(e);}}
