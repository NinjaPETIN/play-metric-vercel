import test from 'node:test';
import assert from 'node:assert/strict';
import {recentCourt} from '../lib/recent-court';
const shot={id:'1',text:'Player misses 27-foot three point jumper',period:1,clock:'1:50',awayScore:32,homeScore:26,team:'GSW',athleteId:'99',shotLocation:{x:25,y:27}};
test('a newer timeout without an athlete replaces an older shot; team belongs to the game',()=>{
 const timeout={...shot,id:'2',text:'Clippers Full timeout',clock:'1:35',team:'LAC',athleteId:null,shotLocation:null};
 const result=recentCourt([shot,timeout],['LAC','GSW']);
 assert.equal(result.action?.id,'2');assert.equal(result.timeout,true);assert.equal(result.timeoutTeam,'LAC');
 assert.equal(recentCourt([timeout,{...shot,id:'3',clock:'1:20'}],['LAC','GSW']).timeout,false);
});
test('official timeouts never invent a team, empty feeds are safe and technical violations are not timeouts',()=>{
 assert.equal(recentCourt([{...shot,text:'Official timeout',team:null}],['LAC','GSW']).timeoutTeam,null);
 assert.equal(recentCourt([{...shot,text:'Full timeout',team:'BOS'}],['LAC','GSW']).timeoutTeam,null);
 assert.equal(recentCourt([{...shot,text:'Excess timeout technical foul'}],['LAC','GSW']).timeout,false);
 assert.equal(recentCourt([shot],['LAC','GSW']).timeout,false);
 assert.equal(recentCourt([],['LAC','GSW']).action,undefined);
});
