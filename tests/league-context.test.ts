import assert from 'node:assert/strict';
import test from 'node:test';
import {rankLeague,rankMetrics} from '../lib/league-context';

test('bulk league rankings preserve single-player values, tie percentiles and eligibility',()=>{
 const rows=Array.from({length:20},(_,index)=>({id:String(index),n:index===0?4:10,minutes:index===1?140:150,
  points:(index%4)*10,rebounds:index*4,assists:30,threes:(index%7)*3}));
 const rankings=rankLeague(rows);
 for(const row of rows)assert.deepEqual(rankings.get(row.id)??[],rankMetrics(rows,row.id));
 assert.equal(rankings.get('2')?.find(metric=>metric.key==='assists')?.percentile,50);
 assert.deepEqual(rankLeague(rows.slice(0,9)),new Map());
});