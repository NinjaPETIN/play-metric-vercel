import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('full regular-season history uses bounded database responses without losing games',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pm-provider-'));
 process.env.TURSO_DATABASE_URL='file:'+join(dir,'test.db');
 process.env.TURSO_AUTH_TOKEN='';
 const {databaseClient}=await import('../lib/database-env');
 const client=databaseClient();
 try{
  await client.execute('CREATE TABLE provider_cache (key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)');
  // Synthetic records stay in a temporary local database, never production.
  const prefix='nba_api:2025:test:',games=Array.from({length:82},(_,i)=>({gameId:String(2000000000+i),date:new Date(Date.UTC(2025,9,1+i)).toISOString().slice(0,10),team:'ATL',opponent:'BOS',home:true,minutes:30,points:20,rebounds:5,assists:6,threes:3,played:true,padding:'x'.repeat(250)}));
  const players=Array.from({length:241},(_,i)=>({id:i+1,name:'TEST '+i,team:'ATL',games}));
  await client.batch([{sql:'INSERT INTO provider_cache VALUES (?,?,?)',args:['nba_api:2025',JSON.stringify({prefix,fetchedAt:'2026-10-01T00:00:00Z',teamGames:[]}),'2099-01-01']},...players.map(p=>({sql:'INSERT INTO provider_cache VALUES (?,?,?)',args:[prefix+p.id,JSON.stringify(p),'2099-01-01']}))],'write');
  const execute=client.execute.bind(client);let pages=0;
  client.execute=(async statement=>{const result=await execute(statement);const query=typeof statement==='string'?statement:statement.sql;if(query.includes('order by')){pages++;assert.ok(Buffer.byteLength(JSON.stringify(result))<2_000_000,'Database response exceeded simulated transport limit');}return result;}) as typeof client.execute;
  const {loadDashboard}=await import('../lib/provider');
  for(const catalog of [true,false]){const data=await loadDashboard(2025,'regular',catalog);assert.equal(data.players.length,players.length);assert.equal(new Set(data.players.map(p=>p.id)).size,players.length);assert.equal(data.players.reduce((n,p)=>n+p.games.length,0),241*82);}
  assert.equal(pages,14);
 }finally{client.close();await rm(dir,{recursive:true,force:true});}
});
