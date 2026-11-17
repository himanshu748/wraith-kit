import { createHmac, timingSafeEqual } from 'node:crypto';
import { ExecutionError, type ExecuteContext, type Json, type JsonObject, type RawInput } from '@wraith-kit/skeleton/core';
export interface Issue { number:number; title:string; body:string; html_url:string; state:string }
export interface GitHubConfig { repo:string; token?:string; webhookSecret?:string; liveIssues?:boolean; dailyIssueCap?:number; reserveIssueSlot?:(key:string,day:string,limit:number)=>Promise<boolean> }
export function validateRepo(repo:string):void{if(!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(repo))throw new Error('Expected owner/repository');}
export function verifyPush(raw:RawInput,config:GitHubConfig):JsonObject {
  if(!config.webhookSecret)throw new Error('GitHub webhook secret is not configured');
  if(Buffer.byteLength(raw.body)>1_000_000)throw new Error('Webhook body exceeds 1 MB');
  const signature=raw.headers['x-hub-signature-256']??'';
  const expected=`sha256=${createHmac('sha256',config.webhookSecret).update(raw.body).digest('hex')}`;
  if(!/^sha256=[a-f\d]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new Error('Invalid webhook signature');
  if(raw.headers['x-github-event']!=='push')throw new Error('Only GitHub push events are supported');
  if(!raw.headers['x-github-delivery'])throw new Error('Missing GitHub delivery id');
  const data:unknown=JSON.parse(raw.body);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid push payload');
  const obj=data as JsonObject;
  const repo=obj.repository;
  if(!repo||typeof repo!=='object'||Array.isArray(repo)||repo.full_name!==config.repo)throw new Error('Webhook repository does not match configuration');
  return obj;
}
async function github(path:string,config:GitHubConfig,http:typeof fetch,signal:AbortSignal,init:RequestInit={}):Promise<unknown>{
  let response:Response;
  try { response=await http(`https://api.github.com/repos/${config.repo}${path}`,{...init,redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(10_000)]),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'Wraith-Kit',...(config.token?{Authorization:`Bearer ${config.token}`}:{}) ,'Content-Type':'application/json'}}); }
  catch { throw new ExecutionError('GitHub request failed; write outcome may be unknown',true,undefined,init.method==='POST'); }
  if(!response.ok){const after=response.headers.get('retry-after');const delay=after?(/^\d+$/.test(after)?Number(after)*1000:Math.max(0,Date.parse(after)-Date.now())):undefined;throw new ExecutionError(`GitHub HTTP ${response.status}`,response.status===429||response.status>=500,Number.isFinite(delay)?delay:undefined,init.method==='POST'&&response.status>=500);}
  try {
    const reader=response.body?.getReader();let bytes=0;const chunks:Uint8Array[]=[];
    if(reader)while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2_000_000){await reader.cancel();throw new Error('GitHub response exceeds 2 MB');}chunks.push(value);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch { throw new ExecutionError('GitHub response could not be read; write outcome may be unknown',true,undefined,init.method==='POST'); }
}
export async function listIssues(config:GitHubConfig,http:typeof fetch,signal:AbortSignal,state:'open'|'all'='open'):Promise<Issue[]>{
  const all:Issue[]=[];
  for(let page=1;page<=10;page++){
    const data=await github(`/issues?state=${state}&labels=wraith-kit&per_page=100&page=${page}`,config,http,signal);
    if(!Array.isArray(data))throw new Error('Invalid GitHub issues response');
    for(const entry of data){if(!entry||typeof entry!=='object'||'pull_request'in entry)continue;const issue=entry as Record<string,unknown>;if(typeof issue.number!=='number'||typeof issue.title!=='string'||typeof issue.html_url!=='string')throw new Error('Invalid GitHub issue');all.push({number:issue.number,title:issue.title,body:typeof issue.body==='string'?issue.body:'',html_url:issue.html_url,state:String(issue.state??state)});}
    if(data.length<100)return all;
  }throw new Error('Issue lookup exceeded 1000 items; result is incomplete');
}
export async function fetchPatches(payload:JsonObject,config:GitHubConfig,http:typeof fetch,signal:AbortSignal):Promise<{diff:string;incomplete:string[]}>{
  const before=String(payload.before??''),after=String(payload.after??'');
  if(!/^[a-f\d]{40}$/i.test(before)||!/^[a-f\d]{40}$/i.test(after)||/^0+$/.test(before)||/^0+$/.test(after))return {diff:'',incomplete:['New or deleted branch has no supported comparison baseline; scan a local staged diff instead.']};
  const data=await github(`/compare/${before}...${after}?per_page=100&page=1`,config,http,signal);
  if(!data||typeof data!=='object'||!('files'in data)||!Array.isArray(data.files))throw new Error('Invalid GitHub comparison');
  const files=data.files as unknown[];const incomplete:string[]=[];const diffs:string[]=[];
  if(files.length>=300)incomplete.push('Comparison reached GitHub\'s 300-file limit; scan coverage may be incomplete.');
  for(const file of files){if(!file||typeof file!=='object')continue;const f=file as Record<string,unknown>;if(typeof f.filename!=='string')continue;if(typeof f.patch!=='string'){incomplete.push(`${f.filename}: patch unavailable (binary, omitted, or truncated)`);continue;}diffs.push(`diff --git a/${f.filename} b/${f.filename}\n--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`);}
  return {diff:diffs.join('\n'),incomplete};
}
export function issueMarker(key:string):string{return `<!-- wraith-action:${key} -->`;}
export async function lookupIssue(config:GitHubConfig,ctx:ExecuteContext):Promise<Json|undefined>{
  if(!config.token||!config.liveIssues)return undefined;
  const issue=(await listIssues(config,ctx.http,ctx.signal,'all')).find(i=>i.body.includes(issueMarker(ctx.idempotencyKey)));
  return issue?{number:issue.number,url:issue.html_url,recovered:true}:undefined;
}
export async function createIssue(payload:JsonObject,config:GitHubConfig,ctx:ExecuteContext):Promise<Json>{
  if(!config.token||!config.liveIssues)return {dryRun:true,title:String(payload.title),body:String(payload.body),repository:config.repo,message:'Dry run. No GitHub issue was created.'};
  const earlier=await lookupIssue(config,ctx);if(earlier)return earlier;
  if(!config.reserveIssueSlot)throw new ExecutionError('Live issue creation requires a persistent daily quota store',false);
  if(!await config.reserveIssueSlot(ctx.idempotencyKey,ctx.clock.slice(0,10),config.dailyIssueCap??20))throw new ExecutionError('Daily issue cap reached',false);
  const body=String(payload.body)+'\n\n'+issueMarker(ctx.idempotencyKey);
  const data=await github('/issues',config,ctx.http,ctx.signal,{method:'POST',body:JSON.stringify({title:String(payload.title),body,labels:['wraith-kit','todo-afterlife']})});
  if(!data||typeof data!=='object'||!('number'in data)||typeof data.number!=='number'||!('html_url'in data)||typeof data.html_url!=='string')throw new ExecutionError('Issue outcome is unknown; inspect the sandbox before retrying',true,undefined,true);
  return {number:data.number,url:data.html_url,dryRun:false};
}
