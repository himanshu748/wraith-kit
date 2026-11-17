import { expect,it } from 'vitest';
import { Engine } from '@wraith-kit/skeleton/core';
import { MemoryStore,fakeClock } from '@wraith-kit/skeleton/testing';
import { app,demoEvent } from '../src/index.js';
it('deduplicates requests and executes the task only after approval',async()=>{
  const clock=fakeClock();const engine=new Engine(app,new MemoryStore(),{auditKey:'test-only-key',clock:clock.now});
  await engine.ingest(demoEvent());await engine.ingest(demoEvent());await engine.tick();
  const state=await engine.snapshot();expect(Object.values(state.events)).toHaveLength(1);
  const actions=Object.values(state.actions);expect(actions).toHaveLength(1);const action=actions[0]!;
  expect(action.status).toBe('proposed');expect(action.result).toBeUndefined();
  await engine.decide(action.id,{type:'approve'},'test-person');await engine.tick();
  const result=(await engine.snapshot()).actions[action.id]!;
  expect(result.status).toBe('succeeded');expect(JSON.stringify(result.result)).toContain('Replace the printer paper');
  await engine.tick();expect((await engine.snapshot()).actions[action.id]?.totalAttempts).toBe(1);
});
