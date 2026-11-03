import test from 'node:test';
import assert from 'node:assert/strict';
import type {Player} from '../lib/data';
import type {TeamGame} from '../lib/nba-snapshot';
import {catalogDetailSample,catalogGameResult} from '../lib/catalog-detail';
import {defaultCatalogOptions,summarizeCatalogPlayer} from '../lib/catalog-summary';
import {createPlayerSearchIndex,matchesPlayerSearch,normalizeSearch} from '../lib/player-search';
const p={id:'9',name:'Test',team:'PHI',lines:{points:12.5},games:Array.from({length:36},(_,i)=>({gameId:String(i).padStart(10,'0'),team:'PHI',date:'2026-10-'+String(i+1).padStart(2,'0'),opponent:i%2?'BOS':'NYK',home:i%2===0,minutes:i===35?0:30,played:i!==35,points:i,rebounds:2,assists:3,threes:1,steals:i===34?undefined:1}))} as Player;
test('chart detail uses identical filters, chronology and bounded windows and refuses mismatched generations',()=>{
 for(const last of [5,10,20,0]){const options={...defaultCatalogOptions,last,venue:'home',opponent:'NYK',minutes:20};const a=summarizeCatalogPlayer(p,options).points!;const sample=catalogDetailSample(p,options,a.recent!);assert.ok(sample);assert.deepEqual(sample.map(g=>g.points),a.recent);assert.ok(sample.length<=30);assert.ok(sample.every(g=>g.home&&g.opponent==='NYK'&&g.played&&g.minutes>=20));assert.equal(catalogDetailSample(p,options,[999]),null);}
 const options={...defaultCatalogOptions,market:'steals' as const};const a=summarizeCatalogPlayer(p,options).steals!;assert.equal(a.recent?.at(-1),null);assert.equal(catalogDetailSample(p,options,a.recent!)?.at(-1)?.steals,undefined);
});
test('game results require a unique verified game and preserve historical teams after a trade',()=>{
 const g={...p.games[0],date:'2026-10-01',gameId:'0022600001',home:true,team:'PHI',opponent:'NYK'};const result={id:g.gameId,date:g.date,home:'PHI',away:'NYK',homeScore:110,awayScore:100} as TeamGame;
 assert.equal(catalogGameResult(g,[result]),'NYK 100 - 110 PHI');assert.equal(catalogGameResult(g,[{...result,home:'LAL'}]),null);assert.equal(catalogGameResult(g,[{...result,date:'2026-10-02'}]),null);assert.equal(catalogGameResult(g,[]),null);assert.equal(catalogGameResult({...g,gameId:undefined},[result,result]),null);
});
test('search handles accents, word order and full current team names without retaining former teams',()=>{
 const index=createPlayerSearchIndex([{id:'1',name:'Luka Dončić',team:'DAL',currentTeam:'LAL'},{id:'2',name:'Sin Equipo',team:'BOS',currentTeam:null}]);
 assert.ok(matchesPlayerSearch(index.get('1')!,normalizeSearch('doncic los angeles')));assert.ok(matchesPlayerSearch(index.get('1')!,normalizeSearch('lakers luka')));assert.equal(matchesPlayerSearch(index.get('1')!,'dal'),false);assert.equal(matchesPlayerSearch(index.get('2')!,'bos'),false);
});
