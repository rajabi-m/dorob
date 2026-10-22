import {test,expect} from 'bun:test';
import {isolatedDatabase} from './helpers';
import {migrate,readMigrations} from '../src/migrations';
import {createApp} from '../src/app';
test.skipIf(process.env.API_INTEGRATION!=='1')('protected HTTP curation preserves isolated persisted data and replay',async()=>{await isolatedDatabase(async sql=>{
 await migrate(sql,await readMigrations());const auth={dev:false,token:'z'.repeat(43),generation:'2'.repeat(32)};
 const database={sql,ready:async()=>true,close:async()=>{}};let app=createApp(database,undefined,{auth});
 const call=(path:string,method='GET',body?:unknown,token=auth.token)=>app.handle(new Request('http://localhost'+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
 const path='/api/v1/manage/groups',body={title:'گروه آزمایش',slug:'auth-isolated',description:'گروه آزمایش ورود',categoryId:'code',targetLevel:null};
 expect((await call(path,'POST',body,'wrong')).status).toBe(401);expect((await call(path)).status).toBe(200);
 const created=await call(path,'POST',body);expect(created.status).toBe(201);const group=await created.json();
 app=createApp(database,undefined,{auth});expect((await call(path+'/'+group.id)).status).toBe(200);
 expect((await call(path,'POST',body)).status).toBe(409);expect((await (await call(path)).json()).total).toBe(1);
});});
