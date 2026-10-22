import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileHash,writeArchive,inspectArchive,extractVerified} from './archive.mjs';

test('asset archives validate fully before extraction and reject unsafe headers/content',()=>{
  const dir=mkdtempSync(join(tmpdir(),'dorob-archive-'));
  try{
    const source=join(dir,'source'),target=join(dir,'target');
    for(const root of [source,target])for(const kind of ['thumbnails','staging'])mkdirSync(root+'/'+kind,{recursive:true});
    const name='thumbnails/'+'a'.repeat(64)+'.webp';writeFileSync(source+'/'+name,Buffer.from('retained asset bytes'));
    const entries=[{name,size:20,sha256:fileHash(source+'/'+name)}],archive=join(dir,'assets.tar');
    writeArchive(archive,entries,source);const original=readFileSync(archive);
    const locations=inspectArchive(archive,entries);extractVerified(archive,locations,target);
    assert.equal(fileHash(target+'/'+name),entries[0].sha256);
    assert.throws(()=>extractVerified(archive,locations,target));
    function altered(change){const b=Buffer.from(original);change(b);b.fill(32,148,156);const sum=b.subarray(0,512).reduce((a,v)=>a+v,0);b.write(sum.toString(8).padStart(7,'0')+'\0',148,8,'ascii');writeFileSync(archive,b);assert.throws(()=>inspectArchive(archive,entries));}
    for(const path of ['../escape.webp','/absolute.webp','staging/../../escape'])altered(b=>{b.fill(0,0,100);b.write(path,0,'ascii');});
    for(const type of [49,50,53,76,120])altered(b=>{b[156]=type;});
    altered(b=>{b[512]^=1;});
    altered(b=>{b.write('77777777777\0',124,12,'ascii');});
    writeFileSync(archive,original.subarray(0,original.length-512));assert.throws(()=>inspectArchive(archive,entries));
    writeFileSync(archive,original);assert.throws(()=>inspectArchive(archive,[...entries,...entries]));
    assert.throws(()=>inspectArchive(archive,[]));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
