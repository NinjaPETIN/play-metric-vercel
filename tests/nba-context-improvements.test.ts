import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Game} from '../lib/analytics';
import {compareStreak} from '../lib/daily-trends';
import {parseNbaSearch} from '../lib/nba-explorer';
import {rankPositionDefense,positionGroup,type DefensiveSample} from '../lib/position-defense';
import {officialReportFromPage} from '../lib/nba-official-report';

test('natural search captures the market, actual sample and venue',()=>{
 assert.deepEqual(parseNbaSearch('¿Cuántas asistencias promedió Brunson en sus últimos 5 partidos de visitante?'),{
  name:'brunson',criteria:{market:'assists',last:5,venue:'away',answer:true},
 });
 assert.deepEqual(parseNbaSearch('Brunson, asistencias, L10').criteria,{market:'assists',last:10});
});

test('common streaks separate a live run from the hit counts and honor unders',()=>{
 const games=[19,10,20,15,24,12].map(points=>({played:true,minutes:22,points}) as Game);
 assert.deepEqual(compareStreak(games,{metric:'points',threshold:20,side:'below'}),{
  threshold:20,count:2,windows:[{hits:3,n:5},{hits:4,n:6},{hits:4,n:6}],
 });
});

test('position rankings exclude unknown statistics and use qualifying teams only',()=>{
 assert.equal(positionGroup('Guard-Forward'),'guard');
 assert.equal(positionGroup(''),null);
 const samples:DefensiveSample[]=Array.from({length:10},(_,team)=>Array.from({length:5},(_,g)=>({
  gameId:team+':'+g,opponent:'T'+team,position:'guard' as const,stats:{points:2+team,rebounds:1,assists:null,threes:0},
 }))).flat();
 const result=rankPositionDefense(samples);
 assert.equal(result.guard?.T0.find(r=>r.metric==='points')?.rank,1);
 assert.equal(result.guard?.T9.find(r=>r.metric==='points')?.rank,10);
 assert.ok(result.guard?.T0.every(r=>r.metric!=='assists'));
});

test('official report uses the most recent publication for the requested day',()=>{
 const base='https://official.nba.com/referee/injury/Injury-Report_';
 const html=['2026-11-18_11_45AM','2026-11-18_12_30PM','2026-11-19_10_00PM'].map(file=>base+file+'.pdf').join(' ');
 assert.deepEqual(officialReportFromPage(html,'2026-11-18'),{url:base+'2026-11-18_12_30PM.pdf',clock:'12:30 ET'});
 assert.equal(officialReportFromPage(html,'2026-11-17'),null);
});
