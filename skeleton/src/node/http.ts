// WRAITH-SKELETON
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { Engine, type Store, type App, type Decision, type JsonObject, type EventInput, type Action } from '../core/index.js';
import { renderPage, stylesheet, enhancementScript, type UiModel } from '../ui/index.js';
import { reserveQuota } from './quotas.js';
export interface HttpOptions {
  app: App; engine: Engine; store: Store; sessionKey: string; hosted?: boolean;
  publicDemo?: boolean; demo?: boolean; loginToken?: string; loginRole?: 'admin' | 'demo'; adminToken?: string; demoCode?: string;
  demoEvents?: () => EventInput[]; provider?: UiModel['provider'] | (() => UiModel['provider']);
  afterAccept?: () => void | Promise<void>; fixtureFiles?: Record<string, {content:string;type:string}>;
}
const digest = (x: string) => createHash('sha256').update(x).digest('hex');
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export async function updateMeta(store: Store, change: (meta: JsonObject) => void): Promise<void> {
  for (let i=0;i<20;i++) { const s=await store.read(); s.meta ??= {}; change(s.meta); if(await store.compareAndSwap(s.revision,{...s,revision:s.revision+1}))return; }
  throw new Error('Store busy; try again');
}
export function artifacts(actions: readonly Action[]): Map<string, {content:string;mediaType:string;actionId:string}> {
  const output=new Map<string,{content:string;mediaType:string;actionId:string}>();
  for(const action of [...actions].sort((a,b)=>a.createdAt.localeCompare(b.createdAt))) {
    if(action.status!=='succeeded'||!action.result||typeof action.result!=='object'||Array.isArray(action.result))continue;
    for(const raw of [action.result.artifact,action.result.markdown]) {
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&typeof raw.path==='string'&&typeof raw.content==='string'&&typeof raw.mediaType==='string'&&/^\/?[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(raw.path)&&!raw.path.split('/').some(p=>p==='.'||p==='..')) output.set('/'+raw.path.replace(/^\//,''),{content:raw.content,mediaType:raw.mediaType,actionId:action.id});
    }
  }
  return output;
}
export function createHttpHandler(options: HttpOptions): (request: Request) => Promise<Response> {
  const {app,engine,store}=options;
  // Cookies are shared across ports, including the two local demo servers.
  const cookieName=options.hosted?'__Host-wraith':`wraith-${app.id}`;
  const mac=(value:string)=>createHmac('sha256',options.sessionKey).update(value).digest('hex');
  const cookie=(token:string,age=28_800)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${options.hosted?'; Secure':''}`;
  const issue=(authenticated:boolean,role='admin')=>{const body=Buffer.from(JSON.stringify({id:randomBytes(24).toString('hex'),exp:Date.now()+28_800_000,auth:authenticated,role})).toString('base64url');return `${body}.${mac(body)}`;};
  const decode=(token:string)=>{try{const [body,signature]=token.split('.');if(!body||!signature||!equal(mac(body),signature))return;const v=JSON.parse(Buffer.from(body,'base64url').toString()) as {id:string;exp:number;auth:boolean;role:string};if(typeof v.id!=='string'||!Number.isFinite(v.exp)||v.exp<Date.now()||typeof v.auth!=='boolean')return;return v;}catch{return;}};
  const loginHash=options.loginToken?digest(options.loginToken):undefined;
  const headers={'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin','Cache-Control':'no-store'};
  return async(request)=>{
    const url=new URL(request.url); let status=200;
    const respond=(body:string,code=200,type='text/html; charset=utf-8',extra:Record<string,string>={})=>new Response(body,{status:code,headers:{...headers,'Content-Type':type,...extra}});
    if(url.pathname==='/health')return respond('ok',200,'text/plain');
    if(url.pathname==='/assets/wraith.css')return respond(stylesheet,200,'text/css');
    if(url.pathname==='/assets/wraith.js')return respond(enhancementScript,200,'text/javascript');
    const cookies=request.headers.get('cookie')?.split(';').map(x=>x.trim())??[];
    const currentCookie=cookies.find(x=>x.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
    const legacyCookie=options.hosted?undefined:cookies.find(x=>x.startsWith('wraith='))?.slice('wraith='.length);
    const found=currentCookie??legacyCookie??'';
    let session=decode(found);let token=found;
    if(!session){token=issue(false);session=decode(token)!;}
    const state=await store.read();
    const active=state.meta?.sessions;
    const sessions:JsonObject=active&&typeof active==='object'&&!Array.isArray(active)?active:{};
    const authenticated=session.auth&&typeof sessions[digest(session.id)]==='number'&&Number(sessions[digest(session.id)])>Date.now();
    const demoOnly=!!options.hosted&&(!authenticated||session.role==='demo');
    const csrf=mac(`csrf:${session.id}`);
    const extra={'Set-Cookie':cookie(token)};
    const redirect=(path:string,newToken=token)=>respond('',303,'text/plain',{Location:path,'Set-Cookie':cookie(newToken)});
    const theme=app.theme;
    const model:UiModel={page:'home',app:{id:app.id,name:theme?.name??app.id,description:theme?.description,accent:theme?.accent,outputs:app.aggregates?.length?[{href:'/digest',label:'Daily digest'},{href:'/deadlines.ics',label:'Calendar file'}]:[]},authenticated,csrfToken:csrf,demo:options.demo??options.publicDemo??false,events:Object.values(state.events).filter(e=>e.appId===app.id&&(!demoOnly||e.demo)),provider:typeof options.provider==='function'?options.provider():options.provider,actions:Object.values(state.actions).filter(a=>a.appId===app.id&&(!demoOnly||a.demo))};
    try{
      if(request.method==='POST'&&app.sources.some(s=>s.type==='webhook'&&s.path===url.pathname)){
        const body=await request.text();if(Buffer.byteLength(body)>262144)return respond('Webhook too large',413,'text/plain');
        const source=app.sources.find(s=>s.type==='webhook'&&s.path===url.pathname)!;
        await engine.accept(source.id,{path:url.pathname,body,headers:Object.fromEntries(request.headers),method:'POST'});
        await Promise.resolve(options.afterAccept?.()).catch(()=>{});
        return respond(JSON.stringify({accepted:true}),202,'application/json');
      }
      if(url.pathname==='/auth'&&request.method==='GET'){
        const supplied=url.searchParams.get('token')??'';
        if(!loginHash||!equal(digest(supplied),loginHash))return respond('Invalid sign-in link',401,'text/plain');
        const auth=issue(true,options.loginRole);const parsed=decode(auth)!;
        await updateMeta(store,meta=>{if(meta.loginUsed===loginHash)throw new Error('Sign-in link already used');meta.loginUsed=loginHash;const list=meta.sessions as JsonObject|undefined;meta.sessions={...list,[digest(parsed.id)]:parsed.exp};});
        return redirect('/queue',auth);
      }
      if(request.method==='POST'){
        const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return respond('Cross-origin request refused',403,'text/plain');
        const text=await request.text();if(Buffer.byteLength(text)>32_768)return respond('Form too large',413,'text/plain');
        const form=new URLSearchParams(text);
        if(!equal(form.get('csrf')??'',csrf))return respond('Invalid form token. Reload the page.',403,'text/plain');
        if(url.pathname==='/login'){
          if(!await reserveQuota(store,'login-attempts',randomBytes(16).toString('hex'),new Date().toISOString().slice(0,13),60))return respond('Too many sign-in attempts. Try again next hour.',429,'text/plain');
          const supplied=form.get('token')??'';
          const valid=[options.adminToken,options.demoCode].some(secret=>secret&&equal(digest(secret),digest(supplied)));
          if(!valid){model.page='login';model.error='That access code is not valid.';return respond(renderPage(model),401,'text/html',extra);}
          const role=options.adminToken&&equal(digest(options.adminToken),digest(supplied))?'admin':'demo';
          const auth=issue(true,role);const parsed=decode(auth)!;
          await updateMeta(store,meta=>{const list=(meta.sessions??{}) as JsonObject;meta.sessions=Object.fromEntries(Object.entries(list).filter(([,v])=>Number(v)>Date.now()));(meta.sessions as JsonObject)[digest(parsed.id)]=parsed.exp;});
          return redirect('/queue',auth);
        }
        if(!authenticated)return respond('Sign in before making a decision.',401,'text/plain');
        if(url.pathname==='/logout'){await updateMeta(store,meta=>{const list=meta.sessions as JsonObject|undefined;if(list)delete list[digest(session.id)];});return redirect('/',issue(false));}
        if(url.pathname==='/demo'){
          if(!options.demoEvents)return respond('Demo replay is unavailable',404,'text/plain');
          for(const event of options.demoEvents())await engine.ingest(event);
          await engine.tick();return redirect('/queue?notice=Demo+events+replayed');
        }
        const match=url.pathname.match(/^\/actions\/([^/]+)\/decision$/);
        if(match){
          const type=form.get('decision');let decision:Decision;
          if(type==='approve'||type==='retry')decision={type};
          else if(type==='reject')decision={type,reason:form.get('reason')??''};
          else if(type==='edit')decision={type,value:form.get('value')??''};
          else if(type==='pick')decision={type,index:Number(form.get('candidate'))};
          else return respond('Unknown decision',400,'text/plain');
          const id=decodeURIComponent(match[1]);const action=state.actions[id];if(!action||action.appId!==app.id||(demoOnly&&!action.demo))return respond('Action not found',404,'text/plain');
          model.action=action;model.page='action';model.editValue=form.get('value')??undefined;
          model.record=Object.values(state.records).find(r=>r.id===action.payload.recordId);
          if(model.record)model.confirmation={canEdit:!!app.records?.[model.record.type]?.parseValue,candidates:Array.isArray(action.payload.candidates)?action.payload.candidates:[],currentValue:model.record.value};
          await engine.decide(id,decision,'local-user');await engine.tick();return redirect(`/actions/${encodeURIComponent(id)}?notice=Decision+saved`);
        }
        return respond('Not found',404,'text/plain');
      }
      if(request.method!=='GET')return respond('Method not allowed',405,'text/plain');
      if(options.fixtureFiles?.[url.pathname]){const f=options.fixtureFiles[url.pathname];return respond(f.content,200,f.type);}
      if(!authenticated&&!options.publicDemo&&!['/','/login'].includes(url.pathname))return redirect('/login');
      if(url.pathname==='/login')model.page='login';
      else if(url.pathname==='/queue'){model.page='queue';model.filter=['all','complete'].includes(url.searchParams.get('filter')??'')?url.searchParams.get('filter') as 'all'|'complete':'pending';}
      else if(url.pathname==='/audit'){model.page='audit';const visible=new Set([...(model.actions??[]).map(a=>a.id),...Object.values(state.events).filter(e=>e.demo).map(e=>e.id),...Object.values(state.records).filter(r=>r.demo).map(r=>r.id)]);model.audit=demoOnly?state.audit.filter(e=>e.references.length&&e.references.every(id=>visible.has(id))):state.audit;const v=await engine.verifyAudit();model.verification={valid:v.valid,message:v.reason??v.limit};}
      else if(url.pathname==='/settings')model.page='settings';
      else if(url.pathname.startsWith('/actions/')){
        const id=decodeURIComponent(url.pathname.slice('/actions/'.length).replace(/\/download$/,''));const action=state.actions[id];
        if(!action||action.appId!==app.id||(demoOnly&&!action.demo)){model.page='error';model.error='This action was not found.';status=404;}
        else{
          model.page='action';model.action=action;model.event=action.eventId?state.events[action.eventId]:undefined;
          if(action.kind==='confirm-record'){
            const record=Object.values(state.records).find(r=>r.id===action.payload.recordId||r.key===action.payload.key);
            model.record=record;model.confirmation={quote:typeof record?.data.quote==='string'?record.data.quote:undefined,reason:typeof action.payload.reason==='string'?action.payload.reason:undefined,candidates:Array.isArray(action.payload.candidates)?action.payload.candidates:[],currentValue:record?.value,canEdit:!!(record&&app.records?.[record.type]?.parseValue)};
          }
          const result=action.result&&typeof action.result==='object'&&!Array.isArray(action.result)?action.result:undefined;
          model.dryRun=result?.dryRun===true||action.payload.dryRun===true;
          if(app.actions[action.kind]?.effect==='external'&&!model.dryRun)model.effectNotice='Review the exact proposal before approving. Live integrations may create an external effect.';
          const output=[...artifacts([action]).values()][0];
          if(output){model.downloadUrl=`/actions/${encodeURIComponent(id)}/download`;if(url.pathname.endsWith('/download'))return respond(output.content,200,output.mediaType,{'Content-Disposition':'attachment; filename="wraith-output.patch"'});}
        }
      } else if(url.pathname!=='/'){
        const output=artifacts(model.actions??[]).get(url.pathname);
        if(output)return respond(output.content,200,output.mediaType);
        model.page='error';model.error='No output is available yet. Replay the demo and confirm any uncertain deadlines.';status=404;
      }
      model.notice=url.searchParams.get('notice')??undefined;
      return respond(renderPage(model),status,'text/html; charset=utf-8',extra);
    }catch(error){
      if(model.page!=='action')model.page='error';model.error=error instanceof Error?error.message:'The operation could not be completed.';
      return respond(renderPage(model),400,'text/html; charset=utf-8',extra);
    }
  };
}
