import {test,expect} from 'bun:test';
import {generateInput,installedConfiguration,type ModelTransport} from '../src/model';
import {buildInput} from '@dorob/embedding-engine';
const input=buildInput('group',{id:'g1',title:'پایتون',description:'آموزش برنامه‌نویسی برای مبتدیان',categoryId:'code',categoryLabel:'برنامه‌نویسی',targetLevel:null,members:[]});
const fake=(digest='a'.repeat(64),dimensions=1024):ModelTransport=>async(path,body)=>path==='/api/tags'?{models:[{name:'bge-m3:567m',digest}]}:path==='/api/show'?{model_info:{'bert.embedding_length':dimensions}}:{model:'bge-m3:567m',embeddings:(body as {input:string[]}).input.map(()=>Array.from({length:1024},(_,i)=>i===0?1:0))};
test('installed artifact verification and no truncation/fallback',async()=>{
 const cfg=await installedConfiguration(fake(),'bge-m3:567m');let batches=0;
 const transport:ModelTransport=async(path,body,signal)=>{if(path==='/api/embed'){expect((body as {truncate:boolean}).truncate).toBe(false);expect((body as {input:string[]}).input.length).toBeLessThanOrEqual(4);batches++;}return fake()(path,body,signal);};
 expect((await generateInput(input,cfg,transport)).values[0]).toBe(1);expect(batches).toBe(1);
 await expect(installedConfiguration(fake(),'bge-m3:missing')).rejects.toThrow('installed');
 await expect(installedConfiguration(fake('a'.repeat(64),3),'bge-m3:567m')).rejects.toThrow('1024');
 await expect(generateInput(input,cfg,fake('b'.repeat(64)))).rejects.toThrow('changed');
 const bad:ModelTransport=async(path,body,signal)=>path==='/api/embed'?{model:cfg.model,embeddings:[Array(1024).fill(0)]}:fake()(path,body,signal);
 await expect(generateInput(input,cfg,bad)).rejects.toThrow('Zero');
 const abort=new AbortController();abort.abort();await expect(generateInput(input,cfg,fake(),abort.signal)).rejects.toThrow();
});
test('digest change after inference and long input batching reject before acceptance',async()=>{
 const cfg=await installedConfiguration(fake(),'bge-m3:567m');let changed=false;
 const transport:ModelTransport=async(path,body,signal)=>{if(path==='/api/embed'){changed=true;return fake()(path,body,signal);}return fake(changed?'b'.repeat(64):'a'.repeat(64))(path,body,signal);};
 await expect(generateInput(input,cfg,transport)).rejects.toThrow('changed during');
});
