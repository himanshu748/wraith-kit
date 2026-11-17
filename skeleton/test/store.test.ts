import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, appendFile, writeFile, utimes, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, hostname } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { FileStore } from '../src/node/store.js';
import { Engine, defineApp, emptySnapshot, verifyAudit } from '../src/core/index.js';
import type { Store } from '../src/core/index.js';
import { MemoryStore } from '../src/testing/index.js';
const folders: string[] = [];
afterEach(async () => { await Promise.all(folders.splice(0).map(p => rm(p, { recursive: true, force: true }))); });
async function temporary(): Promise<string> { const path = await mkdtemp(join(tmpdir(), 'wraith-store-')); folders.push(path); return path; }
async function advance(store: Store, marker: number): Promise<void> {
  for (let retries = 0; retries < 30; retries++) { const state = await store.read(); const revision = state.revision; state.revision++; state.meta = { ...state.meta, [String(marker)]: true }; if (await store.compareAndSwap(revision, state)) return; }
  throw new Error('Test exhausted CAS retries');
}
const sampleApp = () => defineApp({ id: 'sample', sources: [{ id: 'source', type: 'cli', accept: () => ({ key: 'test', payload: {} }) }], rules: [{ id: 'rule', priority: 1, description: 'propose', evaluate: () => ({ actions: [{ kind: 'review', target: 'one', payload: {} }] }) }], actions: { review: { describe: () => 'Review', execute: () => ({ ok: true }) } } });
for (const backend of ['memory', 'file'] as const) {
  describe(`${backend} store contract`, () => {
    it('atomically publishes a new revision and rejects stale state', async () => {
      const store = backend === 'file' ? new FileStore(await temporary()) : new MemoryStore();
      const first = await store.read(); const stale = await store.read();
      first.revision = 1; first.meta = { committed: true }; expect(await store.compareAndSwap(0, first)).toBe(true);
      stale.revision = 1; stale.meta = { lost: true }; expect(await store.compareAndSwap(0, stale)).toBe(false);
      expect((await store.read()).meta).toEqual({ committed: true });
    });
    it('P1/P6: interleaved engines dedupe complete outputs and preserve one audit chain', async () => {
      const folder = await temporary(); const first = backend === 'file' ? new FileStore(folder) : new MemoryStore(); const second = backend === 'file' ? new FileStore(folder) : first;
      const engineA = new Engine(sampleApp(), first, { auditKey: 'test-key' }); const engineB = new Engine(sampleApp(), second, { auditKey: 'test-key' });
      await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? engineA : engineB).ingest({ idempotencyKey: String(i % 3), source: 'source', kind: 'sample', subject: 'Sample', data: {} })));
      const state = await second.read(); expect(Object.keys(state.events)).toHaveLength(3); expect(Object.keys(state.actions)).toHaveLength(3); expect(verifyAudit(state.audit, 'test-key').valid).toBe(true);
    });
  });
}
describe('file journal crash boundaries', () => {
  it('ignores a torn tail on read, truncates it under lock before the next append', async () => {
    const store = new FileStore(await temporary()); await advance(store, 1);
    await appendFile(store.logPath, '{"partial":');
    const bytesBefore = (await stat(store.logPath)).size;
    expect((await store.read()).revision).toBe(1); expect((await stat(store.logPath)).size).toBe(bytesBefore);
    await advance(store, 2); expect((await store.read()).revision).toBe(2);
    const lines = (await readFile(store.logPath, 'utf8')).trim().split('\n'); expect(lines).toHaveLength(2); lines.forEach(line => expect(() => JSON.parse(line)).not.toThrow());
  });
  it('does not hide a corrupt complete line and ignores a corrupt snapshot cache', async () => {
    const store = new FileStore(await temporary()); await advance(store, 1);
    await writeFile(join(store.directory, 'snapshot.json'), '{bad cache'); expect((await store.read()).revision).toBe(1);
    await appendFile(store.logPath, '{bad complete line}\n'); await expect(store.read()).rejects.toThrow('Corrupt journal');
  });
  it('never steals an old live-owner lock and exits after a bounded wait', async () => {
    const store = new FileStore(await temporary(), { lockWaitMs: 25, staleLockMs: 1, pollMs: 2 });
    await writeFile(store.lockPath, JSON.stringify({ pid: process.pid, host: hostname(), token: 'alive' })); await utimes(store.lockPath, 0, 0);
    const state = emptySnapshot(); state.revision = 1;
    await expect(store.compareAndSwap(0, state)).rejects.toThrow('lock timeout'); expect((await store.read()).revision).toBe(0);
  });
  it('recovers a dead local owner after the stale threshold', async () => {
    const store = new FileStore(await temporary(), { lockWaitMs: 100, staleLockMs: 1, pollMs: 2 });
    const child = await promisify(execFile)(process.execPath, ['-e', 'process.stdout.write(String(process.pid))']);
    await writeFile(store.lockPath, JSON.stringify({ pid: Number(child.stdout), host: hostname(), token: 'dead' })); await utimes(store.lockPath, 0, 0);
    await advance(store, 1); expect((await store.read()).revision).toBe(1);
  });
  it('serializes separate processes on one directory', async () => {
    const directory = await temporary();
    const moduleUrl = new URL('../src/node/store.ts', import.meta.url).href;
    const program = `import { FileStore } from ${JSON.stringify(moduleUrl)}; const s=new FileStore(process.argv[1]); for(let n=0;n<5;n++){for(;;){const v=await s.read();const r=v.revision;v.revision++;v.meta={count:Number(v.meta?.count??0)+1};if(await s.compareAndSwap(r,v))break;}}`;
    await Promise.all([1, 2, 3].map(() => promisify(execFile)(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', program, directory], { cwd: process.cwd() })));
    expect((await new FileStore(directory).read()).meta?.count).toBe(15);
  });
});
