import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport,getDefaultEnvironment} from '@modelcontextprotocol/sdk/client/stdio.js';
import {createRuntime} from '../scripts/runtime.js';
// Test workers must never inherit live integrations from the developer shell.
for(const key of ['WRAITH_NOTICE_CONFIG','WRAITH_LLM_BASE_URL','WRAITH_LLM_MODEL','WRAITH_LLM_KEY','WRAITH_GITHUB_TOKEN'])delete process.env[key];
process.env.WRAITH_LLM_PROVIDER='none';process.env.WRAITH_LIVE_ISSUES='0';


it('serves six read-only MCP tools over real stdio and simulation leaves persisted bytes unchanged',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wraith-mcp-'));const data=join(dir,'.wraith');const config=join(dir,'config');
 const runtime=await createRuntime('todo-afterlife',{dataDir:data,configDir:config});
 const fixtureCredential=randomUUID();const event=runtime.demoEvents()[0];event.data.apiKey=fixtureCredential;await runtime.engine.ingest(event);
 const before=await runtime.store.read();const journal=await readFile(join(data,'journal.jsonl')).catch(()=>undefined);
 const client=new Client({name:'wraith-integration-test',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx','scripts/mcp.ts','todo-afterlife'],cwd:resolve('.'),env:{...getDefaultEnvironment(),WRAITH_DATA_DIR:data,WRAITH_CONFIG_DIR:config,WRAITH_LLM_PROVIDER:'none'},stderr:'pipe'});
 try{
  await client.connect(transport);const {tools}=await client.listTools();
  expect(tools.map(t=>t.name).sort()).toEqual(['explain_action','list_events','list_extension_points','list_pending_actions','simulate_event','verify_audit']);
  expect(tools.every(t=>t.annotations?.readOnlyHint)).toBe(true);
  const events=await client.callTool({name:'list_events',arguments:{limit:1}});expect(JSON.stringify(events)).toContain('todo-afterlife');expect(JSON.stringify(events)).not.toContain(fixtureCredential);expect(JSON.stringify(events)).toContain('[redacted]');
  const action=Object.values(before.actions)[0];expect(action).toBeTruthy();
  for(const [name,args] of [['list_pending_actions',{}],['explain_action',{id:action.id}],['simulate_event',{event:{...event,idempotencyKey:'unpersisted'}}],['verify_audit',{}],['list_extension_points',{}]] as const){const r=await client.callTool({name,arguments:args});expect(r.isError).not.toBe(true);expect(await readFile(join(data,'journal.jsonl'))).toEqual(journal);}
  const missing=await client.callTool({name:'explain_action',arguments:{id:'missing'}});expect(JSON.stringify(missing)).toContain('not found');
  const oversized=await client.callTool({name:'simulate_event',arguments:{event:{...event,subject:'x'.repeat(501)}}});expect(oversized.isError).toBe(true);
  const mutation=await client.callTool({name:'approve_action',arguments:{id:action.id}});expect(mutation.isError).toBe(true);
  expect(await runtime.store.read()).toEqual(before);
  if(journal)expect(await readFile(join(data,'journal.jsonl'))).toEqual(journal);
 }finally{await client.close();await rm(dir,{recursive:true,force:true});}
},30_000);
