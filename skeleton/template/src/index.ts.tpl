import { defineApp, hash, type EventInput } from '@wraith-kit/skeleton/core';

export function demoEvent():EventInput {
  return {source:'request',kind:'request',subject:'Study room printer',idempotencyKey:'demo-printer-request',data:{request:'Replace the printer paper before the study group meets.'},demo:true};
}

export const app=defineApp({
  id:'__APP_ID__',
  theme:{name:'__APP_TITLE__',accent:'#a6e7bb',description:'Turn a request into a reviewed local task.'},
  sources:[{
    id:'request',type:'cli',
    accept:raw=>{
      const parsed:unknown=JSON.parse(raw.body);
      if(!parsed||typeof parsed!=='object'||!('request' in parsed)||typeof parsed.request!=='string'||!parsed.request.trim()||parsed.request.length>500)throw new Error('Provide a request between 1 and 500 characters.');
      return {key:hash(parsed.request),payload:{request:parsed.request},demo:true};
    },
    expand:payload=>{
      if(!payload||typeof payload!=='object'||Array.isArray(payload)||typeof payload.request!=='string')throw new Error('Invalid stored request');
      return [{source:'request',kind:'request',subject:'Local request',idempotencyKey:hash(payload),data:payload,demo:true}];
    },
  }],
  rules:[{
    id:'propose-task',priority:10,description:'Create a task preview for the person to review.',
    evaluate:event=>event.kind==='request'?{actions:[{kind:'save-task',target:event.subject,payload:{text:String(event.data.request)},preview:`DEMO local task: ${event.data.request}`}]}:{},
  }],
  actions:{
    'save-task':{
      // Omitting safety means approval is required. No network or model is used.
      describe:payload=>`Save this local task: ${payload.text}`,
      execute:(payload,ctx)=>({artifact:{path:`/tasks/${ctx.idempotencyKey}.txt`,content:`DEMO task\n${payload.text}\n`,mediaType:'text/plain; charset=utf-8'}}),
    },
  },
});
