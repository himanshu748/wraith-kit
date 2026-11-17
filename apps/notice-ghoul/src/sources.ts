import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { load } from 'cheerio';
import { hash, type EventInput, type ExpandContext, type ExpandedInput } from '@wraith-kit/skeleton/core';

export interface NoticeSource { id:string; url:string; format:'html'|'rss'|'atom'; timezone?:string; dateOrder?:'DMY'|'MDY'; intervalMs?:number; demo?:boolean; selectors?:{item:string;title:string;link:string;date?:string;body?:string} }
export interface Notice { id:string; source:string; title:string; text:string; url:string; published?:string; timezone:string; dateOrder?:'DMY'|'MDY'; demo:boolean }
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
const link=(raw:string,base:string):string=>{try{const u=new URL(raw,base);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)return u.href;}catch{/* invalid source link */}return '';};
export function parseNotices(body:string,source:NoticeSource):Notice[]{
  if(body.length>1_000_000)throw new Error('Notice response exceeds 1 MB');
  const xml=source.format!=='html';
  if(xml&&(/<!DOCTYPE|<!ENTITY/i.test(body)||!/<\/(rss|feed)>\s*$/i.test(body.trim())))throw new Error('Malformed or unsupported XML feed');
  const $=load(body,xml?{xml:true}:undefined);const notices:Notice[]=[];
  const selector=source.format==='rss'?'item':source.format==='atom'?'entry':source.selectors?.item??'article';
  $(selector).each((_i,el)=>{
    if(notices.length>=100)throw new Error('Notice source exceeds 100 items');
    const item=$(el),html=source.format==='html';
    const title=clean(item.find(html?(source.selectors?.title??'h2'):'title').first().text());
    const href=html?item.find(source.selectors?.link??'a').first().attr('href'):source.format==='atom'?item.find('link[rel="alternate"], link:not([rel])').first().attr('href'):item.find('link').first().text();
    const url=link(href??'',source.url);const id=clean(item.find(source.format==='rss'?'guid':'id').first().text())||url;
    const text=clean(html?item.find(source.selectors?.body??'p').text():item.find(source.format==='rss'?'description':'content, summary').text());
    const date=html?item.find(source.selectors?.date??'time').attr('datetime'):item.find(source.format==='rss'?'pubDate':'published, updated').first().text();
    const published=date&&Number.isFinite(Date.parse(date))?new Date(date).toISOString():undefined;
    if(!title||!url||!id)return;
    notices.push({id,source:source.id,title,text,url,...(published?{published}:{}),timezone:source.timezone??'Asia/Kolkata',...(source.dateOrder?{dateOrder:source.dateOrder}:{}),demo:source.demo??false});
  });return notices;
}
export function noticeEvent(notice:Notice):EventInput {
  const data={...notice};
  return {source:notice.source,kind:'notice',subject:notice.title,idempotencyKey:hash([notice.source,notice.id,clean(notice.title),clean(notice.text)]),data,demo:notice.demo,...(notice.published?{occurredAt:notice.published}:{})};
}

