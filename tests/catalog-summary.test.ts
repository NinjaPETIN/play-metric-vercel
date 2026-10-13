import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeCatalogPlayer,catalogRows,defaultCatalogOptions} from '../lib/catalog-summary';
import {catalogOptions} from '../lib/catalog-options';
import {publicCatalog} from '../lib/public-access';
import {scopedNbaRead} from '../lib/scoped-nba-read';
import type {Player} from '../lib/data';
const games=Array.from({length:12},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,'0')}`,played:true,minutes:i<6?18:30,home:i%2===0,opponent:i%2===0?'BOS':'ATL',points:i+10,rebounds:i+1,assists:12-i,threes:i%4}));
const player={id:'999',name:'Test Player',team:'PHI',games,lines:{points:15.5,rebounds:6.5,assists:5.5,threes:1.5}} as Player;
test('selected markets and sample windows produce distinct aggregates; combinations work too',()=>{
 const assists=summarizeCatalogPlayer(player,{...defaultCatalogOptions,market:'assists',last:5});assert.deepEqual(Object.keys(assists),['assists']);assert.equal(assists.assists?.average,3);assert.equal(assists.assists?.n,5);
 const rebounds=summarizeCatalogPlayer(player,{...defaultCatalogOptions,market:'rebounds',last:5});assert.equal(rebounds.rebounds?.average,10);assert.equal(rebounds.rebounds?.rate,1);
 assert.equal(summarizeCatalogPlayer(player,{...defaultCatalogOptions,market:'assists',last:10}).assists?.average,5.5);
 assert.equal(summarizeCatalogPlayer(player,{...defaultCatalogOptions,market:'assists',last:0}).assists?.average,6.5);
 assert.equal(summarizeCatalogPlayer(player,{...defaultCatalogOptions,market:'pa',last:5}).pa?.average,22);
 assert.deepEqual(Object.keys(summarizeCatalogPlayer(player,{...defaultCatalogOptions,market:'all'})),['points','rebounds','assists','threes']);
});
test('filters precede sample selection; missing optional statistics do not become zero values',()=>{
 const options={...defaultCatalogOptions,market:'assists' as const,last:5,venue:'home',opponent:'BOS',minutes:25};const a=summarizeCatalogPlayer(player,options).assists!;assert.equal(a.n,3);assert.equal(a.average,4);
 const b=summarizeCatalogPlayer(player,{...options,market:'steals'}).steals!;assert.equal(b.n,0);assert.equal(b.average,null);assert.equal(b.rate,null);
});
test('public summaries retain no histories or Pro fields; market changes reach the real free-user read path',async()=>{
 const data={players:[{...player,profile:{private:true},traits:{private:true},leagueContext:{private:true}}]};
 const deps={user:async()=>({id:'free'}),plan:async()=>({plan:'free'}),authorize:async()=>{throw Error('Collection must not spend player quota');},read:async()=>data};
 for(const market of ['points','rebounds','assists','pa']){const d=await scopedNbaRead(['players'],`https://example.test/api/v1/players?stat=${market}&last=5`,deps);assert.equal(d.catalogScope.market,market);assert.deepEqual(d.players[0].games,[]);assert.equal(d.players[0].profile,null);assert.equal(d.players[0].traits,null);assert.equal(d.players[0].leagueContext,null);assert.deepEqual(Object.keys(d.players[0].catalogStats),[market]);}
 assert.equal(player.games.length,12);
});
test('catalog rows rank, filter and open the selected statistic, including a mixed overview',()=>{
 const one=publicCatalog({players:[player]},{...defaultCatalogOptions,market:'assists',last:5}).players[0];
 const other={...one,id:'123',name:'Other',catalogStats:{assists:{...one.catalogStats.assists,average:9,rate:1}}};
 const settings={sort:'average',minGames:5,minRate:0,minLine:0,maxLine:200};const rows=catalogRows([one,other],'assists',settings);assert.equal(rows[0].p.id,'123');assert.equal(rows[0].m,'assists');assert.equal(catalogRows([one],'rebounds',settings).length,0);assert.equal(catalogRows([one],'assists',{...settings,minGames:6}).length,0);assert.equal(catalogRows([one],'assists',{...settings,minRate:50}).length,0);
});
test('invalid market names and sample/filter values fail before reading data',async()=>{
 for(const query of ['stat=unknown','stat=__proto__','last=1000','last=NaN','minutes=-1','venue=invalid','opponent=ZZZ','side=invalid'])assert.throws(()=>catalogOptions('https://example.test/?'+query));
 let read=false;await assert.rejects(scopedNbaRead(['players'],'https://example.test/?stat=unknown',{user:async()=>null,plan:async()=>({plan:'free'}),authorize:async()=>({plan:'free'}),read:async()=>{read=true;return {};}}));assert.equal(read,false);
});
