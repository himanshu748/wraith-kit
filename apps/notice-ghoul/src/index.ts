import { defineApp, hash, html, type App, type Event, type EventInput, type Json, type JsonObject, type RecordUpsert } from '@wraith-kit/skeleton/core';
import { parseDates, parseDateEdit, type DateContext, type ParsedDeadline } from './dates.js';
import { eligible, renderCalendar, renderDigest } from './outputs.js';
import { noticeEvent, pollNotices, type NoticeSource } from './sources.js';

export { parseDates, parseDateEdit } from './dates.js';
export { eligible, renderCalendar, renderDigest } from './outputs.js';
export { noticeEvent, parseNotices, pollNotices } from './sources.js';
export interface NoticeConfig { sources?:NoticeSource[]; demo?:boolean; advisor?:boolean }
const normalTitle=(title:string)=>title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function context(event:Readonly<Event>,clock:string):DateContext{return {now:clock,timezone:String(event.data.timezone??'Asia/Kolkata'),...(typeof event.data.published==='string'?{published:event.data.published}:{}),...(event.data.dateOrder==='DMY'||event.data.dateOrder==='MDY'?{dateOrder:event.data.dateOrder}:{})};}
function parsed(event:Readonly<Event>,clock:string):ParsedDeadline[]{
  if(event.kind!=='notice')return [];
  const text=String(event.data.text??'');
  if(!/\b(last date|deadline|due|submit by|register by|closes on)\b/i.test(text))return [];
  const dates=parseDates(text,context(event,clock));
  return event.extracted?.length?dates.filter(date=>event.extracted!.some(proposal=>hash(proposal.value)===hash(date.value))):dates;
}
function recordsFor(event:Readonly<Event>,clock:string):RecordUpsert[]{
  const seen=new Map<string,number>();
  return parsed(event,clock).map(date=>{
    const index=seen.get(date.label)??0;seen.set(date.label,index+1);
    const flags=[...(date.ambiguous?['ambiguous date']:[]),...(date.uncertain?['uncertain year']:[])];
    const category=/\b(exam|fee|scholarship|assignment)\b/i.exec(`${event.data.title} ${event.data.text}`)?.[1]?.toLowerCase()??'event';
    const data:JsonObject={title:String(event.data.title),normalTitle:normalTitle(String(event.data.title)),url:String(event.data.url??''),quote:date.quote,label:date.label,ordinal:index,category,flags,timezone:date.value.timezone,dateOrder:String(event.data.dateOrder??'ambiguous-DMY'),published:typeof event.data.published==='string'?event.data.published:null,source:event.source,candidates:date.candidates};
    return {type:'deadline',key:hash([event.source,event.data.id,date.label,index]),value:date.value,data,...(flags.length?{confirm:{reason:flags.join('; '),candidates:date.candidates}}:{})};
  });
}
export function createNoticeApp(config:NoticeConfig={}):App {
  const sources=(config.sources??[]).map(source=>{
    if(!/^[a-z0-9-]+$/.test(source.id))throw new Error('Invalid notice source id');
    if(config.demo&&!source.demo)throw new Error('Demo mode cannot poll real sources');
    return {id:source.id,type:'poll' as const,intervalMs:Math.max(60_000,source.intervalMs??900_000),expand:(_payload:Json,ctx:Parameters<typeof pollNotices>[1])=>pollNotices(source,ctx)};
  });
  return defineApp({id:'notice-ghoul',theme:{name:'Notice Ghoul',accent:'#f5ba63',icon:'calendar',description:'Find the deadline. Keep the evidence.'},
    sources:[{id:'fixture',type:'cli',accept:raw=>{const data:unknown=JSON.parse(raw.body);if(!Array.isArray(data))throw new Error('Expected notice event array');return {key:hash(data),payload:data as Json,demo:true};},expand:payload=>payload as unknown as EventInput[]},...sources],
    records:{deadline:{parseValue:(text,record)=>{const value=parseDateEdit(text,{now:record.updatedAt,timezone:String(record.data.timezone??'Asia/Kolkata'),...(typeof record.data.published==='string'?{published:record.data.published}:{})});return value?{value}:{error:'Enter one unambiguous date such as 2026-12-05, optionally followed by 17:00.'};}}},
    rules:[{id:'detect-deadlines',priority:10,description:'Find deadline phrases and supported dates',evaluate:(event,ctx)=>({findings:event.kind==='notice'?[{severity:'info',message:`Found ${parsed(event,ctx.clock).length} deadline date(s).`,evidence:String(event.data.text)}]:[]})},
      {id:'extract-and-reconcile',priority:20,description:'Preserve evidence and flag both sides of conflicting notices',evaluate:(event,ctx)=>{
        const proposed=recordsFor(event,ctx.clock);const changes:RecordUpsert[]=[];
        for(const current of proposed){
          const previous=ctx.state.get('deadline',current.key,{includeUnconfirmed:true});
          if(Array.isArray(previous?.data.flags)&&previous.data.flags.includes('sources disagree')){current.data={...current.data,flags:[...(Array.isArray(current.data?.flags)?current.data.flags:[]),'sources disagree']};current.confirm={reason:'These sources previously disagreed. Verify the corrected notice before including it.',candidates:[current.value!]};}
          const peers=ctx.state.records({type:'deadline',includeUnconfirmed:true,where:r=>r.data.normalTitle===current.data?.normalTitle&&r.key!==current.key&&r.data.source!==event.source});
          const disagree=peers.filter(r=>hash(r.value)!==hash(current.value!));
          if(disagree.length){const candidates=[current.value!,...disagree.map(r=>r.value)];const flags=[...(Array.isArray(current.data?.flags)?current.data.flags:[]),'sources disagree'];current.data={...current.data,flags};current.confirm={reason:'Sources disagree. Check each source before choosing a deadline.',candidates};
            for(const peer of disagree){changes.push({type:'deadline',key:peer.key,data:{...peer.data,flags:[...new Set([...(Array.isArray(peer.data.flags)?peer.data.flags:[]),'sources disagree'])]},...(peer.confirmation!=='confirmed'?{confirm:{reason:'Sources disagree. Another notice gives a different date.',candidates}}:{})});}
          }
          changes.push(current);
        }
        return {records:changes,findings:changes.some(r=>r.confirm)?[{severity:'warning',message:'A deadline needs your confirmation before it enters the digest.'}]:[]};
      }}],
    actions:{
      'write-digest':{safety:'safe',reason:'Writes the requested digest, posts nothing, and includes only certain or confirmed deadlines.',describe:p=>String(p.markdown),execute:p=>({artifact:{path:'/digest',content:String(p.html),mediaType:'text/html; charset=utf-8'},markdown:{path:'/digest.md',content:String(p.markdown),mediaType:'text/markdown; charset=utf-8'}})},
      'write-calendar':{safety:'safe',reason:'Writes the requested calendar file from the same certain or confirmed dates; posts nothing.',describe:p=>`${p.count} deadlines in a downloadable calendar file.`,execute:p=>({artifact:{path:'/deadlines.ics',content:String(p.content),mediaType:'text/calendar; charset=utf-8'}})},
    },
    aggregates:[{id:'daily-digest',intervalMs:60_000,evaluate:ctx=>{const dates=eligible(ctx.state.records({type:'deadline'}),ctx.clock);const output=renderDigest(dates,ctx.clock);return {kind:'write-digest',target:'digest',key:hash([ctx.clock.slice(0,10),dates]),payload:{...output,count:dates.length}};}},
      {id:'calendar',intervalMs:60_000,evaluate:ctx=>{const dates=eligible(ctx.state.records({type:'deadline'}),ctx.clock);return {kind:'write-calendar',target:'calendar',key:hash(dates),payload:{content:renderCalendar(dates,ctx.clock),count:dates.length}};}}],
    ...(config.advisor?{advisor:{mode:'extract' as const,prompt:(event:Readonly<Event>)=>{const dates=parsed(event,event.receivedAt);return event.kind!=='notice'||dates.length===1&&!dates[0]?.ambiguous?undefined:`Find deadline dates in the notice. Return JSON array of {value:{date,time,timezone,instant},quote}. Quote exactly from the notice. Notice data: ${JSON.stringify(event.data.text)}`;},parse:(input:unknown):Json=>{if(!Array.isArray(input))throw new Error('Expected proposals array');return input.map(p=>{if(!p||typeof p!=='object'||!('quote'in p)||typeof p.quote!=='string'||!('value'in p)||!p.value||typeof p.value!=='object')throw new Error('Expected date and evidence quote');return {quote:p.quote,value:p.value as Json};});},fallback:()=>[],verify:(value:Json,quote:string,event:Readonly<Event>)=>{const normal=(s:string)=>s.replace(/\s+/g,' ').trim();return normal(String(event.data.text)).includes(normal(quote))&&parseDates(quote,context(event,event.receivedAt)).some(p=>hash(p.value)===hash(value));}}}:{})
  });
}
export function noticeDemoEvents(now:Date=new Date()):EventInput[]{
  const day=(offset:number)=>new Date(now.valueOf()+offset*86400000).toISOString().slice(0,10);
  const base={timezone:'Asia/Kolkata',published:now.toISOString(),demo:true};
  const notices=[
    {id:'library',source:'hollowmere-board',title:'Library research grant',text:`Applications for the research grant are due ${day(1)} at 17:00. Bring your project summary.`,url:'/fixtures/demo.html#library'},
    {id:'festival',source:'hollowmere-board',title:'Night sky photography workshop',text:`Register by ${day(7)} at 16:00. Places are limited.`,url:'/fixtures/demo.html#workshop'},
    {id:'fees',source:'hollowmere-board',title:'Winter term fee payment',text:`The last date for fee payment is 05/12/${now.getUTCMonth()>10?now.getUTCFullYear()+1:now.getUTCFullYear()}. Please verify the date with the office.`,url:'/fixtures/demo.html#fees'},
    {id:'scholarship',source:'hollowmere-board',title:'Merit scholarship renewal',text:`The scholarship renewal deadline is ${day(3)}. Submit your transcript.`,url:'/fixtures/demo.html#scholarship'},
    {id:'scholarship-dept',source:'hollowmere-department',title:'Merit scholarship renewal',text:`The scholarship renewal deadline is ${day(4)}. Department notice awaiting correction.`,url:'/fixtures/department-demo.html#scholarship'},
  ];return notices.map(n=>noticeEvent({...base,...n}));
}

