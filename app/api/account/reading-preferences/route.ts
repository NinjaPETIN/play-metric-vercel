import { getChatGPTUser } from '../../../chatgpt-auth';
import { accountJson } from '../../../../lib/account-security';
import { PlanError } from '../../../../lib/account-plan';
import { database } from '../../../../lib/database-env';

const reply = (data:unknown, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail = (error:unknown) => reply({error:error instanceof PlanError?error.message:'No pudimos sincronizar tus preferencias.'},error instanceof PlanError?error.status:503);
const key = (userId:string) => 'pm:reading-preferences:' + userId;

export async function GET() {
 try {
  const user = await getChatGPTUser();
  if (!user) return reply({preferences:null, authenticated:false});
  const row = await database.prepare('select payload from provider_cache where key=?').bind(key(user.userId)).first<{payload:string}>();
  return reply({preferences:row?JSON.parse(row.payload):null,authenticated:true});
 } catch(error) { return fail(error); }
}

export async function POST(request:Request) {
 try {
  const user = await getChatGPTUser();
  if (!user) throw new PlanError(401,'Iniciá sesión para sincronizar tus preferencias.');
  const patch = await accountJson(request);
  const now=Date.now();
  const statsOnly=patch.statsOnly,pauseUntil=patch.pauseUntil;
  if (!Object.keys(patch).length || Object.keys(patch).some(key=>key!=='statsOnly'&&key!=='pauseUntil')
   || (statsOnly!==undefined&&typeof statsOnly!=='boolean')
   || (pauseUntil!==undefined&&(typeof pauseUntil!=='number'||!Number.isSafeInteger(pauseUntil)||pauseUntil<0||pauseUntil>now+7*86400000+300000))) throw new PlanError(400,'Preferencia no válida.');
  const initial=JSON.stringify({statsOnly:statsOnly===true,pauseUntil:typeof pauseUntil==='number'?pauseUntil:0});
  const row=await database.prepare(`insert into provider_cache(key,payload,expires_at) values(?,?,?)
    on conflict(key) do update set payload=json_set(provider_cache.payload,
      '$.statsOnly',json(coalesce(?,case when json_extract(provider_cache.payload,'$.statsOnly')=1 then 'true' else 'false' end)),
      '$.pauseUntil', max(coalesce(json_extract(provider_cache.payload,'$.pauseUntil'),0),?))
    returning payload`).bind(key(user.userId),initial,'2100-01-01T00:00:00Z',typeof statsOnly==='boolean'?JSON.stringify(statsOnly):null,pauseUntil??0).first<{payload:string}>();
  if(!row) throw Error('Preferencia no guardada');
  return reply({preferences:JSON.parse(row.payload),authenticated:true});
 } catch(error) { return fail(error); }
}
