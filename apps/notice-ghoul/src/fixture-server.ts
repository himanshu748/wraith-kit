import { createServer } from 'node:http';
import { noticeDemoSite } from './index.js';
const now=process.env.WRAITH_DEMO_DATE?new Date(process.env.WRAITH_DEMO_DATE):new Date();
if(!Number.isFinite(now.valueOf()))throw new Error('WRAITH_DEMO_DATE must be an ISO date');
const pages=noticeDemoSite(now);const port=Number(process.env.PORT??4319);
const server=createServer((request,response)=>{const page=pages[(request.url??'/').split('?')[0]!];response.writeHead(page?200:404,{'Content-Type':page?.type??'text/plain'});response.end(page?.content??'DEMO fixture not found');});
server.listen(port,'127.0.0.1',()=>{console.log(`Fictional DEMO notices: http://127.0.0.1:${port}/fixtures/demo.html`);console.log(`Frozen demo clock: ${now.toISOString()}`);});
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{server.closeAllConnections();server.close();});
