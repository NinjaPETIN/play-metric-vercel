import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contextSamples} from '../lib/context-samples';
import type {Game} from '../lib/analytics';
test('context comparison filters before taking each venue sample and handles pushes and missing stats',()=>{
 const game=(date:string,home:boolean,points:number,extra:Partial<Game>={}):Game=>({date,home,points,minutes:30,opponent:'BOS',rebounds:5,assists:4,threes:2,played:true,...extra});
 const rows=[game('2026-11-01',true,9),game('2026-11-03',true,10),game('2026-11-02',false,12),game('2026-11-05',false,1,{minutes:0}),game('2026-11-06',true,50,{opponent:'LAL'}),game('2026-11-04',false,4,{minutes:8})];
 const context=contextSamples(rows,'points',10,'over',1,'BOS',10);
 assert.equal(context[0].n,1);assert.equal(context[0].pushes,1);assert.equal(context[0].average,10);
 assert.equal(context[1].n,1);assert.equal(context[1].hits,1);assert.equal(context[1].average,12);
 assert.equal(context[2].n,3);assert.equal(context[2].hits,1);assert.equal(context[2].pushes,1);
 const under=contextSamples(rows,'points',10,'under',0,'BOS',10);
 assert.equal(under[0].hits,1);assert.equal(under[0].n,2);
 assert.equal(contextSamples(rows,'blocks',1,'over',0)[0].n,0);
 assert.equal(rows[0].date,'2026-11-01','the comparison does not mutate the source history');
});
