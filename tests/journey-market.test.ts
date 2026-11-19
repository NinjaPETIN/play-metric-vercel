import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyDay,minutesChange} from '../lib/journey-day';
import {analysisReference,offerIsCurrent,type SelectedMarketLine} from '../lib/market-reference';
import type {Calendar} from '../lib/nba-snapshot';
import type {Player} from '../lib/data';
import {markets} from '../lib/analytics';
const athlete=(fields:Partial<Player>):Player=>({id:'1',name:'Test player',team:'LAL',position:'G',color:'#6574ff',base:[0,0,0,0],lines:Object.fromEntries(Object.keys(markets).map(key=>[key,0])) as Player['lines'],games:[],...fields});

test('the daily workspace uses Argentina dates, current teams and actual start times without mutating inputs',()=>{
 const now=Date.parse('2026-11-20T03:30:00Z');
 const fixture=(id:string,startsAt:string,status:1|2|3,home='LAL',away='BOS')=>({id,startsAt,status,home,away,date:startsAt.slice(0,10),homeScore:null,awayScore:null,competition:'regular'});
 const calendar={games:[fixture('final','2026-11-20T03:00:00Z',3),fixture('late','2026-11-21T02:00:00Z',1),fixture('live','2026-11-20T02:00:00Z',2),fixture('early','2026-11-20T23:00:00Z',1,'CHI','BOS'),fixture('tomorrow','2026-11-21T23:00:00Z',1)]} as Calendar;
 const players=[athlete({id:'1',name:'Moved player',currentTeam:'CHI'}),athlete({id:'2',name:'Unknown team',currentTeam:null})];
 const before=JSON.stringify(calendar),result=journeyDay(calendar,players,['nba:1','nba:2'],[],now);
 assert.equal(result.day,'2026-11-20');
 assert.deepEqual(result.games.map(row=>row.game.id),['live','early','late','final']);
 assert.deepEqual(result.games.filter(row=>row.following).map(row=>row.game.id),['early']);
 assert.equal(result.games.find(row=>row.game.id==='early')?.players[0].id,'1');
 assert.equal(JSON.stringify(calendar),before);
});

test('minutes changes require ten played games and use two equally sized chronological samples',()=>{
 const games=Array.from({length:10},(_,i)=>({date:'2026-11-'+String(i+1).padStart(2,'0'),played:true,minutes:i<5?20:30,points:10,rebounds:2,assists:3,threes:1,home:true,opponent:'BOS'}));
 const player=athlete({games});
 assert.deepEqual(minutesChange(player),{current:30,previous:20,change:10});
 assert.equal(minutesChange(athlete({games:games.slice(0,9)})),null);
 assert.equal(minutesChange(athlete({games:games.map(g=>({...g,minutes:25}))})),null);
 assert.equal(games[0].date,'2026-11-01');
});

test('stale, future, invalid and unsupported market offers cannot be applied as current',()=>{
 const now=Date.parse('2026-11-20T20:00:00Z'),offer={line:20.5,price:1.9,updatedAt:'2026-11-20T19:59:00Z'};
 assert.equal(offerIsCurrent(offer,now),true);
 assert.equal(offerIsCurrent(offer,now,true),false);
 for(const change of [{updatedAt:'bad'},{updatedAt:'2026-11-20T19:44:00Z'},{updatedAt:'2026-11-20T20:01:00Z'},{price:1},{price:NaN},{line:201}])assert.equal(offerIsCurrent({...offer,...change},now),false);
});

test('market provenance only follows the exact player, metric, line and direction; manual references never invent odds',()=>{
 const origin:SelectedMarketLine={kind:'market',playerId:'1',market:'points',line:20.5,side:'over',book:'Example book',price:1.9,updatedAt:'2026-11-20T19:59:00Z'};
 assert.deepEqual(analysisReference(origin,'1','points',20.5,'over',true),{kind:'market',book:origin.book,price:1.9,updatedAt:origin.updatedAt});
 assert.deepEqual(analysisReference(origin,'1','points',21.5,'over',true),{kind:'custom'});
 assert.deepEqual(analysisReference(origin,'1','rebounds',20.5,'over',false),{kind:'automatic'});
 assert.deepEqual(analysisReference(origin,'2','points',20.5,'over',true),{kind:'custom'});
 assert.deepEqual(analysisReference(null,'1','points',20.5,'over',true),{kind:'custom'});
});
