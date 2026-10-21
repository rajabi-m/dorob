import {test,expect} from 'bun:test';
import {boundedBody,publicJson} from '../src/lib/public-transport';

test('public body reader bounds advertised/streamed bytes and cancels invalid responses',async()=>{
 for(const length of ['-1','garbage','5'])await expect(boundedBody(new Response('123',{headers:{'content-length':length}}),4)).rejects.toThrow();
 let cancelled=false;
 const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(5));},cancel(){cancelled=true;}});
 await expect(boundedBody(new Response(stream),4)).rejects.toThrow();expect(cancelled).toBe(true);
 expect(new TextDecoder().decode(await boundedBody(new Response('1234'),4))).toBe('1234');
 for(const response of [new Response('bad',{headers:{'content-type':'application/json'}}),new Response('{}',{headers:{'content-type':'text/html'}})])await expect(publicJson('/api/test',{fetcher:async()=>response})).rejects.toThrow();
});
test('request mechanics preserve caller cancellation and domain-visible status',async()=>{
 const controller=new AbortController();controller.abort();
 await expect(publicJson('/api/test',{signal:controller.signal,fetcher:async(_url,init)=>{init?.signal?.throwIfAborted();return Response.json({});}})).rejects.toThrow();
 for(const status of [404,409,422,503])expect(await publicJson('/api/test',{fetcher:async()=>new Response('private',{status})})).toEqual({ok:false,status});
});
