import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLiveBoxscore,boxFeed} from '../lib/live-boxscore';
import {normalizeLiveScores,type LiveGame} from '../lib/live-scores';
import {readLiveBoxscore} from '../lib/live-boxscore-store';
import {courtKnown,playerGroups} from '../lib/boxscore-display';
import {database,databaseClient} from '../lib/database-env';
process.env.TURSO_DATABASE_URL='file::memory:';
function fixture(){
 const competitors=[{homeAway:'home',score:'100',team:{abbreviation:'GS',displayName:'Warriors'}},{homeAway:'away',score:'90',team:{abbreviation:'LAL',displayName:'Lakers'}}];
 const event={id:'12345',date:new Date().toISOString(),status:{period:3,displayClock:'6:16',type:{name:'STATUS_IN_PROGRESS',state:'in',completed:false}},competitions:[{competitors}]};
 const game={...normalizeLiveScores({leagues:[{abbreviation:'NBA'}],events:[event]})[0],nbaId:'0022600023'};
 const labels=['MIN','PTS','FG','3PT','FT','REB','AST','TO','STL','BLK','OREB','DREB','PF','+/-'];
 const teams=['LAL','GS'].map((abbreviation,offset)=>({team:{abbreviation,displayName:abbreviation},statistics:[{labels,athletes:[...Array.from({length:5},(_,i)=>({athlete:{id:String(offset*10+i+1),displayName:`Player ${offset}-${i}`},starter:true,active:true,didNotPlay:false,stats:['24',offset?'20':'18','5-10','2-5',offset?'8-8':'6-8','5','3','1','1','1','1','4','2','+7']})),{athlete:{id:String(offset*10+9),displayName:'Bench '+offset},starter:false,active:false,didNotPlay:true,stats:[]}]}]}));
 return {game,raw:{header:{id:event.id,league:{abbreviation:'NBA'},competitions:[{...event.competitions[0],date:event.date,status:event.status}]},boxscore:{players:teams}}};
}
test('live box scores retain actual starter flags, stats, missing participation and their own contemporaneous score',()=>{
 const {raw,game}=fixture(),d=normalizeLiveBoxscore(raw,game);assert.equal(d.teams[0].code,'LAL');assert.equal(d.teams[1].score,100);assert.equal(d.teams[0].players[0].points,18);assert.equal(d.teams[0].players[0].minutes,'24');assert.equal(d.teams[0].players[5].points,null);assert.equal(d.teams[0].players[5].minutes,null);assert.equal(d.teams[0].players[5].didNotPlay,true);assert.equal(d.game.nbaId,game.nbaId);
 // The summary can legitimately be ahead of the separately queried scoreboard.
 assert.equal(normalizeLiveBoxscore(raw,{...game,homeScore:95}).teams[1].score,100);
});
test('wrong event, teams, duplicate players, incomplete stats and mismatched point totals fail closed',()=>{
 const mutations:Array<(r:ReturnType<typeof fixture>['raw'])=>void>=[r=>{r.header.id='999';},r=>{r.boxscore.players[0].team.abbreviation='BOS';},r=>{r.boxscore.players[1].statistics[0].athletes[0].athlete.id='1';},r=>{r.boxscore.players[0].statistics[0].athletes[0].stats[1]='99';},r=>{r.boxscore.players[0].statistics[0].athletes.pop();r.boxscore.players[0].statistics[0].athletes.pop();},r=>{r.boxscore.players[0].statistics[0].athletes[0].stats[4]='9-2';}];
 for(const mutate of mutations){const {raw,game}=fixture();mutate(raw);assert.throws(()=>normalizeLiveBoxscore(raw,game));}
});
test('old player statistics expire and failures never refresh the data timestamp',()=>{
 const {raw,game}=fixture(),now=Date.now(),saved={data:normalizeLiveBoxscore(raw,game),checkedAt:new Date(now).toISOString(),fetchedAt:new Date(now-10000).toISOString(),failed:false};
 assert.equal(boxFeed(saved,now).status,'ready');assert.equal(boxFeed({...saved,failed:true},now).status,'stale');assert.equal(boxFeed({...saved,fetchedAt:new Date(now-300001).toISOString()},now).data,null);
});
test('final summaries without a clock complete the live-to-final transition; live summaries still require timing',()=>{
 const {raw,game}=fixture();
 const finalRaw={...raw,header:{...raw.header,competitions:[{...raw.header.competitions[0],status:{type:{name:'STATUS_FINAL',state:'post',completed:true}}}]}};
 const final=normalizeLiveBoxscore(finalRaw,game);assert.equal(final.game.state,'final');assert.equal(final.game.detail,'Final');assert.equal(final.game.clock,'');assert.equal(final.teams[1].score,100);
 const overtime=normalizeLiveBoxscore(finalRaw,{...game,state:'final',period:6});assert.equal(overtime.game.period,6);
 const liveRaw={...finalRaw,header:{...finalRaw.header,competitions:[{...finalRaw.header.competitions[0],status:{type:{name:'STATUS_IN_PROGRESS',state:'in',completed:false}}}]}};
 assert.throws(()=>normalizeLiveBoxscore(liveRaw,game));
});
test('unpublished minutes remain null without discarding a player who did participate',()=>{
 const {raw,game}=fixture();raw.boxscore.players[0].statistics[0].athletes[0].stats[0]='-';
 const p=normalizeLiveBoxscore(raw,game).teams[0].players[0];assert.equal(p.minutes,null);assert.equal(p.didNotPlay,false);assert.equal(p.assists,3);
 raw.boxscore.players[0].statistics[0].athletes[0].stats[0]='invalid';assert.throws(()=>normalizeLiveBoxscore(raw,game));
});
test('court groups follow substitutions independently of starting status',()=>{
 const {raw,game}=fixture(),athletes=raw.boxscore.players[0].statistics[0].athletes;
 const before=normalizeLiveBoxscore(raw,game).teams[0];assert.equal(courtKnown(before,'live'),true);assert.equal(before.players.filter(p=>p.onCourt).length,5);
 athletes[0].active=false;athletes[5].active=true;athletes[5].didNotPlay=false;athletes[5].stats=['1','0','0-0','0-0','0-0','0','0','0','0','0','0','0','0','+1'];
 const after=normalizeLiveBoxscore(raw,game).teams[0],groups=playerGroups(after,'live');
 assert.equal(after.players[0].starter,true);assert.equal(after.players[0].onCourt,false);assert.equal(after.players[5].starter,false);assert.equal(after.players[5].onCourt,true);
 assert.equal(groups[0].title,'En cancha');assert.equal(groups[0].players.length,5);assert.ok(groups[0].players.some(p=>p.id===athletes[5].athlete.id));assert.ok(groups[1].players.some(p=>p.id===athletes[0].athlete.id));
});
test('missing or inconsistent activity never becomes a guessed court lineup',()=>{
 const {raw,game}=fixture();raw.boxscore.players[0].statistics[0].athletes[0].active=false;
 const bad=normalizeLiveBoxscore(raw,game).teams[0];assert.ok(bad.players.every(p=>p.onCourt===null));assert.equal(courtKnown(bad,'live'),false);assert.equal(playerGroups(bad,'live')[0].title,'Titulares');
 const second=fixture();Reflect.deleteProperty(second.raw.boxscore.players[0].statistics[0].athletes[0],'active');assert.ok(normalizeLiveBoxscore(second.raw,second.game).teams[0].players.every(p=>p.onCourt===null));
});
test('court indications disappear at halftime, final and stale readings, while starters remain identifiable',()=>{
 const {raw,game}=fixture(),team=normalizeLiveBoxscore(raw,game).teams[0];assert.equal(courtKnown(team,'live',true),false);assert.equal(playerGroups(team,'live',true)[0].title,'Titulares');assert.equal(courtKnown(team,'final'),false);
 raw.header.competitions[0].status.type.name='STATUS_HALFTIME';assert.ok(normalizeLiveBoxscore(raw,game).teams.every(t=>t.players.every(p=>p.onCourt===null)));
 raw.header.competitions[0].status.type={name:'STATUS_FINAL',state:'post',completed:true};const final=normalizeLiveBoxscore(raw,game);assert.ok(final.teams.every(t=>t.players.every(p=>p.onCourt===null)));assert.equal(final.teams[0].players.filter(p=>p.starter).length,5);
});
test('per-game persistent leases share reads; failed refreshes preserve verified players',async()=>{
 await database.prepare('CREATE TABLE provider_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL)').run();const original=globalThis.fetch;let calls=0;const {raw,game}=fixture();
 try{
  globalThis.fetch=async()=>{calls++;return Response.json(raw);};const results=await Promise.all(Array.from({length:6},()=>readLiveBoxscore(game as LiveGame)));assert.equal(calls,1);assert.ok(results.some(r=>r.status==='ready'));
  const ready=await readLiveBoxscore(game);assert.equal(ready.data?.teams[0].players.length,6);
  await database.prepare('update provider_cache set payload=? where key=?').bind(JSON.stringify({data:ready.data,fetchedAt:ready.fetchedAt,checkedAt:'2000-01-01T00:00:00.000Z',failed:false}),'pm:box:v1:'+game.id).run();await database.prepare('update provider_cache set expires_at=? where key=?').bind('2000-01-01T00:00:00.000Z','pm:box:v1:'+game.id+':lease').run();
  globalThis.fetch=async()=>{calls++;return new Response('Failed',{status:503});};const failed=await readLiveBoxscore(game);assert.equal(failed.status,'stale');assert.equal(failed.fetchedAt,ready.fetchedAt);assert.deepEqual(failed.data,ready.data);await readLiveBoxscore(game);assert.equal(calls,2);
 }finally{globalThis.fetch=original;databaseClient().close();}
});
