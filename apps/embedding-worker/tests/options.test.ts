import {test,expect} from 'bun:test';
import {parseOptions} from '../src/options';
test('no argument help and invalid scope do no work',()=>{
 expect(parseOptions([],{})).toBeNull();expect(parseOptions(['--help'],{})).toBeNull();
 for(const args of [['generate','--scope','invalid'],['generate','--backend-url','https://example.com'],['generate','--course','bad'],['status'],['generate','--scope','groups','--course','test:1']])expect(()=>parseOptions(args,{})).toThrow();
 expect(parseOptions(['generate','--scope','groups'],{})!.courses).toEqual([]);
 expect(parseOptions(['both'],{})!.groups).toBe('all');
});
test('source CLI without arguments prints help then exits',async()=>{
 const result=Bun.spawn(['bun',new URL('../src/cli.ts',import.meta.url).pathname],{stdout:'pipe',stderr:'pipe'});expect(await result.exited).toBe(0);expect(await new Response(result.stdout).text()).toContain('No arguments/help performs no work');
});
