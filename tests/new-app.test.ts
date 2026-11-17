import { describe,expect,it } from 'vitest';
import { mkdtemp,mkdir,readFile,rm,symlink,writeFile } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { scaffold } from '../scripts/new-app.js';
const root=resolve('.');
describe('new app scaffold',()=>{
  it('refuses path traversal and existing apps without changing their files',async()=>{
    await mkdir(join(root,'.scratch'),{recursive:true});const temporary=await mkdtemp(join(root,'.scratch/scaffold-'));
    try{
      for(const name of ['../escape','BadName','x/y','','-leading','a--b'])await expect(scaffold(name,temporary)).rejects.toThrow('kebab-case');
      const destination=await scaffold('study-helper',temporary);await writeFile(join(destination,'keep.txt'),'user work');
      await expect(scaffold('study-helper',temporary)).rejects.toThrow('already exists');expect(await readFile(join(destination,'keep.txt'),'utf8')).toBe('user work');
      const source=await readFile(join(destination,'src/index.ts'),'utf8');expect(source).toContain("id:'study-helper'");expect(source).toContain("from '@wraith-kit/skeleton/core'");expect(source).not.toContain('__APP_ID__');
    }finally{await rm(temporary,{recursive:true,force:true});}
  });
  it('refuses symlinked apps targets',async()=>{
    await mkdir(join(root,'.scratch'),{recursive:true});const temporary=await mkdtemp(join(root,'.scratch/scaffold-symlink-'));
    try{await mkdir(join(temporary,'elsewhere'));await symlink(join(temporary,'elsewhere'),join(temporary,'apps'),'dir');await expect(scaffold('study-helper',temporary)).rejects.toThrow('symlinked');}
    finally{await rm(temporary,{recursive:true,force:true});}
  });
  it('generated local runner serves sign-in, approval and the actual artifact',async()=>{
    await mkdir(join(root,'.scratch'),{recursive:true});const temporary=await mkdtemp(join(root,'.scratch/runner-'));const name='study-helper';const destination=await scaffold(name,temporary);const config=join(destination,'.runtime-config');
    const child=spawn(process.execPath,['--import','tsx',join(destination,'run.ts')],{cwd:root,env:{...process.env,PORT:'0',WRAITH_OPEN_BROWSER:'0',WRAITH_CONFIG_DIR:config,WRAITH_DATA_DIR:join(destination,'.runtime-data')},stdio:['ignore','pipe','pipe']});
    let errors='';child.stderr.on('data',chunk=>{errors+=String(chunk);});
    try{
      await new Promise<void>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error(`Runner startup timed out: ${errors}`)),5000);
        child.once('error',error=>{clearTimeout(timer);reject(error);});
        child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Runner exited ${code}: ${errors}`));});
        child.stdout.on('data',chunk=>{if(String(chunk).includes('Private sign-in link:')){clearTimeout(timer);resolve();}});
      });
      const login=(await readFile(join(config,'login-link.txt'),'utf8')).trim();const origin=new URL(login).origin;
      const auth=await fetch(login,{redirect:'manual'});expect(auth.status).toBe(303);const cookie=auth.headers.get('set-cookie')!.split(';')[0]!;
      const queue=await(await fetch(`${origin}/queue`,{headers:{cookie}})).text();expect(queue).toContain('Study room printer');
      const action=/href="(\/actions\/[a-zA-Z0-9_-]+)"/.exec(queue)?.[1];expect(action).toBeTruthy();
      const detail=await(await fetch(origin+action,{headers:{cookie}})).text();const csrf=/name="csrf" value="([^"]+)"/.exec(detail)?.[1];expect(csrf).toBeTruthy();
      const approved=await fetch(`${origin}${action}/decision`,{method:'POST',redirect:'manual',headers:{cookie,origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:csrf!,decision:'approve'})});expect(approved.status).toBe(303);
      const artifact=await fetch(`${origin}${action}/download`,{headers:{cookie}});expect(artifact.status).toBe(200);expect(await artifact.text()).toContain('Replace the printer paper');
    }finally{if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}await rm(temporary,{recursive:true,force:true});}
  });
  it('generated module runs through shared core with duplicate input and approval',async()=>{
    await mkdir(join(root,'.scratch'),{recursive:true});const temporary=await mkdtemp(join(root,'.scratch/module-'));const name='study-helper';const destination=await scaffold(name,temporary);
    try{
      const script=`import {app,demoEvent} from ${JSON.stringify(join(destination,'src/index.ts'))};
        import {Engine} from '@wraith-kit/skeleton/core';import {MemoryStore} from '@wraith-kit/skeleton/testing';
        const engine=new Engine(app,new MemoryStore(),{auditKey:'test-only'});
        await engine.ingest(demoEvent());await engine.ingest(demoEvent());await engine.tick();
        let state=await engine.snapshot();const actions=Object.values(state.actions);
        if(actions.length!==1||actions[0].status!=='proposed')throw new Error('Approval or dedupe failed');
        await engine.decide(actions[0].id,{type:'approve'},'tester');await engine.tick();state=await engine.snapshot();
        if(state.actions[actions[0].id].status!=='succeeded')throw new Error('Execution failed');
        console.log(JSON.stringify({events:Object.keys(state.events).length,result:state.actions[actions[0].id].result}));`;
      const result=await promisify(execFile)(process.execPath,['--import','tsx','--input-type=module','-e',script],{cwd:root});
      expect(JSON.parse(result.stdout)).toMatchObject({events:1,result:{artifact:{mediaType:'text/plain; charset=utf-8'}}});
      const test=await readFile(join(destination,'test/app.test.ts'),'utf8');expect(test).toContain('fakeClock');expect(test).toContain("status).toBe('proposed')");
    }finally{await rm(temporary,{recursive:true,force:true});}
  });
});
