// WRAITH-SKELETON
import { createHttpHandler, type HttpOptions } from '../node/http.js';
export { DynamoStore } from './store.js';
export interface FunctionEvent { rawPath?:string;rawQueryString?:string;headers?:Record<string,string>;cookies?:string[];body?:string;isBase64Encoded?:boolean;requestContext?:{domainName:string;http:{method:string}};task?:string }
export function lambdaHandler(load:()=>Promise<HttpOptions>,reserveRequest:()=>Promise<boolean>){
  let options:Promise<HttpOptions>|undefined;
  return async(event:FunctionEvent)=>{
    if(event.task==='tick'){const opts=await(options??=load());return opts.engine.tick();}
    if(!(await reserveRequest()))return {statusCode:429,headers:{'content-type':'text/plain','retry-after':'3600'},body:'Daily demo request limit reached. Use the local version.'};
    const opts=await(options??=load());const handle=createHttpHandler({...opts,hosted:true});
    if(!event.requestContext)return {statusCode:400,body:'Invalid Function URL request'};
    const headers=new Headers(event.headers??{});if(event.cookies)headers.set('cookie',event.cookies.join('; '));
    const method=event.requestContext.http.method;
    const request=new Request(`https://${event.requestContext.domainName}${event.rawPath??'/'}${event.rawQueryString?'?'+event.rawQueryString:''}`,{method,headers,...(method!=='GET'&&method!=='HEAD'?{body:event.isBase64Encoded?Buffer.from(event.body??'','base64').toString('utf8'):event.body??''}:{})});
    const response=await handle(request);const outputHeaders=Object.fromEntries(response.headers);delete outputHeaders['set-cookie'];
    return {statusCode:response.status,headers:outputHeaders,cookies:response.headers.getSetCookie(),body:await response.text(),isBase64Encoded:false};
  };
}
