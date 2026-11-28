import test from 'node:test';
import assert from 'node:assert/strict';
import {accountJson} from '../lib/account-security';
const req=(text:string,extra:HeadersInit={})=>new Request('https://example.test/api/account/test',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json',...extra},body:text});
const rejected=(status:number)=>(error:unknown)=>Boolean(error&&typeof error==='object'&&'status' in error&&error.status===status);
test('account JSON rejects cross-site, invalid lengths, dangerous keys and excessive complexity while preserving normal notes',async()=>{
 assert.deepEqual(await accountJson(req('{"note":"texto __proto__ permitido"}')),{note:'texto __proto__ permitido'});
 await assert.rejects(()=>accountJson(req('{}',{'sec-fetch-site':'cross-site'})),rejected(403));
 await assert.rejects(()=>accountJson(req('{}',{'content-length':'-1'})),rejected(400));
 await assert.rejects(()=>accountJson(req('{"prefs":{"__proto__":{"admin":true}}}')),rejected(400));
 await assert.rejects(()=>accountJson(req('{"a":'+ '['.repeat(14)+'0'+']'.repeat(14)+'}')),rejected(400));
 await assert.rejects(()=>accountJson(req('{"x":"large"}'),5),rejected(413));
});
test('slow streamed bodies have an overall deadline and release their reader',async()=>{
 let cancelled=false;const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}});
 const request=new Request('https://example.test/api/account/test',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body,duplex:'half'} as RequestInit);
 await assert.rejects(()=>accountJson(request,8192,10),rejected(408));assert.equal(cancelled,true);
});
test('an oversized body is rejected even when transport cancellation never settles',{timeout:1000},async()=>{
 const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('{"data":"too large"}'));},cancel(){return new Promise(()=>{});}});
 const request=new Request('https://example.test/api/account/test',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body,duplex:'half'} as RequestInit);
 await assert.rejects(()=>accountJson(request,8,20),rejected(413));
});
