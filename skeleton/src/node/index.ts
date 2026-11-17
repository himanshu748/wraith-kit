// WRAITH-SKELETON
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { createHttpHandler, artifacts, type HttpOptions } from './http.js';
export { FileStore } from './store.js';
export { privateSecret } from './secrets.js';
export { reserveQuota } from './quotas.js';
export { createHttpHandler, artifacts } from './http.js';
export interface LocalOptions extends HttpOptions { port?:number; openBrowser?:boolean; dataDir:string; configDir?:string; tickMs?:number }
export async function startLocalServer(options: LocalOptions) {
  const loginToken=randomBytes(32).toString('hex');
  const handler=createHttpHandler({...options,loginToken,afterAccept:()=>{void tick().catch(()=>{process.stderr.write('Delivery is stored; scheduled tick will retry.\n');});}});
  let running:Promise<void>|undefined;
  const tick=():Promise<void>=>running??(running=(async()=>{
    await options.engine.tick();
    await mkdir(join(options.dataDir,'out'),{recursive:true});
    for(const [name,file] of artifacts(Object.values((await options.engine.snapshot()).actions))){const path=join(options.dataDir,'out',name.slice(1));await mkdir(dirname(path),{recursive:true});await writeFile(path,file.content);}
  })().finally(()=>{running=undefined;}));
  const server=createServer(async(req,res)=>{
    const address=server.address();const port=typeof address==='object'?address?.port:options.port;
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host??'')){res.writeHead(403);res.end('Untrusted host');return;}
    try{
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>262144){res.writeHead(413);res.end('Request too large');return;}chunks.push(Buffer.from(chunk));}
      const headers=new Headers();for(const [k,v]of Object.entries(req.headers)){if(v)headers.set(k,Array.isArray(v)?v.join(','):v);}
      const method=req.method??'GET';
      const response=await handler(new Request(`http://127.0.0.1:${port}${req.url??'/'}`,{method,headers,...(method!=='GET'&&method!=='HEAD'?{body:Buffer.concat(chunks).toString('utf8')}:{})}));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch{if(!res.headersSent)res.writeHead(500);res.end('Request failed; no success was recorded.');}
  });
  server.requestTimeout=15_000;server.headersTimeout=10_000;
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(options.port??0,'127.0.0.1',resolve);});
  const address=server.address();if(!address||typeof address==='string')throw new Error('No server address');
  const origin=`http://127.0.0.1:${address.port}`;
  const config=options.configDir??join(homedir(),'.config','wraith-kit',options.app.id);
  const loginFile=join(config,'login-link.txt');await mkdir(dirname(loginFile),{recursive:true,mode:0o700});
  await writeFile(loginFile,`${origin}/auth?token=${loginToken}\n`,{mode:0o600});
  if(options.openBrowser!==false){const command=process.platform==='darwin'?'open':process.platform==='win32'?'explorer':'xdg-open';const child=spawn(command,[`${origin}/auth?token=${loginToken}`],{stdio:'ignore'});child.on('error',()=>{process.stdout.write(`Sign-in link file: ${loginFile}\n`);});child.unref();}
  const timer=setInterval(()=>{void tick().catch(()=>{process.stderr.write('Background tick failed; pending work remains stored.\n');});},options.tickMs??5000);timer.unref();
  return {origin,loginFile,tick,close:async()=>{clearInterval(timer);await running?.catch(()=>{});server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}};
}
