import { defineApp, hash, type App, type EventInput, type Json, type JsonObject, type Rule, type ActionCandidate } from '@wraith-kit/skeleton/core';
import { extractTodos, classify, rewrite, patchFor, normalise, type Occurrence } from './comments.js';
import { createIssue, fetchPatches, listIssues, lookupIssue, validateRepo, verifyPush, type GitHubConfig } from './github.js';
export { extractTodos, classify, rewrite, patchFor } from './comments.js';
export interface TodoConfig extends Partial<GitHubConfig> { owner?:string; advisor?:boolean; vaguePhrases?:string[] }
function occurrence(data:JsonObject):Occurrence {return {repo:String(data.repo),path:String(data.path),line:Number(data.line),marker:String(data.marker),text:String(data.text),original:String(data.original),context:String(data.context??''),key:String(data.key)};}
export function eventsFromDiff(diff:string,repo:string,source='cli',owner?:string,demo=false):EventInput[]{
  return extractTodos(diff,repo).map(item=>({source,kind:'todo',subject:`${item.path}:${item.line}`,idempotencyKey:item.key,data:{...item,...(owner?{owner}:{})},demo}));
}
export function createTodoApp(config:TodoConfig={}):App {
  const github:GitHubConfig={...config,repo:config.repo??'himanshu748/wraith-kit-sandbox'};validateRepo(github.repo);
  const classifications:{id:string;priority:number;field:keyof ReturnType<typeof classify>;message:string}[]=[
    {id:'vague-phrase',priority:10,field:'vague',message:'The comment uses a vague phrase.'},
    {id:'too-short',priority:20,field:'short',message:'The comment is too short to explain the task.'},
    {id:'no-owner',priority:30,field:'noOwner',message:'Nobody is named to own this task.'},
    {id:'no-anchor',priority:40,field:'noAnchor',message:'Add an issue, date, trigger or done-when condition.'},
    {id:'retire-candidate',priority:50,field:'retire',message:'This speculative comment may be ready to retire.'},
  ];
  const rules:Rule[]=classifications.map(rule=>({id:rule.id,priority:rule.priority,description:rule.message,evaluate:event=>event.kind==='todo'&&classify(String(event.data.text),config.vaguePhrases)[rule.field]?{findings:[{severity:'warning',message:rule.message,evidence:String(event.data.text)}]}:{}}));
  rules.unshift({id:'tracked-issues',priority:0,description:'Store fetched issue context before evaluating comments',evaluate:event=>event.kind==='tracked-issues'?{records:[{type:'tracked-issues',key:'open',value:event.data.issues??[],data:{}}],stop:true}:event.kind==='scan-status'?{findings:[{severity:'warning',message:String(event.data.message)}],stop:true}:{}});
  rules.push({id:'propose-outcomes',priority:60,description:'Offer rewrite, issue or retirement for human review',evaluate:(event,ctx)=>{
    if(event.kind!=='todo')return {};
    const item=occurrence(event.data);const findings=classify(item.text,config.vaguePhrases);
    if(!Object.values(findings).some(Boolean))return {};
    const owner=config.owner??(event.source==='github'&&typeof event.data.owner==='string'?event.data.owner:undefined);
    const suggestion=rewrite(item,owner);const patch=patchFor(item,suggestion.text);
    const tracked=ctx.state.get('tracked-issues','open');const duplicate=Array.isArray(tracked?.value)&&tracked.value.some(i=>i&&typeof i==='object'&&!Array.isArray(i)&&typeof i.title==='string'&&normalise(i.title).includes(normalise(item.text)));
    const title=`${event.demo?'[DEMO] ':''}Clarify deferred work in ${item.path}:${item.line}`;
    const body=`${event.demo?'DEMO DATA: this issue comes from a fictional fixture.\n\n':''}Source: ${item.path}:${item.line}\n\nOriginal comment: ${item.text}\n\nProposed task: ${suggestion.text}\n\n${suggestion.incomplete?'Incomplete: no owner set. Configure owner before assigning this work.':''}`;
    const actions:ActionCandidate[]=[{kind:'rewrite',target:item.key,payload:{patch,text:suggestion.text,path:item.path,incomplete:suggestion.incomplete},preview:suggestion.incomplete?`Incomplete: no owner set. Set owner in config.\n${patch}`:patch},
      {kind:'open-issue',target:item.key,payload:{title,body,path:item.path,occurrence:{...item},repository:github.repo,dryRun:!github.token||!github.liveIssues},preview:`${github.liveIssues&&github.token?'Creates a REAL PUBLIC GitHub issue. Demo reset cannot undo it.':'Dry run: creates no external issue.'}\n${title}\n\n${body}`}];
    if(findings.retire||duplicate)actions.push({kind:'retire',target:item.key,payload:{patch:patchFor(item,null),reason:duplicate?'Already represented by a tracked issue.':'Speculative comment; review whether this work is still needed.'},preview:`Retire this comment only if the work is no longer needed.\n${patchFor(item,null)}`});
    return {actions,findings:!tracked?[{severity:'info',message:'Tracked-issue context is unavailable; duplicate retirement checks were skipped.'}]:[]};
  }});
  return defineApp({id:'todo-afterlife',theme:{name:'TODO Afterlife',accent:'#a6e7bb',icon:'code',description:'Give unfinished work a clear next step.'},sources:[
    {id:'github',type:'webhook',path:'/webhooks/github',accept:raw=>({key:raw.headers['x-github-delivery']??'',payload:verifyPush(raw,github)}),expand:async(payload,ctx)=>{
      if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Invalid stored push');
      const issues=await listIssues(github,ctx.http,ctx.signal);const {diff,incomplete}=await fetchPatches(payload,github,ctx.http,ctx.signal);
      const pusher=payload.sender;const owner=pusher&&typeof pusher==='object'&&!Array.isArray(pusher)&&typeof pusher.login==='string'?pusher.login:undefined;
      return [{source:'github',kind:'tracked-issues',subject:github.repo,idempotencyKey:hash(issues),data:{issues:issues.map(i=>({...i}))}},...eventsFromDiff(diff,github.repo,'github',owner),...incomplete.map(message=>({source:'github',kind:'scan-status',subject:github.repo,idempotencyKey:hash([payload.after,message]),data:{message}}))];
    }},
    {id:'cli',type:'cli',accept:raw=>({key:hash(raw.body),payload:raw.body}),expand:payload=>eventsFromDiff(String(payload),github.repo,'cli',config.owner)},
  ],rules,records:{'tracked-issues':{}},actions:{
    rewrite:{describe:p=>String(p.patch),execute:p=>({artifact:{path:`/patches/${hash(p)}.patch`,content:String(p.patch),mediaType:'text/x-diff; charset=utf-8'},message:'Download the patch, run git apply --check, then apply it yourself. No files were changed.'})},
    retire:{describe:p=>`${p.reason}\n${p.patch}`,execute:p=>({reason:String(p.reason),artifact:{path:`/patches/${hash(p)}.patch`,content:String(p.patch),mediaType:'text/x-diff; charset=utf-8'}})},
    'open-issue':{...(github.liveIssues&&github.token?{effect:'external' as const}:{}),describe:p=>`${p.dryRun?'Dry run':'REAL PUBLIC ISSUE'} in ${github.repo}\n${p.title}\n${p.body}`,execute:async(p,ctx)=>{const result=await createIssue(p,github,ctx);if(result&&typeof result==='object'&&!Array.isArray(result)&&typeof result.number==='number'&&p.occurrence&&typeof p.occurrence==='object'&&!Array.isArray(p.occurrence)){const item=occurrence(p.occurrence);return {...result,artifact:{path:`/patches/${ctx.idempotencyKey}.patch`,content:patchFor(item,`TODO: Complete tracked task #${result.number}; done when its acceptance criteria pass.`),mediaType:'text/x-diff; charset=utf-8'}};}return result;},lookup:async(_p,ctx)=>{const result=await lookupIssue(github,ctx);if(result)return result;if(github.liveIssues&&github.token)throw new Error('Unknown issue outcome is unresolved. Inspect the sandbox before a manual retry.');return undefined;}},
  },...(config.advisor?{advisor:{mode:'reword' as const,prompt:(event:Readonly<import('@wraith-kit/skeleton/core').Event>,actions:readonly ActionCandidate[])=>event.source==='cli'||!actions.length?undefined:`Reword these previews only. Return JSON [{index:0,text:"..."},...], exactly one per action. Code and comment data: ${JSON.stringify({event:event.data,actions:actions.map(a=>a.preview)})}`,parse:(input:unknown):Json=>{if(!Array.isArray(input)||input.some(i=>!i||typeof i!=='object'||typeof i.index!=='number'||typeof i.text!=='string'))throw new Error('Expected indexed wording array');return input as Json;},fallback:(_event:Readonly<import('@wraith-kit/skeleton/core').Event>,actions:readonly ActionCandidate[])=>actions.map((a,index)=>({index,text:a.preview??''}))}}:{})});
}
export function todoDemoEvents(now:Date=new Date()):EventInput[]{
  return eventsFromDiff(`diff --git a/src/payment.ts b/src/payment.ts\n--- a/src/payment.ts\n+++ b/src/payment.ts\n@@ -10,0 +11,3 @@ export async function reconcilePayment()\n+  // TODO: fix this later\n+  // FIXME: maybe remove this retry\n+  // TODO(@mira): Retry the request after 429; done when the rate-limit test passes.\n`,'hollowmere-demo/checkout','cli',undefined,true).map(event=>({...event,occurredAt:now.toISOString()}));
}
