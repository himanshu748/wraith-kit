import { createHash } from 'node:crypto';
import { hash, html, type RecordEntry } from '@wraith-kit/skeleton/core';
import type { DeadlineValue } from './dates.js';

export interface Deadline { key:string; groupKey?:string; recordKey?:string; quotes?:string[]; value:DeadlineValue; title:string; quote:string; sources:string[]; category:string; demo:boolean; version:number }
export function safeLink(raw: string): string {
  try { const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.href:''; } catch { return raw.startsWith('/fixtures/')?raw:''; }
}
export function eligible(records:readonly Readonly<RecordEntry>[],clock:string):Deadline[] {
  const map=new Map<string,Deadline>();
  for(const record of [...records].sort((a,b)=>a.key.localeCompare(b.key))){
    if(record.type!=='deadline'||record.confirmation==='rejected'||!record.value||typeof record.value!=='object'||Array.isArray(record.value))continue;
    const value=record.value as DeadlineValue;
    if(typeof value.date!=='string')continue;
    const flags=Array.isArray(record.data.flags)?record.data.flags:[];
    if(record.confirmation!=='confirmed'&&(flags.length||record.sourcedBy.startsWith('llm:')))continue;
    const end=value.instant??`${value.date}T23:59:59Z`;if(Date.parse(end)<Date.parse(clock))continue;
    const title=String(record.data.title??'Untitled notice');const groupKey=hash([title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(),record.data.label??'deadline',record.data.ordinal??0]);const key=`${groupKey}|${JSON.stringify(value)}`;
    const link=safeLink(String(record.data.url??''));const prior=map.get(key);
    if(prior){if(link&&!prior.sources.includes(link))prior.sources.push(link);const quote=String(record.data.quote??'');if(!prior.quotes!.includes(quote))prior.quotes!.push(quote);prior.version=Math.max(prior.version,record.version);prior.demo ||= record.demo;continue;}
    map.set(key,{key:groupKey,groupKey,recordKey:record.key,quotes:[String(record.data.quote??'')],value,title,quote:String(record.data.quote??''),sources:link?[link]:[],category:String(record.data.category??'event'),demo:record.demo,version:record.version});
  }
  const values=[...map.values()];const counts=new Map<string,number>();for(const item of values)counts.set(item.groupKey!,1+(counts.get(item.groupKey!)??0));
  // Distinct human-confirmed conflicts need distinct UIDs; normal merged identities never depend on source ordering or the date.
  for(const item of values){if(counts.get(item.groupKey!)!>1)item.key=hash([item.groupKey,item.recordKey]);item.sources.sort();}
  return values.sort((a,b)=>(a.value.instant??a.value.date).localeCompare(b.value.instant??b.value.date)||a.key.localeCompare(b.key));
}
export function markdownText(text:string):string{return text.replace(/[\\`*_{}[\]()#+.!|>~<>]/g,'\\$&').replace(/\r?\n/g,' ');}
export function grouped(deadlines:Deadline[],clock:string):{name:string;items:Deadline[]}[]{
  const now=Date.parse(clock),week=new Date(clock);week.setUTCDate(week.getUTCDate()+((7-week.getUTCDay())%7));week.setUTCHours(23,59,59,999);
  const groups=[{name:'Due in 48 h',items:[] as Deadline[]},{name:'This week',items:[] as Deadline[]},{name:'Later',items:[] as Deadline[]}];
  for(const item of deadlines){const when=Date.parse(item.value.instant??`${item.value.date}T00:00:00Z`);groups[when-now<=172800000?0:when<=week.valueOf()?1:2]?.items.push(item);}
  return groups;
}
export function renderDigest(deadlines:Deadline[],clock:string):{html:string;markdown:string}{
  const groups=grouped(deadlines,clock);
  const content=html`<section class="digest"><h1>Your deadline digest</h1><p>Only confirmed or unambiguous deadlines. Nothing is posted anywhere.</p>${groups.map(group=>html`<section><h2>${group.name}</h2>${group.items.length?group.items.map(item=>html`<article><p>${item.demo?'DEMO · ':''}${item.category} · ${item.value.date}${item.value.time?` at ${item.value.time} (${item.value.timezone})`:''}</p><h3>${item.title}</h3>${(item.quotes??[item.quote]).map(quote=>html`<blockquote>${quote}</blockquote>`)}${item.sources.map(source=>html`<a href="${source}">Source notice</a>`)}</article>`):html`<p>No deadlines in this group.</p>`}</section>`)}</section>`;
  const markdown=['# Your deadline digest','',...groups.flatMap(group=>[`## ${group.name}`,'',...(group.items.length?group.items.map(item=>`- ${item.demo?'**DEMO** ':''}**${markdownText(item.title)}**: ${item.value.date}${item.value.time?` ${item.value.time} (${item.value.timezone})`:''}\n  ${(item.quotes??[item.quote]).map(markdownText).join(" / ")}\n  ${item.sources.map(url=>`[Source](${url.replace(/[()\s]/g,c=>encodeURIComponent(c))})`).join(' · ')}`):['No deadlines in this group.']),''])].join('\n');
  return {html:String(html`<!doctype html><html lang="en" data-accent="amber"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Deadline digest · Notice Ghoul</title><link rel="stylesheet" href="/assets/wraith.css"></head><body class="digest-document"><header><a href="/queue">← Back to Notice Ghoul</a><nav aria-label="Digest downloads"><a href="/digest.md">Download Markdown</a><a href="/deadlines.ics">Download calendar</a></nav></header><main>${content}</main></body></html>`),markdown};
}
export function icsEscape(text:string):string{return text.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
export function foldLine(line:string):string {
  let output='',part='',bytes=0;
  for(const char of line){const n=Buffer.byteLength(char);if(bytes+n>75){output+=`${part}\r\n`;part=' ';bytes=1;}part+=char;bytes+=n;}
  return output+part;
}
export function renderCalendar(deadlines:Deadline[],clock:string):string {
  const stamp=new Date(clock).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Wraith Kit//Notice Ghoul//EN','CALSCALE:GREGORIAN'];
  for(const item of deadlines){const uid=createHash('sha256').update(item.key).digest('hex');lines.push('BEGIN:VEVENT',`UID:${uid}@wraith.local`,`DTSTAMP:${stamp}`,`SEQUENCE:${item.version}`,item.value.instant?`DTSTART:${item.value.instant.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}`:`DTSTART;VALUE=DATE:${item.value.date.replaceAll('-','')}`,`SUMMARY:${icsEscape(`${item.demo?'[DEMO] ':''}${item.title}`)}`,`DESCRIPTION:${icsEscape((item.quotes??[item.quote]).join('\n'))}`,`CATEGORIES:${icsEscape(item.category)}`,...(item.sources[0]?[`URL:${icsEscape(item.sources[0])}`]:[]),'END:VEVENT');}
  lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
}
