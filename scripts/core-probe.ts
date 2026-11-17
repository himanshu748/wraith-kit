import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { App } from '@wraith-kit/skeleton/core';
const id = process.argv[2];
if (id !== 'todo-afterlife' && id !== 'notice-ghoul') throw new Error('Unknown probe app');
const url = new URL(`../apps/${id}/src/index.ts`, import.meta.url);
const module = await import(url.href) as { createTodoApp?: () => App; createNoticeApp?: () => App };
const app = (module.createTodoApp ?? module.createNoticeApp)!();
// Observe the common local runtime and presentation entries as well as the app's core.
await import('@wraith-kit/skeleton/node');
await import('@wraith-kit/skeleton/ui');
const resolution = realpathSync(createRequire(fileURLToPath(url)).resolve('@wraith-kit/skeleton/core'));
const frozen = [app, app.rules, app.sources, app.actions, app.aggregates, app.records].every(Object.isFrozen);
let mutationBlocked = false;
try { (app.actions as Record<string, unknown>).injected = {}; } catch { mutationBlocked = true; }
process.stdout.write(JSON.stringify({ id: app.id, resolution, frozen, mutationBlocked }) + '\n');
