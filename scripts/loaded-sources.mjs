// @ts-check
// Node 22 module hooks observe actual module loads. This is instrumentation for
// integrity tests, not an app-supplied list of files. It never modifies source.
import { register } from 'node:module';
import { isMainThread } from 'node:worker_threads';
import { appendFileSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

if (isMainThread) register(import.meta.url, { parentURL: import.meta.url });

/** @type {import('node:module').LoadHook} */
export const load = async (url, context, nextLoad) => {
  const result = await nextLoad(url, context);
  const report = process.env.WRAITH_CORE_LOAD_REPORT;
  if (report && url.startsWith('file:') && url.includes('/skeleton/src/') && /\.ts(?:\?|$)/.test(url)) {
    const path = realpathSync(fileURLToPath(url));
    const disk = readFileSync(path);
    const source = result.source;
    if (source === undefined || source === null) throw new Error(`No observed module source: ${path}`);
    const loaded = typeof source === 'string' ? Buffer.from(source) : ArrayBuffer.isView(source) ? Buffer.from(source.buffer, source.byteOffset, source.byteLength) : Buffer.from(source);
    appendFileSync(report, JSON.stringify({ path, sourceHash: createHash('sha256').update(disk).digest('hex'), loadedHash: createHash('sha256').update(loaded).digest('hex') }) + '\n');
  }
  return result;
};
