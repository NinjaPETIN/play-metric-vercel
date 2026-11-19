import test from 'node:test';
import assert from 'node:assert/strict';
import {database,databaseClient} from '../lib/database-env';
import {readWorkspace,saveWorkspaceHome,rememberAnalysis,clearRecentAnalyses} from '../lib/workspace-store';
import {validRecent} from '../lib/workspace-state';
process.env.TURSO_DATABASE_URL='file::memory:';
test('workspace preferences and recents isolate accounts, deduplicate visits, bound concurrent writes and preserve favorites',async()=>{
 await database.prepare('create table provider_cache(key text primary key,payload text not null,expires_at text not null)').run();
 await database.prepare('create table favorites(user_id text,prop_id text)').run();await database.prepare("insert into favorites values('free','2544:points')").run();
 await saveWorkspaceHome('free','calendar');await saveWorkspaceHome('admin','favorites');
 const recent=(line:number)=>validRecent({path:'/jugadores/lebron-james?stat=points&line='+line+'&side=over&season=2026&last=10',name:'LeBron James',market:'points',summary:'Más de '+line+' · 10 PJ'})!;
 await Promise.all(Array.from({length:20},(_,i)=>rememberAnalysis('free',recent(i),new Date('2026-11-19T12:'+String(i).padStart(2,'0')+':00Z'))));
 let free=await readWorkspace('free',new Date('2026-11-20'));assert.equal(free.home,'calendar');assert.equal(free.recents.length,12);assert.equal(new Set(free.recents.map(r=>r.path)).size,12);assert.equal((await readWorkspace('admin')).recents.length,0);
 await rememberAnalysis('free',recent(19),new Date('2026-11-20'));free=await readWorkspace('free',new Date('2026-11-20'));assert.equal(free.recents.length,12);assert.equal(free.recents[0].visitedAt,new Date('2026-11-20').toISOString());
 await rememberAnalysis('admin',recent(15),new Date('2026-11-20'));await clearRecentAnalyses('free');assert.equal((await readWorkspace('free')).recents.length,0);assert.equal((await readWorkspace('free')).home,'calendar');assert.equal((await readWorkspace('admin')).recents.length,1);assert.equal((await readWorkspace('admin')).home,'favorites');assert.equal((await database.prepare('select * from favorites').all()).results.length,1);
 assert.equal((await readWorkspace('admin',new Date('2026-12-25'))).recents.length,0);databaseClient().close();
});
