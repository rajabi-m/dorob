import {test,expect} from 'bun:test';
import {backendClient,WorkerHTTPError} from '../src/http';
import {modelClient} from '../src/model';
test('bearer stays at backend and 401 never retries',async()=>{let calls=0;const token='x'.repeat(43);const client=backendClient('http://127.0.0.1:3001',async(_url,init)=>{calls++;expect(new Headers(init?.headers).get('authorization')).toBe('Bearer '+token);return new Response(null,{status:401});},token);await expect(client('/api/v1/manage/embeddings/runs')).rejects.toBeInstanceOf(WorkerHTTPError);expect(calls).toBe(1);const model=modelClient('http://127.0.0.1:11434',async(_url,init)=>{expect(new Headers(init?.headers).has('authorization')).toBe(false);return Response.json({models:[]});});await model('/api/tags');});
