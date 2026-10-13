import {env} from '@/lib/database-env';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {reservePlayerSlot} from './player-usage-store';
export const DAILY_PLAYER_LIMIT=5;
export class PlanError extends Error{constructor(public status:number,message:string){super(message);}}
export function usageDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export type AccountPlan={plan:'free'|'pro';used:number;limit:number|null;remaining:number|null;playerIds:string[];day:string;resetsAt:string};
async function identity(){const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión para consultar jugadores.');return user;}
async function membership(userId:string){const row=await env.DB!.prepare('SELECT payload FROM provider_cache WHERE key=?').bind('pm:membership:'+userId).first<{payload:string}>();if(!row)return false;try{const m=JSON.parse(row.payload);return m.plan==='pro'&&typeof m.expiresAt==='string'&&Date.parse(m.expiresAt)>Date.now();}catch{return false;}}
function state(ids:string[],pro:boolean,day:string):AccountPlan{const tomorrow=new Date(day+'T03:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);return {plan:pro?'pro':'free',used:ids.length,limit:pro?null:DAILY_PLAYER_LIMIT,remaining:pro?null:Math.max(0,DAILY_PLAYER_LIMIT-ids.length),playerIds:ids,day,resetsAt:tomorrow.toISOString()};}
export async function accountPlan(){const u=await identity(),day=usageDay();const [pro,row]=await Promise.all([membership(u.userId),env.DB!.prepare('SELECT payload FROM provider_cache WHERE key=?').bind('pm:usage:'+u.userId+':'+day).first<{payload:string}>()]);return state(row?JSON.parse(row.payload).playerIds:[],pro,day);}
export async function authorizePlayer(id:string){if(!/^\d{1,10}$/.test(id))throw new PlanError(400,'Jugador no válido.');const u=await identity(),day=usageDay(),pro=await membership(u.userId);if(pro)return state([],true,day);
 // One conditional UPSERT is atomic: simultaneous tabs cannot spend a sixth slot.
 const ids=await reservePlayerSlot(u.userId,id,day,DAILY_PLAYER_LIMIT);if(!ids)throw new PlanError(429,'Alcanzaste los 5 jugadores de hoy. Podés volver a los que ya abriste o consultar nuevos mañana.');return state(ids,false,day);}
export function basicPlayer<T extends Record<string,any>>(p:T,pro:boolean):T{if(pro)return p;return {...p,leagueContext:null,traits:p.traits?{...p.traits,sources:{...p.traits.sources,shots:null,passes:null,defense:null}}:p.traits};}
