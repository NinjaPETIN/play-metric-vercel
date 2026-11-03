import {getChatGPTUser} from '../../../chatgpt-auth';
import {accountJson} from '../../../../lib/account-security';
import {PlanError} from '../../../../lib/account-plan';
import {readWatchlist,updateWatchlist} from '../../../../lib/watchlist-store';
import {teamNames} from '../../../../lib/team-overview';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>reply({error:e instanceof PlanError?e.message:'No pudimos guardar tu seguimiento.'},e instanceof PlanError?e.status:503);
export async function GET(){try{const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión para sincronizar tu seguimiento.');return reply(await readWatchlist(user.userId));}catch(e){return fail(e);}}
export async function POST(req:Request){try{const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión para guardar favoritos.');const b=await accountJson(req);if(!['players','teams'].includes(String(b.kind))||typeof b.item!=='string'||typeof b.saved!=='boolean'||Object.keys(b).some(k=>!['kind','item','saved'].includes(k)))throw new PlanError(400,'Selección no válida.');const kind=b.kind as 'players'|'teams';if(kind==='players'?!/^(nba|espn):\d{1,12}$/.test(b.item):!Object.hasOwn(teamNames,b.item))throw new PlanError(400,'Selección no válida.');const result=await updateWatchlist(user.userId,kind,b.item,b.saved);if(b.saved&&!result[kind].includes(b.item))throw new PlanError(409,'Podés seguir hasta 20 jugadores y 30 equipos.');return reply(result);}catch(e){return fail(e);}}
