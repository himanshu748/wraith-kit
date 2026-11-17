import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { Engine, defineApp, hash, html, verifyAudit, retryDelay, ExecutionError } from '../src/core/index.js';
import type { ActionKind, App, EventInput, RecordUpsert, Rule } from '../src/core/index.js';
import { MemoryStore, fakeClock, fakeEffects } from '../src/testing/index.js';
import { pbtRuns } from '../../tests/pbt.js';
const key = 'test-audit-key-built-for-local-tests';
const event = (id = 'one', data = {}): EventInput => ({ idempotencyKey: id, source: 'input', kind: 'item', subject: 'Item', data, demo: true });
const action: ActionKind = { describe: p => String(p.message ?? 'Review'), execute: async p => ({ done: p }) };
function app(rules?: Rule[], kind: ActionKind = action): App {
  return defineApp({ id: 'example', sources: [{ id: 'input', type: 'cli', accept: raw => ({ key: hash(raw.body), payload: JSON.parse(raw.body) }) }], rules: rules ?? [{ id: 'review', priority: 1, description: 'Review input', evaluate: e => ({ actions: [{ kind: 'review', target: e.subject, payload: { message: 'Please review' } }] }) }], actions: { review: kind } });
}
const makeEngine = (application = app(), store = new MemoryStore()) => new Engine(application, store, { auditKey: key });

