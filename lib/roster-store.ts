import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {providerCache} from '../db/schema';
import {rosterSchema,type Roster} from './roster';
export async function loadRoster():Promise<Roster|null>{const [row]=await getDb().select({payload:providerCache.payload}).from(providerCache).where(eq(providerCache.key,'nba_roster'));if(!row)return null;const parsed=rosterSchema.safeParse(JSON.parse(row.payload));return parsed.success?parsed.data:null;}
