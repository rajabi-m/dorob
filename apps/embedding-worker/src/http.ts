export type FetchTransport=(url:string,init?:RequestInit)=>Promise<Response>;
export class WorkerHTTPError extends Error {constructor(public status:number){super(status===401?"Admin token rejected; set DOROB_ADMIN_TOKEN and resume the existing operation.":`Backend request failed (${status}); inspect status before explicit retry`);}}
export function localOrigin(value:string) {const url=new URL(value);if(url.origin!==value||!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Use a credential-free loopback origin');return value;}
export async function boundedJSON(response:Response,limit=8*1024*1024):Promise<unknown> {
 if(Number(response.headers.get('content-length')??0)>limit)throw Error('Response exceeds byte limit');
 const reader=response.body?.getReader();if(!reader)throw Error('Missing response body');let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>limit){await reader.cancel();throw Error('Response exceeds byte limit');}chunks.push(item.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export type BackendClient=<T>(path:string,body?:unknown,signal?:AbortSignal,timeout?:number)=>Promise<T>;
export function backendClient(origin:string,fetcher:FetchTransport=fetch,token=process.env.DOROB_ADMIN_TOKEN):BackendClient {
 localOrigin(origin);
 return async<T>(path:string,body?:unknown,signal?:AbortSignal,timeout=5000):Promise<T>=>{
  if(!path.startsWith('/api/v1/manage/embeddings/'))throw Error('Unsupported backend path');
  for(let attempt=0;;attempt++){
   try{const response=await fetcher(origin+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(timeout),...(signal?[signal]:[])])});if(!response.ok)throw new WorkerHTTPError(response.status);return await boundedJSON(response) as T;}
   catch(error){
    signal?.throwIfAborted();
    if(error instanceof WorkerHTTPError){if(attempt>=1||error.status!==503)throw error;continue;}
    if(attempt<1)continue;
    if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))throw Error(`Dorob backend at ${origin} did not respond within ${timeout/1000} seconds. Check the API terminal and database health before retrying. If an operation ID was printed, inspect it with: worker:embeddings status OPERATION_UUID.`);
    if(error instanceof SyntaxError||error instanceof Error&&['Response exceeds byte limit','Missing response body'].includes(error.message))throw Error(`Dorob backend at ${origin} returned an invalid or oversized response. Check the API terminal and confirm its version matches this worker.`);
    throw Error(`Cannot connect to the Dorob backend at ${origin}. Start the app from the project folder with: ./run.sh. For a different API address, use --backend-url. If an operation ID was printed, inspect its status before retrying.`);
   }
  }
 };
}