/** Conservative RFC 9309 matching: longest matching Allow/Disallow, specific agent before *. */
export function robotsAllowed(text:string,path:string):boolean {
  const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let group={agents:[] as string[],rules:[] as {allow:boolean;path:string}[]};
  for(const raw of text.split(/\r?\n/)){const line=raw.split('#')[0]?.trim()??'';const m=/^([\w-]+)\s*:\s*(.*)$/.exec(line);if(!m)continue;const key=m[1]?.toLowerCase(),value=m[2]?.trim()??'';
    if(key==='user-agent'){if(group.rules.length){groups.push(group);group={agents:[],rules:[]};}group.agents.push(value.toLowerCase());}
    else if((key==='allow'||key==='disallow')&&group.agents.length&&value)group.rules.push({allow:key==='allow',path:value});
  }groups.push(group);
  const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&'wraith-kit'.includes(a)));
  const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  const matches=selected.flatMap(g=>g.rules).filter(rule=>{
    const end=rule.path.endsWith('$');const expression=rule.path.replace(/\$$/,'').split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');
    return new RegExp(`^${expression}${end?'$':''}`).test(path);
  }).sort((a,b)=>b.path.replaceAll('*','').length-a.path.replaceAll('*','').length||Number(b.allow)-Number(a.allow));
  return matches[0]?.allow??true;
}
function privateAddress(address:string):boolean {
  const lower=address.toLowerCase();if(lower.startsWith('::ffff:'))return true; // Reject mapped IPv6, including hex-encoded private IPv4.
  const a=lower;
  if(isIP(a)===4){const p=a.split('.').map(Number);return p[0]===0||p[0]===10||p[0]===127||p[0]===169&&p[1]===254||p[0]===172&&p[1]!>=16&&p[1]!<=31||p[0]===192&&(p[1]===168||p[1]===0)||p[0]===100&&p[1]!>=64&&p[1]!<=127||p[0]===198&&(p[1]===18||p[1]===19)||p[0]!>=224;}
  return a==='::1'||a==='::'||a.startsWith('fc')||a.startsWith('fd')||a.startsWith('ff')||/^fe[89ab]/.test(a);
}
async function permitted(url:URL,source:NoticeSource):Promise<void>{
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Unsupported notice URL');
  if(url.origin!==new URL(source.url).origin)throw new Error('Notice redirect leaves configured origin');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if(source.demo&&['localhost','127.0.0.1','::1'].includes(host))return;
  const addresses=isIP(host)?[{address:host}]:await lookup(host,{all:true});
  if(!addresses.length||addresses.some(a=>privateAddress(a.address)))throw new Error('Private-network notice URL is not allowed');
}
async function boundedFetch(url:string,source:NoticeSource,ctx:ExpandContext,headers:Record<string,string>):Promise<Response>{
  let target=new URL(url);
  for(let n=0;n<4;n++){
    await permitted(target,source);
    const response=await ctx.http(target,{headers,redirect:'manual',signal:AbortSignal.any([ctx.signal,AbortSignal.timeout(10_000)])});
    if([301,302,303,307,308].includes(response.status)){const destination=response.headers.get('location');await response.body?.cancel();if(!destination)throw new Error('Redirect has no destination');target=new URL(destination,target);continue;}
    return response;
  }throw new Error('Too many notice redirects');
}
async function textBounded(response:Response):Promise<string>{
  const reader=response.body?.getReader();if(!reader)return '';let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_000_000){await reader.cancel();throw new Error('Notice response exceeds 1 MB');}chunks.push(value);}
  return Buffer.concat(chunks).toString('utf8');
}
export async function pollNotices(source:NoticeSource,ctx:ExpandContext):Promise<ExpandedInput>{
  const headers:Record<string,string>={'User-Agent':'Wraith-Kit/0.1 (user-configured notice digest)','Accept':'text/html, application/rss+xml, application/atom+xml'};
  if(source.format==='html'){
    const robots=await boundedFetch(new URL('/robots.txt',source.url).href,source,ctx,headers);
    if(robots.status!==404){if(!robots.ok)throw new Error(`robots.txt HTTP ${robots.status}`);if(!robotsAllowed(await textBounded(robots),new URL(source.url).pathname+new URL(source.url).search))throw new Error('Source disallowed by robots.txt');}
  }
  if(typeof ctx.validators.etag==='string')headers['If-None-Match']=ctx.validators.etag;
  if(typeof ctx.validators.modified==='string')headers['If-Modified-Since']=ctx.validators.modified;
  const response=await boundedFetch(source.url,source,ctx,headers);
  if(response.status===304)return {events:[],validators:ctx.validators};
  if(!response.ok)throw new Error(`Notice source HTTP ${response.status}`);
  return {events:parseNotices(await textBounded(response),source).map(noticeEvent),validators:{etag:response.headers.get('etag'),modified:response.headers.get('last-modified')}};
}