describe('core contracts', () => {
  it('validates definitions and freezes registries', () => {
    expect(() => defineApp({ ...app(), extra: true } as Parameters<typeof defineApp>[0])).toThrow('Unknown app field');
    expect(() => app([{ id: 'same', priority: 1, description: '', evaluate: () => ({}) }, { id: 'same', priority: 2, description: '', evaluate: () => ({}) }])).toThrow('Duplicate');
    expect(() => app(undefined, { ...action, safety: 'safe' })).toThrow('reason');
    expect(Object.isFrozen(app().rules)).toBe(true);
    expect(() => { (app().actions as Record<string, ActionKind>).other = action; }).toThrow();
  });
  // Validates: wraith-core 3.3, 5.3, 5.4, 7.1, 7.2
  it('P1: duplicate delivery permutations produce one complete event/action per identity', async () => {
    await fc.assert(fc.asyncProperty(fc.array(fc.integer({ min: 0, max: 10 }), { maxLength: 25 }), async ids => {
      const store = new MemoryStore(); const engines = [makeEngine(app(), store), makeEngine(app(), store)];
      await Promise.all(ids.map((id, i) => engines[i % 2].ingest(event(String(id)))));
      const snapshot = await store.read();
      expect(Object.keys(snapshot.events)).toHaveLength(new Set(ids).size);
      expect(Object.keys(snapshot.actions)).toHaveLength(new Set(ids).size);
      expect(verifyAudit(snapshot.audit, key).valid).toBe(true);
    }), { numRuns: pbtRuns() });
  });
  // Validates: wraith-core 6.1, 6.2
  it('P3/P4: rule registration order cannot change ordered trace or stop behaviour', async () => {
    await fc.assert(fc.asyncProperty(fc.shuffledSubarray([0, 1, 2, 3, 4], { minLength: 5, maxLength: 5 }), async order => {
      const rules: Rule[] = order.map(n => ({ id: `r${n}`, priority: Math.floor(n / 2), description: 'Ordered', evaluate: () => ({ findings: [{ severity: 'info', message: String(n) }], stop: n === 3 }) }));
      const result = await makeEngine(app(rules)).simulate(event());
      expect(result.trace.map(t => t.ruleId)).toEqual(['r0', 'r1', 'r2', 'r3']);
    }), { numRuns: pbtRuns() });
  });
  it('P2: concurrent ticks claim one executor and repeated approval is rejected', async () => {
    let calls = 0; const effect = fakeEffects();
    const application = app(undefined, { ...action, execute: async (payload, ctx) => { calls++; return effect.execute(payload, ctx); } });
    const store = new MemoryStore(); const engine = makeEngine(application, store); const other = makeEngine(application, store);
    const proposed = (await engine.ingest(event())).actions[0];
    await engine.tick(); expect(calls).toBe(0);
    await engine.decide(proposed.id, { type: 'approve' }, 'tester');
    await expect(engine.decide(proposed.id, { type: 'approve' }, 'tester')).rejects.toThrow();
    await Promise.all([engine.tick(), other.tick()]);
    expect(calls).toBe(1); expect(effect.effects.size).toBe(1);
    expect((await engine.snapshot()).actions[proposed.id].status).toBe('succeeded');
  });
  it('P5: safe kinds auto-approve, approval kinds do not', async () => {
    const safe = makeEngine(app(undefined, { ...action, safety: 'safe', reason: 'Writes only a requested local result' }));
    const protectedEngine = makeEngine();
    expect((await safe.ingest(event())).actions[0].status).toBe('auto-approved');
    expect((await protectedEngine.ingest(event())).actions[0].status).toBe('proposed');
  });
  it('P6: edits, interior deletion, reorder and retained-head truncation fail verification', async () => {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 8 }), async count => {
      const engine = makeEngine();
      for (let i = 0; i < count; i++) await engine.ingest(event(String(i)));
      const audit = (await engine.snapshot()).audit;
      const edited = structuredClone(audit); edited[0].type = 'tampered';
      expect(verifyAudit(edited, key).valid).toBe(false);
      expect(verifyAudit(audit.slice(1), key).valid).toBe(false);
      expect(verifyAudit([...audit].reverse(), key).valid).toBe(false);
      expect(verifyAudit(audit.slice(0, -1), key, { seq: audit.length, hash: audit.at(-1)!.hash }).valid).toBe(false);
    }), { numRuns: pbtRuns() });
  });
  it('P7: jitter stays bounded and Retry-After is a separate lower bound', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 50 }), fc.double({ min: 0, max: 1, noNaN: true }), (attempt, random) => {
      const delay = retryDelay(attempt, 100, 1_000, () => random);
      expect(delay).toBeGreaterThanOrEqual(0); expect(delay).toBeLessThanOrEqual(1_000);
      expect(retryDelay(attempt, 100, 1_000, () => random, 5_000)).toBe(5_000);
    }), { numRuns: pbtRuns() });
  });
  it('simulation is read-only and never executes or asks the advisor', async () => {
    const store = new MemoryStore(); const engine = makeEngine(app(), store); const before = await store.read();
    const simulated = await engine.simulate(event());
    expect(simulated.actions).toHaveLength(1); expect(await store.read()).toEqual(before);
  });
  it('escapes HTML, supports nested arrays and does not trust toString impostors', () => {
    expect(String(html`<div>${[html`<b>${'<x>'}</b>`, '<script>']}</div>`)).toBe('<div><b>&lt;x&gt;</b>&lt;script&gt;</div>');
    expect(String(html`${{ toString: () => '<b>bad</b>' }}`)).toBe('&lt;b&gt;bad&lt;/b&gt;');
  });
  it('keeps atomic event outputs on a failed CAS and preserves metadata', async () => {
    const store = new MemoryStore(); const original = store.compareAndSwap.bind(store); let conflicts = 2;
    store.compareAndSwap = async (revision, next) => conflicts-- > 0 ? false : original(revision, next);
    const engine = makeEngine(app(), store); await engine.ingest(event());
    expect(Object.keys((await engine.snapshot()).actions)).toHaveLength(1);
    const snapshot = await store.read(); snapshot.meta = { quota: 12 }; snapshot.revision++; await store.compareAndSwap(snapshot.revision - 1, snapshot);
    await engine.ingest(event('two')); expect((await engine.snapshot()).meta).toEqual({ quota: 12 });
  });
  it('stores over-cap events without partial outputs', async () => {
    const rules: Rule[] = [{ id: 'large', priority: 1, description: '', evaluate: () => ({ actions: ['a', 'b'].map(target => ({ kind: 'review', target, payload: {} })) }) }];
    const engine = new Engine(app(rules), new MemoryStore(), { auditKey: key, maxOutputs: 1 });
    const result = await engine.ingest(event()); expect(result.actions).toHaveLength(0); expect((await engine.snapshot()).audit.at(-1)?.type).toBe('event-output-cap');
  });
});

