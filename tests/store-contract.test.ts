import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { FileStore } from '../skeleton/src/node/store.js';
import { DynamoStore } from '../skeleton/src/aws/store.js';
import { Engine, defineApp, emptySnapshot, verifyAudit, type ActionKind, type EventInput, type Json, type Rule, type Store } from '@wraith-kit/skeleton/core';
import { fakeClock } from '../skeleton/src/testing/index.js';
import { pbtRuns } from './pbt.js';

const endpoint = process.env.WRAITH_DYNAMODB_ENDPOINT;
const auditKey = 'local-contract-key';
const propertyRuns = pbtRuns() ?? 20;
const input = (id: number | string): EventInput => ({ source: 'cli', kind: 'event', subject: String(id), idempotencyKey: String(id), data: {} });
function application(kind: ActionKind = { describe: () => 'Write', execute: () => ({ ok: true }) }, rules?: Rule[]) {
  return defineApp({
    id: 'contract', sources: [{ id: 'cli', type: 'cli', accept: raw => ({ key: raw.body, payload: {} }) }],
    rules: rules ?? [{ id: 'act', priority: 1, description: 'Propose', evaluate: event => ({ actions: [{ kind: 'write', target: event.subject, payload: {} }] }) }],
    actions: { write: kind },
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
/** Force both real adapters to attempt their first CAS from the same revision. */
function raceFirstCommit(stores: Store[]): { stores: Store[]; conflicts: () => number } {
  const gate = deferred<void>(); let arrivals = 0; let conflicts = 0;
  return {
    conflicts: () => conflicts,
    stores: stores.map(store => {
      let first = true;
      return {
        read: () => store.read(),
        compareAndSwap: async (revision, next) => {
          if (first) { first = false; if (++arrivals === stores.length) gate.resolve(); await gate.promise; }
          const accepted = await store.compareAndSwap(revision, next);
          if (!accepted) conflicts++;
          return accepted;
        },
      };
    }),
  };
}

for (const backend of ['file', 'dynamodb'] as const) {
  describe.skipIf(backend === 'dynamodb' && !endpoint)(`${backend} real store contract`, () => {
    let client: DynamoDBClient;
    beforeAll(() => {
      if (backend !== 'dynamodb') return;
      if (!endpoint || !/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error('Local endpoint required');
      client = new DynamoDBClient({ endpoint, region: 'local', credentials: { accessKeyId: 'local', secretAccessKey: 'local' } });
    });
    afterAll(() => client?.destroy());

    // Each property case has a fresh journal/table, so large explicit run counts do
    // not turn this correctness test into the adapter's cumulative capacity test.
    async function withStores(work: (first: Store, second: Store) => Promise<void>): Promise<void> {
      if (backend === 'file') {
        const dir = await mkdtemp(join(tmpdir(), 'wraith-store-contract-'));
        try { await work(new FileStore(dir), new FileStore(dir)); }
        finally { await rm(dir, { recursive: true, force: true }); }
      } else {
        const table = `wraith-test-${randomUUID()}`;
        await client.send(new CreateTableCommand({ TableName: table, KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }, { AttributeName: 'sk', KeyType: 'RANGE' }], AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }, { AttributeName: 'sk', AttributeType: 'N' }], BillingMode: 'PAY_PER_REQUEST' }));
        try { await work(new DynamoStore(table, DynamoDBDocumentClient.from(client)), new DynamoStore(table, DynamoDBDocumentClient.from(client))); }
        finally { await client.send(new DeleteTableCommand({ TableName: table })); }
      }
    }

    it('atomically deduplicates concurrent intake and preserves approval before one execution', async () => {
      await withStores(async (first, second) => {
        let writes = 0;
        const app = application({ describe: () => 'Write', execute: () => { writes++; return { ok: true }; } });
        const a = new Engine(app, first, { auditKey }); const b = new Engine(app, second, { auditKey });
        await Promise.all([a.ingest(input('one')), b.ingest(input('one'))]);
        let state = await a.snapshot();
        expect(Object.keys(state.events)).toHaveLength(1); expect(Object.keys(state.actions)).toHaveLength(1);
        const action = Object.values(state.actions)[0];
        await Promise.all([a.tick(), b.tick()]); expect(writes).toBe(0);
        await a.decide(action.id, { type: 'approve' }, 'test');
        const results = await Promise.all([a.tick(), b.tick()]);
        results.forEach(result => expect(result.errors).toEqual([]));
        state = await b.snapshot(); expect(state.actions[action.id].status).toBe('succeeded'); expect(writes).toBe(1);
        expect((await a.verifyAudit()).valid).toBe(true);
      });
    }, 30_000);

    // P1/P3/P4/P6 run through persistence, not simulate() or MemoryStore.
    it(`P1/P3/P4: ${propertyRuns} generated duplicate/permutation cases persist canonical rule order`, async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 6 }),
        fc.shuffledSubarray([0, 1, 2, 3, 4], { minLength: 5, maxLength: 5 }),
        async (ids, order) => withStores(async (first, second) => {
          const rules: Rule[] = order.map(index => ({
            id: `r${index}`, priority: Math.floor(index / 2), description: 'Canonical order with stop',
            evaluate: event => ({ findings: [{ severity: 'info', message: `Rule ${index}` }], stop: index === 3, ...(index === 0 ? { actions: [{ kind: 'write', target: event.subject, payload: {} }] } : {}) }),
          }));
          const app = application(undefined, rules);
          const engines = [new Engine(app, first, { auditKey }), new Engine(app, second, { auditKey })];
          const duplicated = ids.flatMap(id => [id, id]);
          // Two independent adapters contend without exhausting an unbounded queue.
          for (let offset = 0; offset < duplicated.length; offset += 2) {
            await Promise.all(duplicated.slice(offset, offset + 2).map((id, i) => engines[i].ingest(input(id))));
          }
          const state = await second.read(); const unique = new Set(ids);
          expect(Object.values(state.events).map(event => Number(event.idempotencyKey)).sort()).toEqual([...unique].sort());
          expect(Object.keys(state.actions)).toHaveLength(unique.size);
          expect(state.audit.filter(entry => entry.type === 'event-processed')).toHaveLength(unique.size);
          expect(state.audit.filter(entry => entry.type === 'action-proposed')).toHaveLength(unique.size);
          for (const action of Object.values(state.actions)) {
            expect(action.trace.map(trace => trace.ruleId)).toEqual(['r0', 'r1', 'r2', 'r3']);
            expect(action.trace.at(-1)?.stop).toBe(true); expect(action.status).toBe('proposed');
            expect(state.events[action.eventId!].subject).toBe(action.target);
          }
          expect(verifyAudit(state.audit, auditKey).valid).toBe(true);
          const before = await first.read();
          await Promise.all(engines.map(engine => engine.ingest(input(ids[0]))));
          expect(await second.read()).toEqual(before);
        }),
      ), { numRuns: propertyRuns });
    }, 120_000);

    it('retries a forced lost CAS without losing outputs, metadata or interleaved audit entries', async () => {
      await withStores(async (first, second) => {
        const initial = emptySnapshot(); initial.revision = 1; initial.meta = { quota: 7 };
        expect(await first.compareAndSwap(0, initial)).toBe(true);
        const raced = raceFirstCommit([first, second]);
        const app = application(); const engines = raced.stores.map(store => new Engine(app, store, { auditKey }));
        await Promise.all(engines.map((engine, index) => engine.ingest(input(index))));
        expect(raced.conflicts()).toBeGreaterThanOrEqual(1);
        const before = await first.read(); const actions = Object.values(before.actions);
        expect(actions).toHaveLength(2); expect(before.audit).toHaveLength(4);
        await Promise.all(actions.map((action, index) => engines[index].decide(action.id, { type: 'approve' }, `actor-${index}`)));
        const ticks = await Promise.all(engines.map(engine => engine.tick()));
        ticks.forEach(result => expect(result.errors).toEqual([]));
        const after = await second.read();
        expect(after.meta).toEqual({ quota: 7 }); expect(after.audit.slice(0, before.audit.length)).toEqual(before.audit);
        expect(after.audit.map(entry => entry.seq)).toEqual(Array.from({ length: after.audit.length }, (_, i) => i + 1));
        expect(verifyAudit(after.audit, auditKey).valid).toBe(true);
        for (const action of actions) {
          expect(after.actions[action.id].status).toBe('succeeded');
          expect(after.audit.filter(entry => entry.references.includes(action.id)).map(entry => entry.type)).toEqual(['action-proposed', 'approved', 'executing', 'succeeded']);
        }
      });
    }, 30_000);

    it('recovers an expired persisted lease using lookup and ignores the original late result', async () => {
      await withStores(async (first, second) => {
        const clock = fakeClock(); const started = deferred<void>(); const delayed = deferred<Json>();
        const effects = new Map<string, Json>(); let writes = 0; let lookups = 0;
        const app = application({
          describe: () => 'Recover write',
          execute: (_payload, ctx) => { writes++; effects.set(ctx.idempotencyKey, { reference: 'existing-effect' }); started.resolve(); return delayed.promise; },
          lookup: async (_payload, ctx) => { lookups++; return effects.get(ctx.idempotencyKey); },
        });
        const options = { auditKey, clock: clock.now, executeTimeoutMs: 10_000, leaseMarginMs: 1_000 };
        const original = new Engine(app, first, options); const recovery = new Engine(app, second, options);
        const action = (await original.ingest(input('lease'))).actions[0];
        await original.decide(action.id, { type: 'approve' }, 'tester');
        const inFlight = original.tick();
        try {
          await started.promise;
          expect((await second.read()).actions[action.id].status).toBe('executing');
          expect((await recovery.tick()).executed).toBe(0); expect(lookups).toBe(0);
          clock.advance(11_001);
          expect((await recovery.tick()).errors).toEqual([]);
          const state = await second.read();
          expect(state.actions[action.id].status).toBe('succeeded');
          expect(state.actions[action.id].result).toEqual({ reference: 'existing-effect' });
          expect(state.actions[action.id].totalAttempts).toBe(2);
          expect(writes).toBe(1); expect(lookups).toBe(1);
        } finally { delayed.resolve({ reference: 'stale-result' }); await inFlight; }
        const final = await first.read();
        expect(final.actions[action.id].result).toEqual({ reference: 'existing-effect' });
        expect(final.audit.filter(entry => entry.type === 'lease-expired')).toHaveLength(1);
        expect(final.audit.filter(entry => entry.type === 'late-result-ignored')).toHaveLength(1);
        expect(verifyAudit(final.audit, auditKey).valid).toBe(true);
      });
    }, 30_000);

    it('rejects a stale CAS without partially replacing any state or audit', async () => {
      await withStores(async (first, second) => {
        const engine = new Engine(application(), first, { auditKey }); await engine.ingest(input('retained'));
        const state = await first.read(); const stale = emptySnapshot(); stale.revision = state.revision; stale.meta = { attempted: 'overwrite' };
        expect(await second.compareAndSwap(state.revision - 1, stale)).toBe(false);
        expect(await first.read()).toEqual(state);
      });
    });
  });
}
