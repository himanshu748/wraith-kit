import { expect, test } from 'vitest';
import { createHostedTodo, type WorkspaceStorage } from '../scripts/hosted-todo.js';
import type { Snapshot } from '@wraith-kit/skeleton/core';

test('isolates hosted TODO approvals and patch downloads across visitors', async () => {
  const workspaces = new Map<string, { etag: string; snapshot: Snapshot }>();
  const storage: WorkspaceStorage = {
    async read(id) { return structuredClone(workspaces.get(id)); },
    async write(id, snapshot, etag) {
      if (workspaces.get(id)?.etag !== etag) return false;
      workspaces.set(id, { etag: String(snapshot.revision), snapshot: structuredClone(snapshot) });
      return true;
    },
  };
  const origin = 'https://todo.example';
  const handle = createHostedTodo('test-key-for-hosted-todo-afterlife', storage);
  const get = (path: string, cookie?: string) => handle(new Request(origin + path, {
    headers: cookie ? { cookie } : {},
  }));
  const post = (path: string, body: URLSearchParams, cookie = '', from = origin) =>
    handle(new Request(origin + path, { method: 'POST', headers: { cookie, origin: from }, body }));

  async function start() {
    const response = await post('/start', new URLSearchParams());
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/queue');
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) expect(cookie).toMatch(/Secure/);
    return cookies.map(cookie => cookie.split(';')[0]).join('; ');
  }

  expect(await (await get('/')).text()).toContain('Open demo workspace');
  expect((await post('/start', new URLSearchParams(), '', 'https://elsewhere.example')).status).toBe(403);
  expect(workspaces.size).toBe(0);
  const first = await start();
  const second = await start();
  expect(first).not.toBe(second);
  expect(workspaces.size).toBe(2);

  const action = Object.values([...workspaces.values()][0].snapshot.actions).find(item => item.kind === 'rewrite')!;
  const detail = await (await get('/actions/' + action.id, first)).text();
  const csrf = detail.match(/name="csrf" value="([a-f0-9]+)"/)?.[1];
  expect(csrf).toBeDefined();
  const form = new URLSearchParams({ csrf: csrf!, decision: 'approve' });
  const decision = '/actions/' + action.id + '/decision';
  expect((await post(decision, form, second)).status).toBe(403);
  expect((await post(decision, form, first)).status).toBe(303);

  const download = '/actions/' + action.id + '/download';
  const patch = await get(download, first);
  expect(patch.headers.get('content-disposition')).toContain('attachment');
  expect(await patch.text()).toMatch(/--- a\/src\/payment\.ts/);
  expect((await get(download, second)).headers.get('content-disposition')).toBeNull();
  expect(await (await get('/audit', first)).text()).toContain('Chain verified');
  expect((await post('/webhooks/github', new URLSearchParams(), first)).status).toBe(404);
});
