// WRAITH-SKELETON
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
export async function privateSecret(name: string, root = join(homedir(), '.config', 'wraith-kit')): Promise<{ value: string; path: string }> {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid secret name');
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await stat(root)).mode & 0o077) throw new Error(`Secret directory permissions must be 0700: ${root}`);
  const path = join(root, name);
  try { await writeFile(path, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  if ((await stat(path)).mode & 0o077) throw new Error(`Secret file permissions must be 0600: ${path}`);
  const value = (await readFile(path, 'utf8')).trim();
  if (value.length < 32) throw new Error(`Invalid secret file: ${path}`);
  return { value, path };
}
