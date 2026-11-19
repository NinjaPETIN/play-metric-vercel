import {createHash} from 'node:crypto';
import {database} from './database-env';
import {defaultWorkspace,isHomeView,validRecent,type RecentAnalysis,type HomeView,type WorkspaceState} from './workspace-state';
const preferences=(userId:string)=>'sl:workspace:home:'+userId;
const prefix=(userId:string)=>'sl:workspace:recent:'+userId+':';
export async function workspaceHome(userId:string):Promise<HomeView>{const row=await database.prepare('select payload from provider_cache where key=?').bind(preferences(userId)).first<{payload:string}>();try{const home=JSON.parse(row?.payload??'null')?.home;return isHomeView(home)?home:'explore';}catch{return 'explore';}}
export async function readWorkspace(userId:string,now=new Date()):Promise<WorkspaceState>{const p=prefix(userId),[home,rows]=await Promise.all([workspaceHome(userId),database.prepare("select payload from provider_cache where key>=? and key<? and expires_at>? order by json_extract(payload,'$.visitedAt') desc,key limit 12").bind(p,p+'\uffff',now.toISOString()).all<{payload:string}>()]);return {home,recents:rows.results.flatMap(row=>{try{const data=JSON.parse(row.payload),valid=validRecent(data);return valid&&typeof data.visitedAt==='string'&&Number.isFinite(Date.parse(data.visitedAt))?[{...valid,visitedAt:data.visitedAt}]:[];}catch{return [];}})};}
export async function saveWorkspaceHome(userId:string,home:HomeView){await database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload').bind(preferences(userId),JSON.stringify({home}),'2100-01-01T00:00:00Z').run();return home;}
export async function rememberAnalysis(userId:string,recent:Omit<RecentAnalysis,'visitedAt'>,now=new Date()){
 const p=prefix(userId),key=p+createHash('sha256').update(recent.path).digest('hex');
 const insert=database.prepare('insert into provider_cache(key,payload,expires_at) values(?,?,?) on conflict(key) do update set payload=excluded.payload,expires_at=excluded.expires_at').bind(key,JSON.stringify({...recent,visitedAt:now.toISOString()}),new Date(now.getTime()+30*86400000).toISOString());
 const prune=database.prepare("delete from provider_cache where key>=? and key<? and (expires_at<=? or key in(select key from provider_cache where key>=? and key<? order by json_extract(payload,'$.visitedAt') desc,key limit -1 offset 12))").bind(p,p+'\uffff',now.toISOString(),p,p+'\uffff');
 await database.batch([insert,prune]);return readWorkspace(userId,now);
}
export async function clearRecentAnalyses(userId:string){const p=prefix(userId);await database.prepare('delete from provider_cache where key>=? and key<?').bind(p,p+'\uffff').run();return {...defaultWorkspace,home:await workspaceHome(userId)};}
