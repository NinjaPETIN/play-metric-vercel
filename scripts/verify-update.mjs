// Local integration checks. All generated records below are synthetic TEST data.
// Never runs against the user's remote database or deployment.
import {spawn,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@libsql/client';
const dbPath=`/tmp/pm-batch-test-${Date.now()}.db`,port=3017,origin=`http://127.0.0.1:${port}`,secret='local-test-only-'.repeat(5);
const env={...process.env,TURSO_DATABASE_URL:'file:'+dbPath,TURSO_AUTH_TOKEN:'',COLLECTOR_SECRET:secret,NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:''};
assert.equal(spawnSync(process.execPath,['--import','tsx','scripts/init-db.ts'],{env,stdio:'pipe'}).status,0);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','-p',String(port)],{env,stdio:'pipe'});let logs='';server.stderr.on('data',d=>logs+=d.toString());server.stdout.on('data',d=>logs+=d.toString());
async function post(payload,authorized=true){const r=await fetch(origin+'/api/nba/upload',{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer '+secret}:{})},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()}}
try{
 for(let i=0;i<30;i++){try{const r=await fetch(origin+'/logout',{signal:AbortSignal.timeout(1500)});if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,100));if(i===29)throw Error('Local server failed to start: '+logs)}
 const html=await (await fetch(origin+'/logout')).text();assert.ok(html.includes('pm-auth-brand'));assert.ok(html.includes('Seguir explorando'));const login=await(await fetch(origin+'/login')).text();assert.ok(login.includes('Bienvenido a Statlane'));
 const games=Array.from({length:80},(_,i)=>({gameId:String(2000000000+i),date:new Date(Date.UTC(2025,9,1+i)).toISOString().slice(0,10),team:'ATL',opponent:'BOS',home:true,minutes:30,points:20,rebounds:5,assists:6,threes:3,steals:1,blocks:1,turnovers:2,fieldGoalsAttempted:18,fieldGoalsMade:7,freeThrowsAttempted:5,freeThrowsMade:3,offensiveRebounds:1,defensiveRebounds:4,threeAttempts:7,played:true}));
 const snapshot={source:'nba_api',competition:'regular',season:2025,fetchedAt:new Date().toISOString(),teamGames:[],players:Array.from({length:350},(_,i)=>({id:i+1,name:'Synthetic TEST player '+i,team:'ATL',games}))};const raw=Buffer.from(JSON.stringify(snapshot));assert.ok(raw.length>4_500_000&&raw.length<16_000_000);const parts=[];for(let i=0;i<raw.length;i+=500_000)parts.push(raw.subarray(i,i+500_000).toString('base64'));const m={id:randomUUID(),bytes:raw.length,parts:parts.length,sha256:createHash('sha256').update(raw).digest('hex')};
 assert.equal((await post({...m,operation:'commit'},false)).status,401);
 for(let i=0;i<parts.length;i++){const p={...m,operation:'part',index:i,data:parts[i]};assert.ok(Buffer.byteLength(JSON.stringify(p))<750_000);assert.equal((await post(p)).status,200);if(i===0){assert.equal((await post(p)).status,200);assert.equal((await post({...p,data:Buffer.from('other').toString('base64')})).status,409);assert.equal((await post({...m,operation:'commit'})).status,409)}}
 const commit=await post({...m,operation:'commit'});assert.equal(commit.status,200,JSON.stringify(commit.body)+' '+logs);assert.equal(commit.body.verified,true);assert.equal(commit.body.players,350);assert.equal(commit.body.totalGames,28000);assert.equal((await post({...m,operation:'commit'})).status,200);
 const client=createClient({url:'file:'+dbPath});const before=await client.execute("SELECT payload FROM provider_cache WHERE key='nba_api:2025'");const broken={...m,id:randomUUID()};assert.equal((await post({...broken,operation:'part',index:0,data:parts[0]})).status,200);assert.equal((await post({...broken,operation:'commit'})).status,409);const after=await client.execute("SELECT payload FROM provider_cache WHERE key='nba_api:2025'");assert.equal(after.rows[0].payload,before.rows[0].payload);client.close();
 console.log(`PASS: ${(raw.length/1e6).toFixed(1)} MB in ${parts.length} bounded requests; authentication, immutable retries, integrity, incomplete-upload preservation, atomic activation, small verified receipt, login/logout HTML.`);
}finally{server.kill('SIGTERM')}
