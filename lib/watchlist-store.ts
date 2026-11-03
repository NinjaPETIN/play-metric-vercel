import {database} from './database-env';
export type Watchlist={players:string[];teams:string[]};
export async function readWatchlist(userId:string):Promise<Watchlist>{
 const row=await database.prepare('SELECT payload FROM provider_cache WHERE key=?').bind('sl:watchlist:'+userId).first<{payload:string}>();
 if(row){const value=JSON.parse(row.payload);return {players:Array.isArray(value.players)?value.players.filter((v:unknown)=>typeof v==='string').slice(0,20):[],teams:Array.isArray(value.teams)?value.teams.filter((v:unknown)=>typeof v==='string').slice(0,30):[]};}
 const saved=await database.prepare('SELECT prop_id FROM favorites WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(userId).all<{prop_id:string}>();
 return {players:[...new Set(saved.results.map(r=>'nba:'+r.prop_id.split(':')[0]))].slice(0,20),teams:[]};
}
export async function updateWatchlist(userId:string,kind:'players'|'teams',item:string,saved:boolean){
 const key='sl:watchlist:'+userId,initial=await readWatchlist(userId),path='$.'+kind,limit=kind==='players'?20:30;
 const create=database.prepare('INSERT INTO provider_cache(key,payload,expires_at) VALUES (?,?,?) ON CONFLICT(key) DO NOTHING').bind(key,JSON.stringify(initial),'9999-12-31T23:59:59.999Z');
 const change=saved?database.prepare(`UPDATE provider_cache SET payload=json_insert(payload,'${path}[#]',?) WHERE key=? AND json_array_length(payload,'${path}')<? AND NOT EXISTS(SELECT 1 FROM json_each(payload,'${path}') WHERE value=?)`).bind(item,key,limit,item):database.prepare(`UPDATE provider_cache SET payload=json_set(payload,'${path}',json((SELECT json_group_array(value) FROM json_each(payload,'${path}') WHERE value<>?))) WHERE key=?`).bind(item,key);
 await database.batch([create,change]);return readWatchlist(userId);
}
