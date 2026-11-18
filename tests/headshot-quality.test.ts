import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/nba/headshot/[id]/route';
test('exports request high resolution with a bounded thumbnail fallback and keep regular portraits lightweight',async()=>{
 const original=globalThis.fetch,calls:string[]=[];
 let highFails=false;
 globalThis.fetch=async input=>{const url=String(input);calls.push(url);return highFails&&url.includes('1040x760')?new Response(null,{status:404}):new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}});};
 const params={params:Promise.resolve({id:'2544'})};
 try{
  let response=await GET(new Request('https://statlane.test/api/nba/headshot/2544?size=large'),params);
  assert.equal(response.status,200);assert.equal(calls.length,1);assert.match(calls[0],/1040x760\/2544\.png$/);
  calls.length=0;highFails=true;
  response=await GET(new Request('https://statlane.test/api/nba/headshot/2544?size=large'),params);
  assert.equal(response.status,200);assert.equal(calls.length,2);assert.match(calls[1],/260x190\/2544\.png$/);
  calls.length=0;
  await GET(new Request('https://statlane.test/api/nba/headshot/2544'),params);
  assert.equal(calls.length,1);assert.match(calls[0],/260x190\/2544\.png$/);
  calls.length=0;
  response=await GET(new Request('https://statlane.test/api/nba/headshot/x'),{params:Promise.resolve({id:'../secret'})});
  assert.equal(response.status,404);assert.equal(calls.length,0);
 }finally{globalThis.fetch=original;}
});
