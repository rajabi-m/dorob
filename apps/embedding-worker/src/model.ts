import {isEmbeddingConfiguration,type EmbeddingConfiguration,type EmbeddingInput} from '@dorob/core';
import {hash,poolChunks,normalizeVector,float32Vector} from '@dorob/embedding-engine';
import {boundedJSON,localOrigin,type FetchTransport} from './http';
export type ModelTransport=(path:string,body?:unknown,signal?:AbortSignal)=>Promise<unknown>;
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid local model response');return v as Record<string,unknown>;};
export function modelClient(origin='http://127.0.0.1:11434',fetcher:FetchTransport=fetch):ModelTransport {localOrigin(origin);return async(path,body,signal)=>{
 if(!['/api/tags','/api/show','/api/embed'].includes(path))throw Error('Unsupported model operation');
 const requestSignal=AbortSignal.any([AbortSignal.timeout(60000),...(signal?[signal]:[])]);
 let response:Response;
 try{response=await fetcher(origin+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:requestSignal});}
 catch(error){signal?.throwIfAborted();if(requestSignal.aborted||error instanceof Error&&error.name==='TimeoutError')throw Error(`Ollama at ${origin} did not respond within 60 seconds. Check that Ollama is running and the model can fit in memory, then retry.`);throw Error(`Cannot connect to Ollama at ${origin}. Start it in another terminal with: ollama serve. Keep that terminal open, then rerun this command. For a different address, use --ollama-origin.`);}
 if(!response.ok)throw Error(`Ollama at ${origin} returned HTTP ${response.status} for ${path}. Check its terminal output and the installed model with: ollama list. No download or fallback attempted`);
 try{return await boundedJSON(response,4*1024*1024);}catch(error){signal?.throwIfAborted();if(requestSignal.aborted)throw Error(`Ollama at ${origin} timed out while returning a response (60 seconds). Check its terminal output, then retry.`);throw Error(`Ollama at ${origin} returned an invalid or oversized response for ${path}. Check its terminal output.`,{cause:error});}
 };}

export async function installedConfiguration(transport:ModelTransport,model:string,signal?:AbortSignal):Promise<EmbeddingConfiguration> {
 if(!/^bge-m3(?::[a-zA-Z0-9._-]+)?$/.test(model))throw Error('Select an installed BGE-M3 model');
 const tags=object(await transport('/api/tags',undefined,signal));if(!Array.isArray(tags.models)||tags.models.length>100)throw Error('Invalid installed model inventory');
 const found=tags.models.map(object).find(m=>m.name===model);if(!found)throw Error(`Ollama model ${model} is not installed. Check available models with: ollama list. Select an installed BGE-M3 model with --model. No download attempted`);
 const details=object(await transport('/api/show',{model},signal)),info=object(details.model_info);
 if(Object.entries(info).find(([key])=>key.endsWith('.embedding_length'))?.[1]!==1024)throw Error('Expected 1024-dimensional BGE-M3');
 const identity={model,digest:found.digest,dimensions:1024 as const,profile:'educational-v1:utf8-65536:chunks-4096:byte-pool-l2:nfc-fa' as const};
 const cfg={...identity,id:hash(identity)};if(!isEmbeddingConfiguration(cfg))throw Error('Invalid installed model identity');return cfg;
}
export async function generateInput(input:EmbeddingInput,cfg:EmbeddingConfiguration,transport:ModelTransport,signal?:AbortSignal) {
 if(!input.eligible||!input.chunks.length)throw Error('Cannot embed an ineligible input');
 const vectors:number[][]=[];
 for(let offset=0;offset<input.chunks.length;offset+=4){
  signal?.throwIfAborted();if((await installedConfiguration(transport,cfg.model,signal)).id!==cfg.id)throw Error('Installed model digest changed');
  const chunks=input.chunks.slice(offset,offset+4),response=object(await transport('/api/embed',{model:cfg.model,input:chunks,truncate:false},signal));
  if(response.model!==cfg.model||!Array.isArray(response.embeddings)||response.embeddings.length!==chunks.length)throw Error('Invalid embedding model or output count');
  if((await installedConfiguration(transport,cfg.model,signal)).id!==cfg.id)throw Error('Installed model digest changed during inference');
  for(const raw of response.embeddings){if(!Array.isArray(raw)||raw.some(x=>typeof x!=='number'))throw Error('Invalid vector output');vectors.push(normalizeVector(raw,1024));}
 }
 return float32Vector(poolChunks(input,vectors,1024));
}
