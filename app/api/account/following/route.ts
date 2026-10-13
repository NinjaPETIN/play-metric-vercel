import {createHash} from 'node:crypto';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {database} from '../../../../lib/database-env';
import {loadDashboard} from '../../../../lib/provider';
import {catalogOptions} from '../../../../lib/catalog-options';
import {summarizeCatalogPlayer} from '../../../../lib/catalog-summary';
import {followPoint,followChanges,type FollowPoint} from '../../../../lib/following-changes';
import {markets,type Market} from '../../../../lib/analytics';
import {isCompetition} from '../../../../lib/competitions';
import {accountJson} from '../../../../lib/account-security';
import {PlanError} from '../../../../lib/account-plan';
const reply=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
async function read(req:Request){const user=await getChatGPTUser();if(!user)throw new PlanError(401,'Iniciá sesión para ver tu seguimiento.');const q=new URL(req.url).searchParams,competition=q.get('competition')??'regular',season=q.get('season');if(!isCompetition(competition)||season&&!/^20\d{2}$/.test(season))throw new PlanError(400,'Historial no válido.');const options=catalogOptions(req.url);const data=await loadDashboard(season?Number(season):undefined,competition,true),scope=JSON.stringify({season:data.season,competition,...options}),prefix='pm:following:'+user.userId+':',key=prefix+createHash('sha256').update(scope).digest('hex');const [favoriteRows,previous]=await Promise.all([database.prepare('select prop_id from favorites where user_id=? order by created_at desc limit 100').bind(user.userId).all<{prop_id:string}>(),database.prepare('select payload from provider_cache where key=? and expires_at>?').bind(key,new Date().toISOString()).first<{payload:string}>()]);const baseline=previous?JSON.parse(previous.payload):null,points:Record<string,FollowPoint>={};
 const rows=favoriteRows.results.flatMap(({prop_id})=>{const [id,m]=prop_id.split(':');if(!Object.hasOwn(markets,m)||options.market!=='all'&&options.market!==m)return [];const player=data.players.find(p=>p.id===id);if(!player)return [];const stat=summarizeCatalogPlayer(player,{...options,market:m as Market})[m as Market]!;points[prop_id]=followPoint(stat);return [{id:prop_id,playerId:id,name:player.name,market:m,current:points[prop_id],changes:followChanges(points[prop_id],baseline?.points?.[prop_id]??null)}];});
 return {key,prefix,points,response:{rows,previousVisit:baseline?.seenAt??null,fetchedAt:data.fetchedAt,season:data.season,competition}};
}
const fail=(e:unknown)=>reply({error:e instanceof PlanError?e.message:'No pudimos consultar los cambios de tu seguimiento.'},e instanceof PlanError?e.status:503);
export async function GET(req:Request){try{return reply((await read(req)).response);}catch(e){return fail(e);}}
export async function POST(req:Request){try{const body=await accountJson(req);if(body.markSeen!==true||Object.keys(body).length!==1)throw new PlanError(400,'Solicitud no válida.');const r=await read(req),seenAt=new Date().toISOString();await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at').bind(r.key,JSON.stringify({seenAt,points:r.points}),new Date(Date.now()+30*86400_000).toISOString()).run();await database.prepare("delete from provider_cache where key>=? and key<? and key not in (select key from provider_cache where key>=? and key<? order by json_extract(payload,'$.seenAt') desc limit 8)").bind(r.prefix,r.prefix+'\uffff',r.prefix,r.prefix+'\uffff').run();return reply({ok:true,seenAt});}catch(e){return fail(e);}}
