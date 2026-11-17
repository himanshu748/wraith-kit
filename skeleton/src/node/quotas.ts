// WRAITH-SKELETON
import type { Store, JsonObject } from '../core/index.js';
/** Operational counters share the same revision lock as domain writes. UTC days. */
export async function reserveQuota(store: Store, namespace: string, key: string, day: string, limit: number): Promise<boolean> {
  if (!Number.isInteger(limit) || limit < 0) throw new Error('Invalid quota');
  for (let attempt = 0; attempt < 20; attempt++) {
    const state = await store.read();
    const meta = state.meta ?? {};
    const previous = meta[namespace];
    const counter: JsonObject = previous && typeof previous === 'object' && !Array.isArray(previous) && previous.day === day ? previous : { day, keys: [] };
    const keys = Array.isArray(counter.keys) ? counter.keys.filter((x): x is string => typeof x === 'string') : [];
    if (keys.includes(key)) return true;
    if (keys.length >= limit) return false;
    state.meta = { ...meta, [namespace]: { day, keys: [...keys, key] } };
    if (await store.compareAndSwap(state.revision, { ...state, revision: state.revision + 1 })) return true;
  }
  throw new Error('Quota contention; retry later');
}
