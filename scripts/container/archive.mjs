import {createHash} from 'node:crypto';
import {closeSync, fstatSync, lstatSync, openSync, readSync, writeSync} from 'node:fs';

export const MAX_BYTES=32*1024**3, MAX_FILES=100000;
export const keyPattern=/^(thumbnails|staging)\/[a-f0-9]{64}\.webp$/;
export function fileHash(path) {
  const fd=openSync(path,'r');const hash=createHash('sha256'),buffer=Buffer.alloc(1024*1024);
  try{if(!fstatSync(fd).isFile())throw Error('Expected a regular archive file.');for(;;){const n=readSync(fd,buffer);if(!n)break;hash.update(buffer.subarray(0,n));}return hash.digest('hex');}
  finally{closeSync(fd);}
}
function exact(fd,length,position) {
  const out=Buffer.alloc(length);let offset=0;
  while(offset<length){const n=readSync(fd,out,offset,length-offset,position+offset);if(!n)throw Error('Truncated asset archive.');offset+=n;}
  return out;
}
function octal(buffer,start,length,value) {buffer.write(value.toString(8).padStart(length-1,'0')+'\0',start,length,'ascii');}
export function writeArchive(path,entries,root) {
  const fd=openSync(path,'wx',0o600);
  try{
    for(const entry of entries) {
      const {name,size,sha256}=entry;
      if(!keyPattern.test(name)||size<1||size>524288)throw Error('Unsafe asset entry.');
      const source=root+'/'+name,st=lstatSync(source);
      if(!st.isFile()||st.isSymbolicLink()||st.size!==size||fileHash(source)!==sha256)throw Error('Source asset changed during export.');
      const header=Buffer.alloc(512);header.write(name,0,100,'ascii');octal(header,100,8,0o600);octal(header,108,8,0);octal(header,116,8,0);octal(header,124,12,size);octal(header,136,12,0);header.fill(32,148,156);header[156]=48;header.write('ustar\0',257,6,'ascii');header.write('00',263,2,'ascii');
      octal(header,148,8,header.reduce((a,b)=>a+b,0));writeSync(fd,header);
      const input=openSync(source,'r');try{writeSync(fd,exact(input,size,0));}finally{closeSync(input);}
      writeSync(fd,Buffer.alloc((512-size%512)%512));
    }
    writeSync(fd,Buffer.alloc(1024));
  }finally{closeSync(fd);}
}
// Validate the complete namespace, sizes, hashes, header checksums and trailer
// before import writes any files. No tar program or root archive extraction.
export function inspectArchive(path,entries) {
  if(entries.length>MAX_FILES)throw Error('Too many asset entries.');
  const expected=new Map(entries.map(e=>[e.name,e]));
  if(expected.size!==entries.length)throw Error('Duplicate manifest asset.');
  const fd=openSync(path,'r'),locations=[];let position=0,total=0;
  try{
    const length=fstatSync(fd).size;if(length>MAX_BYTES||length%512)throw Error('Invalid asset archive size.');
    while(position+1024<=length){
      const h=exact(fd,512,position);position+=512;
      if(h.every(b=>b===0)){
        if(position+512!==length||exact(fd,512,position).some(b=>b!==0)||expected.size)throw Error('Invalid asset archive trailer or missing entries.');
        return locations;
      }
      const field=(start,len)=>h.subarray(start,start+len).toString('ascii').replace(/\0.*$/s,'');
      const number=(start,len)=>{const s=field(start,len).trim();if(!/^[0-7]+$/.test(s))throw Error('Invalid tar number.');return parseInt(s,8);};
      const saved=number(148,8),copy=Buffer.from(h);copy.fill(32,148,156);
      if(copy.reduce((a,b)=>a+b,0)!==saved||field(257,6)!=='ustar'||field(345,155)||![0,48].includes(h[156])||field(157,100))throw Error('Unsupported or unsafe tar header.');
      const name=field(0,100),size=number(124,12),entry=expected.get(name);
      if(!keyPattern.test(name)||!entry||size!==entry.size||size<1||size>524288)throw Error('Unexpected or unsafe asset archive path/size.');
      total+=size;if(total>MAX_BYTES||locations.length>=MAX_FILES||position+Math.ceil(size/512)*512>length)throw Error('Asset archive bounds exceeded.');
      const hash=createHash('sha256').update(exact(fd,size,position)).digest('hex');
      if(hash!==entry.sha256)throw Error('Asset archive content hash mismatch.');
      locations.push({...entry,offset:position});expected.delete(name);position+=Math.ceil(size/512)*512;
    }
    throw Error('Missing asset archive trailer.');
  }finally{closeSync(fd);}
}
export function extractVerified(path,locations,root) {
  const fd=openSync(path,'r');
  try{for(const entry of locations){const out=openSync(root+'/'+entry.name,'wx',0o600);try{writeSync(out,exact(fd,entry.size,entry.offset));}finally{closeSync(out);}}}
  finally{closeSync(fd);}
}