function recordApp(): App {
  return defineApp({ ...app(), records: { deadline: { parseValue: text => /^\d+$/.test(text) ? { value: Number(text) } : { error: 'Enter a number' } } }, rules: [{ id: 'record', priority: 1, description: 'Record value', evaluate: e => ({ records: [{ type: 'deadline', key: 'same', value: e.data.value, data: { note: e.data.note ?? '' }, confirm: { reason: 'Check date', candidates: [40, 50] } }] }) }] });
}
describe('versioned records and provenance', () => {
  it('rejects stale confirmation, validates edits and keeps human values through polls', async () => {
    const engine = makeEngine(recordApp());
    const first = (await engine.ingest(event('a', { value: 10 }))).actions[0];
    const second = (await engine.ingest(event('b', { value: 20 }))).actions[0];
    await expect(engine.decide(first.id, { type: 'approve' }, 'student')).rejects.toThrow('superseded');
    const before = await engine.snapshot();
    await expect(engine.decide(second.id, { type: 'edit', value: 'bad' }, 'student')).rejects.toThrow('number'); expect(await engine.snapshot()).toEqual(before);
    await engine.decide(second.id, { type: 'edit', value: '30' }, 'student');
    await engine.ingest(event('c', { value: 20, note: 'changed quote' }));
    const snapshot = await engine.snapshot(); const record = Object.values(snapshot.records)[0];
    expect(record.value).toBe(30); expect(record.sourcedBy).toBe('human'); expect(record.confirmation).toBe('confirmed');
    expect(Object.values(snapshot.actions).filter(a => a.status === 'proposed')).toHaveLength(1);
  });
  it('candidate picks use only stored values and rejection keeps a human replacement target', async () => {
    const engine = makeEngine(recordApp()); const first = (await engine.ingest(event('a', { value: 10 }))).actions[0];
    await expect(engine.decide(first.id, { type: 'pick', index: 99 }, 'student')).rejects.toThrow('Candidate');
    await engine.decide(first.id, { type: 'pick', index: 0 }, 'student');
    const second = (await engine.ingest(event('b', { value: 20 }))).actions[0];
    await engine.decide(second.id, { type: 'reject', reason: 'Keep mine' }, 'student');
    const record = Object.values((await engine.snapshot()).records)[0]; expect(record.value).toBe(40); expect(record.confirmation).toBe('confirmed');
  });
  it('P5: LLM-derived records always get confirmation; narrow queries taint safe outputs', async () => {
    const base = recordApp();
    const application = defineApp({ ...base, advisor: { mode: 'extract', prompt: e => e.data.ai ? 'Find value' : undefined, parse: input => input as never, fallback: () => [], verify: (value, quote) => Number(quote) === value }, rules: [{ id: 'record', priority: 1, description: '', evaluate: (e, ctx) => {
      const pending = ctx.state.records({ type: 'deadline', includeUnconfirmed: true, where: r => r.key === 'same' });
      const records: RecordUpsert[] = [{ type: 'deadline', key: e.data.ai ? 'same' : 'other', value: e.extracted?.[0]?.value ?? 5 }];
      return { records, actions: pending.length ? [{ kind: 'review', target: 'export', payload: {} }] : [] };
    } }], actions: { review: { ...action, safety: 'safe', reason: 'Local output' } } });
    const engine = new Engine(application, new MemoryStore(), { auditKey: key, advisor: { complete: async () => ({ provider: 'test', model: 'local', value: [{ value: 12, quote: '12' }] }) } });
    await engine.ingest(event('ai', { ai: true })); await engine.ingest(event('derived'));
    const snapshot = await engine.snapshot();
    for (const record of Object.values(snapshot.records)) { expect(record.sourcedBy).toBe('llm:test/local'); expect(Object.values(snapshot.actions).some(a => a.kind === 'confirm-record' && a.payload.recordId === record.id && a.status === 'proposed')).toBe(true); }
    expect(Object.values(snapshot.actions).find(a => a.kind === 'review')?.status).toBe('proposed');
  });
  it('default snapshot hides unconfirmed LLM records without mutating the store', async () => {
    const base = recordApp(); const store = new MemoryStore(); const engine = makeEngine(base, store);
    await engine.ingest(event('a', { value: 10 })); const snapshot = await store.read();
    Object.values(snapshot.records)[0].sourcedBy = 'llm:test/local'; snapshot.revision++; await store.compareAndSwap(snapshot.revision - 1, snapshot);
    const application = defineApp({ ...base, rules: [{ id: 'read', priority: 1, description: '', evaluate: (_e, ctx) => ({ findings: [{ severity: 'info', message: String(ctx.state.records().length) }] }) }] });
    expect((await makeEngine(application, store).simulate(event('query'))).trace[0].findings[0].message).toBe('0');
  });
});

