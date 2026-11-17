// WRAITH-SKELETON
import { clone, emptySnapshot } from '../core/primitives.js';
import type { Snapshot, Store } from '../core/types.js';
export class MemoryStore implements Store {
  private state: Snapshot;
  constructor(initial: Snapshot = emptySnapshot()) { this.state = clone(initial); }
  async read(): Promise<Snapshot> { return clone(this.state); }
  async compareAndSwap(expectedRevision: number, next: Snapshot): Promise<boolean> {
    if (next.revision !== expectedRevision + 1) throw new Error('CAS must advance revision by one');
    if (this.state.revision !== expectedRevision) return false;
    this.state = clone(next); return true;
  }
}
export function fakeClock(start = '2026-11-17T10:00:00.000Z'): { now: () => Date; advance: (ms: number) => void } {
  let time = Date.parse(start);
  return { now: () => new Date(time), advance: ms => { time += ms; } };
}
export function fakeEffects(): { execute: (payload: unknown, ctx: { idempotencyKey: string }) => Promise<{ reference: string }>; lookup: (payload: unknown, ctx: { idempotencyKey: string }) => Promise<{ reference: string } | undefined>; effects: Map<string, { reference: string }> } {
  const effects = new Map<string, { reference: string }>();
  return { effects, execute: async (_payload, ctx) => { if (!effects.has(ctx.idempotencyKey)) effects.set(ctx.idempotencyKey, { reference: `effect-${effects.size + 1}` }); return effects.get(ctx.idempotencyKey)!; }, lookup: async (_payload, ctx) => effects.get(ctx.idempotencyKey) };
}
