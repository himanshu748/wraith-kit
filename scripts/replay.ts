import { createHmac } from 'node:crypto';
import { appId, createRuntime } from './runtime.js';
const id=appId(process.argv[2]);const runtime=await createRuntime(id);
if(id==='todo-afterlife'&&process.argv.includes('--webhook')){
  const body=JSON.stringify({ref:'refs/heads/main',before:'0'.repeat(40),after:'1'.repeat(40),repository:{full_name:process.env.WRAITH_GITHUB_REPO??'himanshu748/wraith-kit-sandbox'},pusher:{name:'demo-maintainer'},commits:[]});
  const response=await fetch(`http://127.0.0.1:${process.env.PORT??4317}/webhooks/github`,{method:'POST',body,headers:{'Content-Type':'application/json','X-GitHub-Event':'push','X-GitHub-Delivery':'wraith-fixture-webhook','X-Hub-Signature-256':`sha256=${createHmac('sha256',runtime.webhookSecret!).update(body).digest('hex')}`}});
  console.log(`Signed webhook intake: HTTP ${response.status}. GitHub expansion requires configured access; use default replay for offline fixtures.`);if(!response.ok)process.exitCode=1;
}else{for(const event of runtime.demoEvents())await runtime.engine.ingest(event);await runtime.engine.tick();console.log('Demo replay complete; repeated event keys are deduplicated. Open the approval queue.');}
