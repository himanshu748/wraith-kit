import {it,expect} from 'vitest';
import {Engine,defineApp} from '../src/core/index.js';
import {MemoryStore} from '../src/testing/index.js';
import {lambdaHandler} from '../src/aws/index.js';
it('Function URL adapter preserves secure cookies, awaits accepted scheduling and enforces cap before loading',async()=>{
 const store=new MemoryStore();let scheduled=false;let permitted=true;let loads=0;
 const app=defineApp({id:'cloud-contract',sources:[{id:'in',type:'webhook',path:'/in',accept:r=>({key:r.body,payload:{value:r.body}})}],rules:[{id:'observe',priority:1,description:'Observe only',evaluate:()=>({})}],actions:{noop:{describe:()=> 'No operation',execute:()=>({ok:true})}}});
 const engine=new Engine(app,store,{auditKey:'audit-test'});
 const handle=lambdaHandler(async()=>{loads++;return {app,engine,store,sessionKey:'session-test',publicDemo:true,afterAccept:async()=>{scheduled=true;}};},async()=>permitted);
 const requestContext={domainName:'demo.lambda-url.us-east-1.on.aws',http:{method:'GET'}};
 const home=await handle({rawPath:'/',requestContext});expect(home).toHaveProperty('statusCode',200);
 if('cookies' in home)expect(home.cookies?.[0]).toContain('Secure');
 const accepted=await handle({rawPath:'/in',requestContext:{...requestContext,http:{method:'POST'}},body:Buffer.from('test').toString('base64'),isBase64Encoded:true});expect(accepted).toHaveProperty('statusCode',202);expect(scheduled).toBe(true);expect(Object.values((await store.read()).deliveries)).toHaveLength(1);
 permitted=false;expect(await handle({rawPath:'/',requestContext})).toHaveProperty('statusCode',429);expect(loads).toBe(1);
 expect(await handle({task:'tick'})).toHaveProperty('executed');
});
