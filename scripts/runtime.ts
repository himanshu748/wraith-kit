import { resolve, join } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { createTodoApp, todoDemoEvents } from '../apps/todo-afterlife/src/index.js';
import { createNoticeApp, noticeDemoEvents, noticeDemoSite, type NoticeConfig } from '../apps/notice-ghoul/src/index.js';
import { Engine, type Store } from '@wraith-kit/skeleton/core';
import { FileStore, privateSecret, reserveQuota } from '@wraith-kit/skeleton/node';
import { createAdvisor } from '@wraith-kit/skeleton/llm';
import { z } from 'zod';
export const appId=(value:string|undefined)=>{if(value!=='todo-afterlife'&&value!=='notice-ghoul')throw new Error('Choose todo-afterlife or notice-ghoul');return value;};
const sourceSchema=z.array(z.object({id:z.string().min(1),url:z.url(),format:z.enum(['html','rss','atom']),timezone:z.string().optional(),dateOrder:z.enum(['DMY','MDY']).optional(),intervalMs:z.number().min(60_000).optional(),demo:z.boolean().optional(),selectors:z.object({item:z.string(),title:z.string(),link:z.string(),date:z.string().optional(),body:z.string().optional()}).optional()}));
export async function createRuntime(id:string, settings:{store?:Store;auditKey?:string;sessionKey?:string;hosted?:boolean;dataDir?:string;configDir?:string;demo?:boolean}={}){
  appId(id);const dataDir=settings.dataDir??process.env.WRAITH_DATA_DIR??resolve('.wraith',id);const store=settings.store??new FileStore(dataDir);
  settings.configDir ??= process.env.WRAITH_CONFIG_DIR;
  const auditKey=settings.auditKey??(await privateSecret(`${id}-audit`,settings.configDir)).value;
  const sessionKey=settings.sessionKey??(await privateSecret(`${id}-sessions`,settings.configDir)).value;
  const webhookSecret=process.env.WRAITH_WEBHOOK_SECRET??(settings.hosted?undefined:(await privateSecret(`${id}-webhook`,settings.configDir)).value);
  let sources:NoticeConfig['sources']=[];
  if(process.env.WRAITH_NOTICE_CONFIG){const input=JSON.parse(await readFile(process.env.WRAITH_NOTICE_CONFIG,'utf8')) as unknown;sources=sourceSchema.parse(Array.isArray(input)?input:(input as {sources:unknown}).sources);}
  const demo=settings.demo??!process.env.WRAITH_NOTICE_CONFIG;
  const app=id==='todo-afterlife'?createTodoApp({owner:process.env.WRAITH_OWNER,repo:process.env.WRAITH_GITHUB_REPO??'himanshu748/wraith-kit-sandbox',token:process.env.WRAITH_GITHUB_TOKEN,webhookSecret,liveIssues:process.env.WRAITH_LIVE_ISSUES==='1',advisor:true,reserveIssueSlot:(key,day,limit)=>reserveQuota(store,'issues',key,day,limit)}):createNoticeApp({sources,demo,advisor:true});
  const advisor=createAdvisor({provider:process.env.WRAITH_LLM_PROVIDER??'none',baseUrl:process.env.WRAITH_LLM_BASE_URL,model:process.env.WRAITH_LLM_MODEL,key:process.env.WRAITH_LLM_KEY,hosted:settings.hosted,localModelConfirmed:process.env.WRAITH_OLLAMA_LOCAL_CONFIRMED==='1',reserve:(key,day)=>reserveQuota(store,'llm',key,day,40)});
  const engine=new Engine(app,store,{auditKey,advisor});
  const demoEvents=()=>id==='todo-afterlife'?todoDemoEvents(new Date()):noticeDemoEvents(new Date());
  return {app,store,engine,advisor,sessionKey,dataDir,webhookSecret,demoEvents,demo,configDir:settings.configDir};
}
export async function fixtures(id:string){
  const result:Record<string,{content:string;type:string}>={};if(id!=='notice-ghoul')return result;
  const path=resolve('apps/notice-ghoul/fixtures/site');
  try{for(const file of await readdir(path)){if(!/\.(html|xml|txt)$/.test(file))continue;result[`/fixtures/${file}`]={content:await readFile(join(path,file),'utf8'),type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.xml')?'application/xml':'text/plain'};}}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  return {...result,...noticeDemoSite(new Date())};
}
