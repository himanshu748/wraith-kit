import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Engine } from '@wraith-kit/skeleton/core';
import { FileStore, privateSecret } from '@wraith-kit/skeleton/node';
import { createTodoApp, eventsFromDiff } from './index.js';
import { classify } from './comments.js';

/** Advisory entrypoint: no tick, fetch, provider, executor or remote Git command. */
export async function checkStagedDiff():Promise<number>{
  try {
    const {stdout:diff}=await promisify(execFile)('git',['diff','--cached','--no-ext-diff','--no-color','--unified=3'],{maxBuffer:1_000_000,timeout:10_000});
    const repo=process.env.WRAITH_GITHUB_REPO??'local/repository';const owner=process.env.WRAITH_OWNER;
    const events=eventsFromDiff(diff,repo,'cli',owner);
    if(!events.length){process.stdout.write('todo-afterlife-precommit: no added TODO comments.\n');return 0;}
    const key=await privateSecret('todo-afterlife-audit',process.env.WRAITH_CONFIG_DIR);
    const store=new FileStore(process.env.WRAITH_DATA_DIR??resolve('.wraith','todo-afterlife'),{lockWaitMs:5000});
    const engine=new Engine(createTodoApp({repo,owner}),store,{auditKey:key.value,advisorOff:true,http:async()=>{throw new Error('Network is disabled in the pre-commit check');}});
    let vague=0;
    for(const event of events){const result=await engine.ingest(event);if(classify(String(event.data.text)).vague)vague++;for(const action of result.actions.filter(a=>a.kind==='rewrite'))process.stdout.write(`${event.subject}\n${action.preview}\n`);}
    process.stdout.write(`todo-afterlife-precommit: ${events.length} comment(s), ${vague} vague. Proposals saved to the local approval queue; no files changed.\n`);
    return process.env.WRAITH_TODO_BLOCK==='1'&&vague>0?2:0;
  }catch(error){process.stdout.write(`todo-afterlife-precommit: warning: ${error instanceof Error?error.message:'check failed'}; not blocking the commit.\n`);return 0;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)process.exitCode=await checkStagedDiff();
