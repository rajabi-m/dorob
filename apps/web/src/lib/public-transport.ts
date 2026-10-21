export async function boundedBody(response: Response, maximum: number) {
  const length=response.headers.get('content-length'); if(length !== null && (!/^\d+$/.test(length) || Number(length)>maximum)) { await response.body?.cancel(); throw new Error('Invalid response'); }
  const reader=response.body?.getReader(); if(!reader) throw new Error('Empty response');
  const chunks: Uint8Array[]=[];let size=0;
  try { while(true) { const { value,done }=await reader.read();if(done)break;size+=value.length;if(size>maximum)throw new Error('Response limit');chunks.push(value); } }
  finally { await reader.cancel().catch(()=>{}); }
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}

/** Browser-safe mechanics only: validators and HTTP error policy belong to domains. */
export async function publicJson(path:string,{maximum=2*1024*1024,fetcher=fetch,...init}:RequestInit&{maximum?:number;fetcher?:(path:string,init?:RequestInit)=>Promise<Response>}) {
 const response=await fetcher(path,{cache:'no-store',headers:{accept:'application/json'},...init});
 if(!response.ok){await response.body?.cancel();return {ok:false as const,status:response.status};}
 if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??'')){await response.body?.cancel();throw new Error('Invalid response');}
 return {ok:true as const,value:JSON.parse(new TextDecoder().decode(await boundedBody(response,maximum))) as unknown};
}
