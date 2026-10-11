import {headers} from 'next/headers';
import {timingSafeEqual} from 'node:crypto';
export function validCollectorToken(input:string|null,secret=process.env.COLLECTOR_SECRET){if(!secret||secret.length<32||!input)return false;const a=Buffer.from(input),b=Buffer.from(secret);return a.length===b.length&&timingSafeEqual(a,b);}
export async function collectorOnly(){const h=await headers();const token=(h.get('oai-sites-authorization')??h.get('authorization'))?.replace(/^Bearer /,'')??null;return validCollectorToken(token)?null:Response.json({error:'Acceso de servicio no autorizado.'},{status:401,headers:{'Cache-Control':'no-store'}});}
