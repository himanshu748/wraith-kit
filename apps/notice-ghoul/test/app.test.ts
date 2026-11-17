import { describe,expect,it } from 'vitest';
import { createServer } from 'node:http';
import fc from 'fast-check';
import ICAL from 'ical.js';
import { Engine, type EventInput, type RecordEntry } from '@wraith-kit/skeleton/core';
import { MemoryStore } from '@wraith-kit/skeleton/testing';
import { pbtRuns } from '../../../tests/pbt.js';
import { parseDates,parseDateEdit } from '../src/dates.js';
import { createNoticeApp,noticeDemoEvents,noticeDemoSite } from '../src/index.js';
import { eligible,renderCalendar,renderDigest,foldLine,type Deadline } from '../src/outputs.js';
import { parseNotices,robotsAllowed,pollNotices } from '../src/sources.js';
const clock='2026-11-17T10:00:00.000Z';
const engine=()=>new Engine(createNoticeApp(),new MemoryStore(),{auditKey:'test-key',clock:()=>new Date(clock)});
async function evaluate(events:EventInput[]){const e=engine();for(const event of events)await e.ingest(event);return {e,records:Object.values((await e.snapshot()).records)};}
describe('Notice Ghoul extension',()=>{
  // Validates: notice-ghoul 3.2, 5.2, 5.8
  it('NG-P1 dedupe and disagreement are idempotent and order independent',async()=>{
    await fc.assert(fc.asyncProperty(fc.integer({min:1,max:5}),fc.boolean(),async(repeats,reverse)=>{
      const events=noticeDemoEvents(new Date(clock)).slice(3);
      const a=await evaluate(Array.from({length:repeats},()=>reverse?[...events].reverse():events).flat());const b=await evaluate([...events].reverse());
      const normal=(records:RecordEntry[])=>records.map(r=>({key:r.key,value:r.value,flags:r.data.flags})).sort((x,y)=>x.key.localeCompare(y.key));
      expect(normal(a.records)).toEqual(normal(b.records));expect(a.records).toHaveLength(2);expect(a.records.every(r=>Array.isArray(r.data.flags)&&r.data.flags.includes('sources disagree'))).toBe(true);
      expect(eligible(a.records,clock)).toEqual([]);
    }),{numRuns:pbtRuns()});
  });
  // Validates: notice-ghoul 4.2, 4.4, 4.5, 4.6
  it('NG-P2 round-trips supported explicit dates and flags missing-year uncertainty',()=>{
    fc.assert(fc.property(fc.integer({min:2026,max:2035}),fc.integer({min:1,max:12}),fc.integer({min:1,max:28}),(year,month,day)=>{
      const iso=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      for(const text of [iso,`${day}/${month}/${year}`,`${day} ${['January','February','March','April','May','June','July','August','September','October','November','December'][month-1]} ${year}`])expect(parseDates(text,{now:clock,dateOrder:'DMY'})[0]?.value.date).toBe(iso);
      expect(parseDateEdit(iso,{now:clock})?.date).toBe(iso);
    }),{numRuns:pbtRuns()});
    expect(parseDates('Due 5 December',{now:clock})[0]?.uncertain).toBe(true);
    expect(parseDates('Due 5 January',{now:clock,published:clock})[0]?.value.date).toBe('2027-01-05');
    expect(parseDates('31/02/2026',{now:clock})).toEqual([]);
    expect(parseDates('05/12/2026',{now:clock})[0]?.candidates).toHaveLength(2);
  });
  it('converts timed dates in the configured timezone and rejects invalid hours',()=>{
    expect(parseDates('Due 5 December 2026 at 5:00 PM',{now:clock})[0]?.value.instant).toBe('2026-12-05T11:30:00.000Z');
    expect(parseDates('Due 2026-12-05 at 27:00',{now:clock})).toEqual([]);
  });
  // Validates: notice-ghoul 9.3, 9.4, 9.5, 9.6
  it('NG-P3 calendar round-trips hostile Unicode titles with stable UID across moved dates',()=>{
    fc.assert(fc.property(fc.string({maxLength:80}),title=>{
      const item:Deadline={key:'stable',title,quote:'one\r\nDESCRIPTION:injected;\\x',category:'event',demo:false,version:1,sources:[],value:{date:'2026-12-05',time:null,instant:null,timezone:'Asia/Kolkata'}};
      const calendar=renderCalendar([item],clock);const parsed=new ICAL.Component(ICAL.parse(calendar));const component=parsed.getFirstSubcomponent('vevent')!;const event=new ICAL.Event(component);
      expect(event.summary).toBe(title.replace(/\r\n|\r/g,'\n'));expect(event.startDate.toString()).toBe('2026-12-05');
      const moved=new ICAL.Event(new ICAL.Component(ICAL.parse(renderCalendar([{...item,version:2,value:{...item.value,date:'2026-12-07'}}],clock))).getFirstSubcomponent('vevent')!);
      expect(moved.uid).toBe(event.uid);expect(component.getAllProperties('description')).toHaveLength(1);
      for(const line of calendar.split('\r\n'))expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }),{numRuns:pbtRuns()});
    expect(foldLine('SUMMARY:'+ 'ह'.repeat(40))).toContain('\r\n ');
  });
  // Validates: notice-ghoul 6.3, 7.1, 8.3
  it('NG-P4 evidence verification rejects invented dates and uncertain values wait for approval',async()=>{
    const app=createNoticeApp({advisor:true});const event=noticeDemoEvents(new Date(clock))[2]!;
    const full={...event,id:'event',appId:app.id,occurredAt:clock,receivedAt:clock,demo:true};
    fc.assert(fc.property(fc.string({maxLength:40}),suffix=>{expect(app.advisor?.verify?.({date:'2099-01-01',time:null,instant:null,timezone:'Asia/Kolkata'},'invented quote '+suffix,full)).toBe(false);}),{numRuns:pbtRuns()});
    const {e,records}=await evaluate([event]);expect(eligible(records,clock)).toHaveLength(0);
    const action=Object.values((await e.snapshot()).actions).find(a=>a.kind==='confirm-record')!;expect(action).toBeTruthy();await e.decide(action.id,{type:'edit',value:'2026-12-05'},'student');
    expect(eligible(Object.values((await e.snapshot()).records),clock)).toHaveLength(1);
  });
  it('renders untrusted content as text in both digest formats',()=>{
    const item:Deadline={key:'one',title:'<script>alert(1)</script>',quote:'[click](javascript:alert(1))',sources:[],category:'event',demo:true,version:1,value:{date:'2026-12-05',time:null,instant:null,timezone:'Asia/Kolkata'}};
    const output=renderDigest([item],clock);expect(output.html).not.toContain('<script>');expect(output.html).toContain('&lt;script&gt;');expect(output.markdown).toContain('\\[click\\]');
  });
  it('parses RSS, Atom and configured HTML without fetching their links',()=>{
    const source={id:'test',url:'https://college.example/notices',demo:true};
    const rss=parseNotices('<rss><channel><item><guid>a</guid><title>Exam</title><link>/exam</link><description>Due 2026-12-05</description></item></channel></rss>',{...source,format:'rss'});
    expect(rss[0]?.url).toBe('https://college.example/exam');
    expect(parseNotices('<feed><entry><id>a</id><title>Exam</title><link href="/exam"/><summary>Due 2026-12-05</summary></entry></feed>',{...source,format:'atom'})).toHaveLength(1);
    expect(parseNotices('<article><h2>Exam</h2><a href="/exam">Read</a><p>Due 2026-12-05</p></article>',{...source,format:'html'})).toHaveLength(1);
    expect(()=>parseNotices('<rss>broken',{...source,format:'rss'})).toThrow('Malformed');
    expect(parseNotices('<article><h2>Bad</h2><a href="javascript:alert(1)">x</a></article>',{...source,format:'html'})).toHaveLength(0);
  });
  it('keeps merged calendar identity when duplicate sources appear or dates move',async()=>{
    const event=noticeDemoEvents(new Date(clock))[0]!;const {records}=await evaluate([event]);const first=eligible(records,clock)[0]!;
    const duplicate={...records[0]!,id:'other',key:'new-source',data:{...records[0]!.data,url:'/fixtures/department-demo.html#library'},version:1};
    expect(eligible([duplicate,...records],clock)[0]?.key).toBe(first.key);expect(eligible([duplicate],clock)[0]?.key).toBe(first.key);
    const moved={...records[0]!,value:{...(records[0]!.value as object),date:'2026-11-19',time:null,instant:null,timezone:'Asia/Kolkata'},version:2};
    expect(eligible([moved],clock)[0]?.key).toBe(first.key);
  });
  it('retains review on both records after a source correction and preserves record identity',async()=>{
    const events=noticeDemoEvents(new Date(clock)).slice(3);const {e,records}=await evaluate(events);
    const corrected={...events[1]!,idempotencyKey:'corrected-department',data:{...events[1]!.data,text:events[0]!.data.text!}};
    await e.ingest(corrected);const after=Object.values((await e.snapshot()).records);
    expect(after.map(r=>r.key).sort()).toEqual(records.map(r=>r.key).sort());
    expect(after.every(r=>Array.isArray(r.data.flags)&&r.data.flags.includes('sources disagree'))).toBe(true);
    expect(eligible(after,clock)).toEqual([]);
  });
  it('polls an actual loopback fixture, sends validators, keeps 304 empty, and fails closed',async()=>{
    const pages=noticeDemoSite(new Date(clock));let mode='ok';let seenValidator='';
    const server=createServer((req,res)=>{
      if(req.url==='/robots.txt'){res.end(mode==='robots'?'User-agent: *\nDisallow: /':'User-agent: *\nAllow: /');return;}
      seenValidator=String(req.headers['if-none-match']??'');
      if(mode==='304'){res.writeHead(304);res.end();return;}
      if(mode==='broken'){res.writeHead(503);res.end('temporarily unavailable');return;}
      res.writeHead(200,{'Content-Type':'text/html','ETag':'"fixture-v1"'});res.end(pages['/fixtures/demo.html']!.content);
    });
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('Missing test listener');
    const source={id:'hollowmere-board',url:`http://127.0.0.1:${address.port}/fixtures/demo.html`,format:'html' as const,demo:true};
    const ctx={clock,http:fetch,signal:new AbortController().signal,validators:{}};
    try{
      const first=await pollNotices(source,ctx);expect(Array.isArray(first)).toBe(false);if(Array.isArray(first))throw new Error('Expected validator wrapper');
      expect(first.events).toHaveLength(4);expect(first.events.every(event=>event.demo)).toBe(true);
      mode='304';const next=await pollNotices(source,{...ctx,validators:first.validators!});expect(next).toEqual({events:[],validators:first.validators});expect(seenValidator).toBe('"fixture-v1"');
      mode='broken';await expect(pollNotices(source,ctx)).rejects.toThrow('503');
      mode='robots';await expect(pollNotices(source,ctx)).rejects.toThrow('robots');
      await expect(pollNotices({...source,demo:false},ctx)).rejects.toThrow('Private-network');
      await expect(pollNotices({...source,demo:false,url:'http://[::ffff:7f00:1]/'},ctx)).rejects.toThrow('Private-network');
    }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  });
  it('honours robots longest rule and a specific crawler group',()=>{
    expect(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/secret')).toBe(false);
    expect(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/public')).toBe(true);
    expect(robotsAllowed('User-agent: wraith-kit\nDisallow: /\nUser-agent: *\nAllow: /','/notice')).toBe(false);
  });
});
