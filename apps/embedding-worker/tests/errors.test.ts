import {test,expect} from 'bun:test';
import {modelClient} from '../src/model';
import {backendClient,WorkerHTTPError,type FetchTransport} from '../src/http';
const unavailable=(async()=>{throw new TypeError('fetch failed');}) as FetchTransport;
test('Ollama transport names service, address and recovery; cancellation stays cancellation',async()=>{
 await expect(modelClient('http://127.0.0.1:11434',unavailable)('/api/tags')).rejects.toThrow('Cannot connect to Ollama at http://127.0.0.1:11434. Start it in another terminal with: ollama serve');
 const timedOut=(async()=>{throw new DOMException('timed out','TimeoutError');}) as FetchTransport;
 await expect(modelClient('http://localhost:11435',timedOut)('/api/tags')).rejects.toThrow('Ollama at http://localhost:11435 did not respond within 60 seconds');
 const bad=(async()=>new Response('private diagnostic',{status:500})) as FetchTransport;
 await expect(modelClient('http://localhost:11435',bad)('/api/tags')).rejects.toThrow('Ollama at http://localhost:11435 returned HTTP 500');
 const controller=new AbortController();controller.abort(new Error('explicit cancellation'));await expect(modelClient('http://localhost:11435',unavailable)('/api/tags',undefined,controller.signal)).rejects.toThrow('explicit cancellation');
});
test('backend failures distinguish unavailable API, timeout and HTTP conflict',async()=>{
 await expect(backendClient('http://localhost:3001',unavailable)('/api/v1/manage/embeddings/runs')).rejects.toThrow('Cannot connect to the Dorob backend at http://localhost:3001. Start the app from the project folder with: ./run.sh');
 const timedOut=(async()=>{throw new DOMException('timeout','TimeoutError');}) as FetchTransport;
 await expect(backendClient('http://localhost:3001',timedOut)('/api/v1/manage/embeddings/runs')).rejects.toThrow('Dorob backend at http://localhost:3001 did not respond within 5 seconds');
 const conflict=(async()=>new Response('{}',{status:409})) as FetchTransport;
 await expect(backendClient('http://localhost:3001',conflict)('/api/v1/manage/embeddings/runs')).rejects.toBeInstanceOf(WorkerHTTPError);
});
test('CLI prints actionable Ollama connection error in human and JSON output',async()=>{
 for(const json of [false,true]){
  const child=Bun.spawn(['bun',new URL('../src/cli.ts',import.meta.url).pathname,'both','--ollama-origin','http://127.0.0.1:1',...(json?['--json']:[])],{stdout:'pipe',stderr:'pipe'});
  const [stdout,stderr,exit]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);expect(exit).toBe(1);const message=json?JSON.parse(stdout).error:stderr;expect(message).toContain('Cannot connect to Ollama at http://127.0.0.1:1');expect(message).toContain('ollama serve');expect(message).not.toContain('fetch failed');
 }
});
