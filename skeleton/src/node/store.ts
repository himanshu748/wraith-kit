// WRAITH-SKELETON
import { mkdir, open, readFile, stat, unlink, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { clone, emptySnapshot, canonical } from '../core/primitives.js';
import type { Snapshot, Store } from '../core/types.js';

export interface FileStoreOptions { lockWaitMs?: number; staleLockMs?: number; pollMs?: number }
const code = (error: unknown): string | undefined => (error as NodeJS.ErrnoException)?.code;
interface Lock { pid: number; host: string; token: string; createdAt: number }

/** A single-machine durable journal. Read operations never repair or write files. */
export class FileStore implements Store {
  readonly directory: string;
  readonly logPath: string;
  readonly lockPath: string;
  private readonly options: Required<FileStoreOptions>;
  constructor(directory: string, options: FileStoreOptions = {}) {
    this.directory = directory; this.logPath = join(directory, 'journal.jsonl'); this.lockPath = join(directory, 'write.lock');
    this.options = { lockWaitMs: options.lockWaitMs ?? 5_000, staleLockMs: options.staleLockMs ?? 30_000, pollMs: options.pollMs ?? 10 };
  }
  private async journal(): Promise<{ snapshot: Snapshot; completeBytes: number; bytes: number }> {
    let data: Buffer;
    try { data = await readFile(this.logPath); } catch (error) { if (code(error) === 'ENOENT') return { snapshot: emptySnapshot(), completeBytes: 0, bytes: 0 }; throw error; }
    const boundary = data.lastIndexOf(10) + 1;
    const lines = data.subarray(0, boundary).toString('utf8').split('\n').slice(0, -1);
    let snapshot = emptySnapshot();
    for (let i = 0; i < lines.length; i++) {
      let entry: Snapshot;
      try { entry = JSON.parse(lines[i]) as Snapshot; } catch { throw new Error(`Corrupt journal at complete line ${i + 1}`); }
      if (!entry || entry.revision !== snapshot.revision + 1 || !entry.events || !entry.actions || !entry.records || !entry.deliveries || !entry.schedules || !Array.isArray(entry.audit)) throw new Error(`Invalid journal revision at line ${i + 1}`);
      snapshot = entry;
    }
    return { snapshot, completeBytes: boundary, bytes: data.length };
  }
  async read(): Promise<Snapshot> { return clone((await this.journal()).snapshot); }
  private async recoverStale(): Promise<void> {
    // Only one recovery process may inspect and remove a stale lock. Normal contenders
    // cannot acquire write.lock until it is removed; the recovering process never removes twice.
    const recoveryPath = join(this.directory, 'recovery.lock');
    let recovery;
    try { recovery = await open(recoveryPath, 'wx', 0o600); } catch (error) { if (code(error) === 'EEXIST') return; throw error; }
    try {
      let body: Lock; let age: number;
      try { body = JSON.parse(await readFile(this.lockPath, 'utf8')) as Lock; age = Date.now() - (await stat(this.lockPath)).mtimeMs; }
      catch (error) { if (code(error) === 'ENOENT' || error instanceof SyntaxError) return; throw error; }
      if (age < this.options.staleLockMs || body.host !== hostname() || !Number.isInteger(body.pid) || body.pid < 1) return;
      try { process.kill(body.pid, 0); return; } catch (error) { if (code(error) !== 'ESRCH') return; }
      // A dead owner's lock cannot legitimately release itself during this recovery.
      await unlink(this.lockPath);
    } finally { await recovery.close(); await unlink(recoveryPath).catch(error => { if (code(error) !== 'ENOENT') throw error; }); }
  }
  private async lock(): Promise<() => Promise<void>> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const deadline = Date.now() + this.options.lockWaitMs;
    const token = randomUUID();
    while (true) {
      try {
        const handle = await open(this.lockPath, 'wx', 0o600);
        try { await handle.writeFile(JSON.stringify({ pid: process.pid, host: hostname(), token, createdAt: Date.now() } satisfies Lock)); await handle.sync(); }
        catch (error) { await handle.close(); await unlink(this.lockPath); throw error; }
        await handle.close();
        return async () => {
          const current = JSON.parse(await readFile(this.lockPath, 'utf8')) as Lock;
          if (current.token !== token) throw new Error('Store lock ownership changed');
          await unlink(this.lockPath);
        };
      } catch (error) { if (code(error) !== 'EEXIST') throw error; }
      await this.recoverStale();
      if (Date.now() >= deadline) throw new Error('Store lock timeout; no state written');
      await delay(this.options.pollMs);
    }
  }
  async compareAndSwap(expectedRevision: number, next: Snapshot): Promise<boolean> {
    if (next.revision !== expectedRevision + 1) throw new Error('CAS must advance revision by one');
    const encoded = canonical(next) + '\n';
    const release = await this.lock();
    try {
      const current = await this.journal();
      if (current.snapshot.revision !== expectedRevision) return false;
      const file = await open(this.logPath, 'a+', 0o600);
      try {
        if (current.completeBytes < current.bytes) await file.truncate(current.completeBytes);
        await file.writeFile(encoded); await file.sync();
      } finally { await file.close(); }
      // This cache is deliberately dispensable: journal replay is authoritative.
      const temporary = join(this.directory, `snapshot-${randomUUID()}.tmp`);
      try {
        const cache = await open(temporary, 'wx', 0o600);
        try { await cache.writeFile(encoded); await cache.sync(); } finally { await cache.close(); }
        await rename(temporary, join(this.directory, 'snapshot.json'));
      } catch { await unlink(temporary).catch(() => undefined); /* commit already durable */ }
      return true;
    } finally { await release(); }
  }
}
