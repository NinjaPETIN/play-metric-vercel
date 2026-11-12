import {eq,sql} from 'drizzle-orm';
import {getDb} from '../db';
import {providerCache} from '../db/schema';
import {ROSTER_MAX_AGE_MS,rosterSchema,type Roster} from './roster';
import {database} from './database-env';
import {collectRoster} from '../collector/roster-source.mjs';
export async function loadRoster():Promise<Roster|null>{const [row]=await getDb().select({payload:providerCache.payload}).from(providerCache).where(eq(providerCache.key,'nba_roster'));if(!row)return null;const parsed=rosterSchema.safeParse(JSON.parse(row.payload));return parsed.success?parsed.data:null;}

export async function saveRoster(roster:Roster) {
 const payload=JSON.stringify(roster);
 await getDb().insert(providerCache).values({key:'nba_roster',payload,expiresAt:'2099-01-01T00:00:00.000Z'})
  .onConflictDoUpdate({target:providerCache.key,set:{payload},setWhere:sql`json_extract(${providerCache.payload}, '$.fetchedAt') < ${roster.fetchedAt}`});
}

export async function refreshRosterIfStale(){
 const now=Date.now(), at=new Date(now).toISOString();
 // The shared cooldown limits attempts across instances and checks the actual stored generation.
 const lease=await database.prepare(`
  INSERT INTO provider_cache(key,payload,expires_at)
  SELECT 'pm:roster-refresh-lease','{}',? WHERE NOT EXISTS (
   SELECT 1 FROM provider_cache WHERE key='nba_roster' AND json_extract(payload,'$.fetchedAt')>=?
  )
  ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at WHERE provider_cache.expires_at<=?
 `).bind(new Date(now+15*60_000).toISOString(),new Date(now-ROSTER_MAX_AGE_MS).toISOString(),at).run();
 if(!lease.meta.changes)return;
 const signal=AbortSignal.timeout(16_000);
 const snapshot=await collectRoster(async url=>{
  const response=await fetch(url,{signal,cache:'no-store',redirect:'error'});
  if(!response.ok)throw new Error('NBA.com devolvió HTTP '+response.status);
  return response.json();
 });
 await saveRoster(rosterSchema.parse(snapshot));
}