describe('recoverable attempts and sources', () => {
  it('P2: unknown timeout calls lookup before retry and accepts the earlier effect', async () => {
    const clock = fakeClock(); let calls = 0; let lookups = 0;
    const application = app(undefined, { ...action, retry: { baseMs: 0 }, execute: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 20)); return { ref: 'created' }; }, lookup: async () => { lookups++; return { ref: 'created' }; } });
    const engine = new Engine(application, new MemoryStore(), { auditKey: key, clock: clock.now, executeTimeoutMs: 5 });
    const actionId = (await engine.ingest(event())).actions[0].id; await engine.decide(actionId, { type: 'approve' }, 'tester');
    await engine.tick(); expect((await engine.snapshot()).actions[actionId].status).toBe('retry-wait');
    clock.advance(1_000); await engine.tick(); expect(calls).toBe(1); expect(lookups).toBe(1); expect((await engine.snapshot()).actions[actionId].status).toBe('succeeded');
    await new Promise(resolve => setTimeout(resolve, 25)); expect((await engine.snapshot()).actions[actionId].result).toEqual({ ref: 'created' });
  });
  it('P7: attempts stop at the cap and manual retry starts an audited new allowance', async () => {
    const clock = fakeClock(); let calls = 0;
    const application = app(undefined, { ...action, retry: { maxAttempts: 2, baseMs: 0 }, execute: async () => { calls++; throw new ExecutionError('temporary'); } });
    const engine = new Engine(application, new MemoryStore(), { auditKey: key, clock: clock.now });
    const id = (await engine.ingest(event())).actions[0].id; await engine.decide(id, { type: 'approve' }, 'tester');
    for (let i = 0; i < 5; i++) await engine.tick(); expect(calls).toBe(2); expect((await engine.snapshot()).actions[id].status).toBe('dead');
    await engine.decide(id, { type: 'retry' }, 'tester'); await engine.tick(); expect((await engine.snapshot()).actions[id].totalAttempts).toBe(3);
  });
  it('keeps a failed expansion accepted and resumes without duplicate event outputs', async () => {
    let broken = true;
    const application = defineApp({ ...app(), sources: [{ id: 'input', type: 'webhook', accept: () => ({ key: 'delivery', payload: {} }), expand: () => { if (broken) throw new Error('offline'); return [event('a'), event('b')]; } }] });
    const engine = makeEngine(application); const accepted = await engine.accept('input', { body: '{}', headers: {}, path: '/' });
    expect(Object.keys((await engine.snapshot()).events)).toHaveLength(0);
    expect((await engine.tick()).errors).toEqual(['offline']); expect((await engine.snapshot()).deliveries[accepted.id].status).toBe('accepted');
    broken = false; await engine.tick(); await engine.accept('input', { body: '{}', headers: {}, path: '/' }); await engine.tick();
    expect(Object.keys((await engine.snapshot()).events)).toHaveLength(2); expect(Object.keys((await engine.snapshot()).actions)).toHaveLength(2);
  });
});

