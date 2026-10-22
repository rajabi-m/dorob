import {isUuid,validCourseId} from '@dorob/core';
import {localOrigin} from './http';
export interface Options {
 command:string;id?:string;backend:string;ollama:string;model:string;configurationId?:string;
 requestId:string;courses:'all'|string[];groups:'all'|string[];force:boolean;allowPartial:boolean;json:boolean;
 title?:string;slug?:string;description?:string;category?:string;level?:string;version?:number;decision?:string;note?:string;acceptPartial:boolean;
}
export const help=`Finite catalog embedding worker

worker:embeddings <generate|match|discover|both> [--scope courses|groups|all]
  [--course ID ...] [--group UUID ...] [--force] [--allow-partial]
  [--model bge-m3:567m | --configuration-id HASH] [--request-id UUID]
worker:embeddings <status|cancel|retry|resume> OPERATION_UUID
worker:embeddings inspect CANDIDATE_UUID
worker:embeddings review CANDIDATE_UUID --version N --decision approved|dismissed|pending
  [--title TEXT] [--note TEXT] [--accept-partial]
worker:embeddings promote CANDIDATE_UUID --version N --title TEXT --slug ASCII
  --description TEXT --category code|design|data|business|language|tools [--level LEVEL]
worker:embeddings promotion-retry PROMOTION_UUID
worker:embeddings accept-partial RUN_UUID

Common: --backend-url LOOPBACK_ORIGIN --ollama-origin LOOPBACK_ORIGIN --json
No arguments/help performs no work. Selected commands run then exit.
Defaults: whole eligible course/group scope, installed bge-m3:567m, API :3001,
Ollama :11434. No downloads, fallback, scheduler or automatic memberships.
Exit: 0 complete/control success; 1 failure; 2 invalid arguments; 130 cancelled.`;
export function parseOptions(args:string[],env:Record<string,string|undefined>=process.env):Options|null {
 if(args[0]==='--')args=args.slice(1);
 if(!args.length||args.includes('--help')||args[0]==='help')return null;
 const commands=['generate','match','discover','both','status','cancel','retry','resume','promote','promotion-retry','review','inspect','accept-partial'];
 const command=args.shift()!;if(!commands.includes(command))throw Error('Unknown command');
 const options:Options={command,backend:env.DOROB_BACKEND_URL??'http://127.0.0.1:3001',ollama:env.DOROB_OLLAMA_ORIGIN??'http://127.0.0.1:11434',model:'bge-m3:567m',requestId:crypto.randomUUID(),courses:'all',groups:'all',force:false,allowPartial:false,json:false,acceptPartial:false};
 const courses:string[]=[],groups:string[]=[];let scope='all';const seen=new Set<string>();
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(!flag.startsWith('--')){if(options.id)throw Error('Unexpected positional argument');options.id=flag;continue;}
  if(!['--course','--group'].includes(flag)){if(seen.has(flag))throw Error('Duplicate option');seen.add(flag);}
  if(['--force','--allow-partial','--json','--accept-partial'].includes(flag)){if(flag==='--force')options.force=true;if(flag==='--allow-partial')options.allowPartial=true;if(flag==='--json')options.json=true;if(flag==='--accept-partial')options.acceptPartial=true;continue;}
  const value=args[++i];if(value===undefined||value.startsWith('--'))throw Error('Missing option value');
  const keys:Record<string,keyof Options>={'--backend-url':'backend','--ollama-origin':'ollama','--model':'model','--configuration-id':'configurationId','--request-id':'requestId','--title':'title','--slug':'slug','--description':'description','--category':'category','--level':'level','--decision':'decision','--note':'note'};
  if(flag==='--course')courses.push(value);else if(flag==='--group')groups.push(value);else if(flag==='--scope')scope=value;else if(flag==='--version'){if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))throw Error('Invalid review version');options.version=Number(value);}else if(keys[flag])Object.assign(options,{[keys[flag]]:value});else throw Error('Unknown option');
 }
 localOrigin(options.backend);localOrigin(options.ollama);
 if(!isUuid(options.requestId)||options.id&&!isUuid(options.id))throw Error('Invalid request/operation identity');
 if(options.configurationId&&!/^[a-f0-9]{64}$/.test(options.configurationId))throw Error('Invalid configuration identity');
 if(!['all','courses','groups'].includes(scope)||courses.length>10000||groups.length>100||courses.some(id=>!validCourseId(id))||groups.some(id=>!isUuid(id))||new Set(courses).size!==courses.length||new Set(groups).size!==groups.length)throw Error('Invalid or oversized selection');
 if(scope==='courses'&&groups.length||scope==='groups'&&courses.length)throw Error('Scope conflicts with selected IDs');
 options.courses=scope==='groups'?[]:courses.length?courses:'all';options.groups=scope==='courses'?[]:groups.length?groups:'all';
 const compute=['generate','match','discover','both'].includes(command);
 if(compute&&options.id||!compute&&!options.id)throw Error('Operation identity is required only for control/recovery commands');
 if(['review','promote'].includes(command)&&options.version===undefined)throw Error('Expected review version is required');
 if(command==='review'&&!['approved','dismissed','pending'].includes(options.decision??''))throw Error('Select a review decision');
 if(command==='promote'&&![options.title,options.slug,options.description,options.category].every(Boolean))throw Error('Owner group fields are required for promotion');
 return options;
}
