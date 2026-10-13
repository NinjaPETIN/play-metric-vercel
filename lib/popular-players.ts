import {database} from './database-env';
// Public output contains only player IDs, never visitor hashes or account identifiers.
export async function popularPlayers(now=Date.now()){
 const since=new Date(now-7*86400_000-3*3600_000).toISOString().slice(0,10);
 const rows=await database.prepare("SELECT json_extract(payload,'$.playerId') AS id, sum(json_extract(payload,'$.count')) AS total FROM provider_cache WHERE key like 'pm:beta:popular:counts:%' AND key>=? AND expires_at>? GROUP BY id HAVING total>=3 ORDER BY total DESC,id ASC LIMIT 20").bind('pm:beta:popular:counts:'+since,new Date(now).toISOString()).all<{id:string;total:number}>();
 return rows.results.map(r=>r.id).filter(id=>/^\d{1,10}$/.test(id));
}