describe('defensive boundaries', () => {
  it('ignores caller-supplied extraction and provenance fields', async () => {
    const application = app([{ id: 'input', priority: 1, description: '', evaluate: e => ({ findings: [{ severity: 'info', message: String(e.extracted?.length ?? 0) }] }) }]);
    const result = await makeEngine(application).simulate({ ...event(), extracted: [{ value: 'injected', quote: '', provider: 'fake', model: 'fake', deterministic: true }] } as EventInput);
    expect(result.trace[0].findings[0].message).toBe('0');
  });
  it('unknown prototype property names cannot be treated as action kinds', async () => {
    const application = app([{ id: 'input', priority: 1, description: '', evaluate: () => ({ actions: [{ kind: 'toString', target: 'bad', payload: {} }] }) }]);
    const engine = makeEngine(application); expect((await engine.ingest(event())).actions).toHaveLength(0);
    expect((await engine.snapshot()).audit.some(a => a.type === 'action-kind-rejected')).toBe(true);
  });
  it('P5 generated decisions never execute a rejected or undecided action', async () => {
    await fc.assert(fc.asyncProperty(fc.array(fc.constantFrom('approve', 'reject', 'tick'), { maxLength: 30 }), async commands => {
      let effects = 0; let model: 'proposed' | 'approved' | 'rejected' | 'succeeded' = 'proposed';
      const engine = makeEngine(app(undefined, { ...action, execute: () => { effects++; return {}; } }));
      const id = (await engine.ingest(event())).actions[0].id;
      for (const command of commands) {
        if (command === 'tick') { await engine.tick(); if (model === 'approved') model = 'succeeded'; }
        else if (model === 'proposed') { await engine.decide(id, command === 'approve' ? { type: 'approve' } : { type: 'reject', reason: 'No' }, 'tester'); model = command === 'approve' ? 'approved' : 'rejected'; }
        else await expect(engine.decide(id, command === 'approve' ? { type: 'approve' } : { type: 'reject', reason: 'No' }, 'tester')).rejects.toThrow();
        expect((await engine.snapshot()).actions[id].status).toBe(model);
        expect(effects).toBe(model === 'succeeded' ? 1 : 0);
      }
    }), { numRuns: pbtRuns() });
  });
  it('lookup failures withhold a second external write', async () => {
    const clock = fakeClock(); let writes = 0;
    const application = app(undefined, { ...action, retry: { baseMs: 0 }, execute: () => { writes++; throw new ExecutionError('Connection lost after send', true, undefined, true); }, lookup: async () => { throw new Error('lookup unavailable'); } });
    const engine = new Engine(application, new MemoryStore(), { auditKey: key, clock: clock.now });
    const id = (await engine.ingest(event())).actions[0].id; await engine.decide(id, { type: 'approve' }, 'tester');
    await engine.tick(); clock.advance(1_000); await engine.tick(); expect(writes).toBe(1); expect((await engine.snapshot()).actions[id].lastError).toContain('withheld');
  });
});

describe('explicit demo reset', () => {
  it('keeps real objects, quota metadata and the audit prefix, and refuses an active attempt', async () => {
    const store = new MemoryStore(); const engine = makeEngine(app(), store);
    await engine.ingest(event('demo'));
    await engine.ingest({ ...event('real'), demo: false });
    const before = await store.read(); const demo = Object.values(before.actions).find(a => a.demo)!;
    const state = structuredClone(before); state.actions[demo.id].status = 'executing'; state.revision++; state.meta = { quota: 9 }; await store.compareAndSwap(before.revision, state);
    await expect(engine.resetDemo('owner')).rejects.toThrow('executing');
    const expired = await store.read(); expired.actions[demo.id].status = 'dead'; expired.revision++; await store.compareAndSwap(expired.revision - 1, expired);
    const reset = await engine.resetDemo('owner'); expect(reset.removed).toBe(2);
    const after = await engine.snapshot(); expect(Object.values(after.events).map(e => e.idempotencyKey)).toEqual(['real']); expect(Object.values(after.actions)).toHaveLength(1); expect(after.meta).toEqual({ quota: 9 });
    expect(after.audit.slice(0, before.audit.length)).toEqual(before.audit); expect(after.audit.at(-1)?.type).toBe('demo-reset'); expect((await engine.verifyAudit()).valid).toBe(true);
  });
});

describe('advisor and poll failure contracts', () => {
  it('invalid reword output uses deterministic fallback without changing executable payload', async () => {
    const application = defineApp({ ...app(), advisor: { mode: 'reword', prompt: () => 'Reword', parse: value => value as never, fallback: (_event, actions) => actions.map((_a, index) => ({ index, text: 'Deterministic wording' })) } });
    const engine = new Engine(application, new MemoryStore(), { auditKey: key, advisor: { complete: async () => ({ provider: 'test', model: 'local', value: [{ index: 0, text: 'Injected', kind: 'unsafe' }] }) } });
    const action = (await engine.ingest(event())).actions[0];
    expect(action.kind).toBe('review'); expect(action.payload).toEqual({ message: 'Please review' }); expect(action.suggestion?.text).toBe('Deterministic wording'); expect(action.suggestion?.by).toBe('rules');
  });
  it('failed polls retain validators but honor the minimum interval', async () => {
    const clock = fakeClock(); let polls = 0;
    const application = defineApp({ ...app(), sources: [{ id: 'remote', type: 'poll', intervalMs: 60_000, expand: () => { polls++; throw new Error('offline'); } }] });
    const engine = new Engine(application, new MemoryStore(), { auditKey: key, clock: clock.now });
    await engine.tick(); await engine.tick(); expect(polls).toBe(1); clock.advance(60_001); await engine.tick(); expect(polls).toBe(2);
  });
});