/** Fictional fixture pages mirror the exact replay events for a supplied demo clock. */
export function noticeDemoSite(now:Date=new Date()):Record<string,{content:string;type:string}>{
  const events=noticeDemoEvents(now);const page=(source:string)=>String(html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DEMO · Hollowmere College</title><style>body{font:18px/1.65 system-ui;max-width:800px;margin:3rem auto;padding:0 1rem;color:#202d28;background:#fcfaf2}article{border-top:1px solid #b9c5ba;padding:1.5rem 0}a{color:#286344}.demo{background:#ffe29e;padding:1rem}</style></head><body><h1>Hollowmere College notice board</h1><p class="demo">DEMO: fictional institution and notices. Dates generated from ${now.toISOString().slice(0,10)}. This page exists only to test Notice Ghoul.</p>${events.filter(event=>event.source===source).map(event=>html`<article id="${String(event.data.url).split('#')[1]}"><h2>${event.data.title}</h2><time datetime="${event.data.published}">${String(event.data.published).slice(0,10)}</time><p>${event.data.text}</p><a href="${event.data.url}">Read this notice</a></article>`)}</body></html>`);
  return {'/fixtures/demo.html':{content:page('hollowmere-board'),type:'text/html; charset=utf-8'},'/fixtures/department-demo.html':{content:page('hollowmere-department'),type:'text/html; charset=utf-8'},'/robots.txt':{content:'User-agent: *\nAllow: /\n# DEMO fixture site\n',type:'text/plain; charset=utf-8'}};
}
