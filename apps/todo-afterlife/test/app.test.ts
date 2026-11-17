import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Engine, type ExecuteContext } from '@wraith-kit/skeleton/core';
import { MemoryStore } from '@wraith-kit/skeleton/testing';
import { pbtRuns } from '../../../tests/pbt.js';
import { classify, extractTodos, patchFor, rewrite } from '../src/comments.js';
import { createTodoApp, todoDemoEvents } from '../src/index.js';
import { createIssue, fetchPatches, listIssues, verifyPush } from '../src/github.js';

const diff=(lines:string[],offset=1)=>`--- a/src/app.ts\n+++ b/src/app.ts\n@@ -0,0 +${offset},${lines.length} @@\n${lines.map(s=>`+// TODO: ${s}`).join('\n')}\n`;
const fetchJson=(value:unknown,status=200)=>async()=>new Response(JSON.stringify(value),{status});
const ctx=(http:typeof fetch):ExecuteContext=>({idempotencyKey:'action-one',signal:new AbortController().signal,clock:'2026-11-17T10:00:00.000Z',http});
describe('TODO Afterlife extension',()=>{
  // Validates: todo-afterlife 3.1, 3.2, 3.4
  it('TA-P1 extracts exactly added generated comment lines, ignoring deletions and context',()=>{
    fc.assert(fc.property(fc.array(fc.stringMatching(/^[a-z ]{1,30}$/),{minLength:1,maxLength:20}),lines=>{
      const result=extractTodos(diff(lines)+'-// TODO: deleted\n // TODO: context\n','owner/repo');
      expect(result.map(r=>r.text)).toEqual(lines.map(s=>s.trim()));
      expect(result).toHaveLength(lines.length);
    }),{numRuns:pbtRuns()});
  });
  it('distinguishes repeated occurrences and preserves ordinal identity when lines move',()=>{
    const a=extractTodos(diff(['later','later']), 'owner/repo');const b=extractTodos(diff(['later','later'],40),'owner/repo');
    expect(new Set(a.map(i=>i.key)).size).toBe(2);expect(a.map(i=>i.key)).toEqual(b.map(i=>i.key));
  });
  // Validates: todo-afterlife 4.2, 4.3
  it('TA-P2 classification ignores case and whitespace; markers are not comment text',()=>{
    fc.assert(fc.property(fc.constantFrom('fix this','later','temp','cleanup','hack','???'),fc.integer({min:1,max:5}),(phrase,spaces)=>{
      expect(classify(phrase).vague).toBe(true);expect(classify(phrase.toUpperCase().replaceAll(' ',' '.repeat(spaces))).vague).toBe(true);
    }),{numRuns:pbtRuns()});
    const result=extractTodos('+++ b/a.ts\n@@ -0,0 +1 @@\n+// HACK:\n','r/p');expect(classify(result[0]!.text).vague).toBe(false);
  });
  // Validates: todo-afterlife 6.1, 6.2, 6.4, 6.5
  it('TA-P3 fallback passes all rules with an owner and only lacks owner without one',()=>{
    fc.assert(fc.property(fc.stringMatching(/^[a-z]{1,20}$/),fc.boolean(),(name,hasOwner)=>{
      const item=extractTodos(diff(['fix this later']), 'owner/repo')[0]!;
      const output=rewrite(item,hasOwner?name:undefined);const found=classify(output.text);
      expect(found).toEqual({vague:false,short:false,noOwner:!hasOwner,noAnchor:false,retire:false});expect(output.incomplete).toBe(!hasOwner);
    }),{numRuns:pbtRuns()});
  });
  it('produces contextual patches without applying them',()=>{
    const item=extractTodos(diff(['later']), 'owner/repo')[0]!;const patch=patchFor(item,'TODO(@mira): Add regression coverage when the request fails.');
    expect(patch).toContain('-// TODO: later');expect(patch).toContain('+// TODO(@mira)');expect(patchFor(item,null)).toContain('+1,0 @@');
  });
  it('runs the same core, dedupes input, and requires approval before any outcome',async()=>{
    const engine=new Engine(createTodoApp({owner:'mira'}),new MemoryStore(),{auditKey:'test-key'});const event=todoDemoEvents()[0]!;
    await engine.ingest(event);await engine.ingest(event);await engine.tick();let state=await engine.snapshot();
    expect(Object.values(state.events)).toHaveLength(1);expect(Object.values(state.actions)).toHaveLength(2);expect(Object.values(state.actions).every(a=>a.status==='proposed')).toBe(true);
    const action=Object.values(state.actions).find(a=>a.kind==='rewrite')!;await engine.decide(action.id,{type:'approve'},'test-user');await engine.tick();state=await engine.snapshot();expect(state.actions[action.id]?.status).toBe('succeeded');expect(JSON.stringify(state.actions[action.id]?.result)).toContain('text/x-diff');
  });
  it('rejects bad signatures and a signed payload for another repository before expansion',()=>{
    const secret='test-secret';const body=JSON.stringify({repository:{full_name:'owner/repo'}});
    const raw={body,path:'/webhooks/github',headers:{'x-github-event':'push','x-github-delivery':'delivery','x-hub-signature-256':'invalid'}};
    expect(()=>verifyPush(raw,{repo:'owner/repo',webhookSecret:secret})).toThrow('signature');raw.headers['x-hub-signature-256']=`sha256=${createHmac('sha256',secret).update(body).digest('hex')}`;
    expect(verifyPush(raw,{repo:'owner/repo',webhookSecret:secret})).toHaveProperty('repository');expect(()=>verifyPush(raw,{repo:'other/repo',webhookSecret:secret})).toThrow('repository');
  });
  it('reports unavailable comparison patches as incomplete, never a clean scan',async()=>{
    const result=await fetchPatches({before:'a'.repeat(40),after:'b'.repeat(40)},{repo:'owner/repo'},fetchJson({files:[{filename:'image.bin'}]}) as typeof fetch,new AbortController().signal);
    expect(result.diff).toBe('');expect(result.incomplete).toHaveLength(1);
  });
  it('looks through closed issues before creation and never creates when quota is unavailable',async()=>{
    const config={repo:'owner/repo',token:'test-only',liveIssues:true,reserveIssueSlot:async()=>true};let calls=0;
    const http=(async()=>{calls++;return new Response(JSON.stringify([{number:4,title:'existing',body:'<!-- wraith-action:action-one -->',html_url:'https://github.com/owner/repo/issues/4',state:'closed'}]));}) as typeof fetch;
    expect(await createIssue({title:'test',body:'body'},config,ctx(http))).toMatchObject({number:4,recovered:true});expect(calls).toBe(1);
    await expect(createIssue({title:'test',body:'body'},{...config,reserveIssueSlot:async()=>false},ctx(fetchJson([]) as typeof fetch))).rejects.toThrow('cap');
  });
  it('marks malformed successful write responses as unknown outcomes',async()=>{
    const http=(async(_url:Parameters<typeof fetch>[0],init?:RequestInit)=>init?.method==='POST'?new Response('partial-json',{status:201}):new Response('[]')) as typeof fetch;
    await expect(createIssue({title:'test',body:'body'},{repo:'owner/repo',token:'test-only',liveIssues:true,reserveIssueSlot:async()=>true},ctx(http))).rejects.toMatchObject({unknownOutcome:true});
  });
  it('refuses incomplete pagination and defaults to no-write dry run',async()=>{
    const page=Array.from({length:100},(_,i)=>({number:i,title:'x',body:'',html_url:'https://github.com/owner/repo/issues/1'}));
    await expect(listIssues({repo:'owner/repo'},fetchJson(page) as typeof fetch,new AbortController().signal)).rejects.toThrow('incomplete');
    const forbidden=(async()=>{throw new Error('network forbidden');}) as typeof fetch;
    expect(await createIssue({title:'example',body:'demo'},{repo:'owner/repo'},ctx(forbidden))).toMatchObject({dryRun:true});
  });
});
