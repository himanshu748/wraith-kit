import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
import { createHostedTodo, type WorkspaceStorage } from './hosted-todo.js';
import type { Snapshot } from '@wraith-kit/skeleton/core';

const pathname = (id: string) => `wraith-todo/v1/${id}.json`;

const storage: WorkspaceStorage = {
  async read(id) {
    const object = await get(pathname(id), { access: 'private', useCache: false });
    if (!object) return;
    if (object.statusCode !== 200) throw new Error('Expected a current snapshot');
    return { etag: object.blob.etag, snapshot: await new Response(object.stream).json() as Snapshot };
  },
  async write(id, snapshot, etag) {
    try {
      await put(pathname(id), JSON.stringify(snapshot), {
        access: 'private', addRandomSuffix: false, contentType: 'application/json',
        allowOverwrite: etag !== undefined, ...(etag === undefined ? {} : { ifMatch: etag }),
      });
      return true;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) return false;
      throw error;
    }
  },
};

let handle: ReturnType<typeof createHostedTodo> | undefined;
export default {
  fetch(request: Request) {
    const secret = process.env.WRAITH_HOSTED_SECRET;
    const blobConnected = process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN;
    if (!secret || secret.length < 32 || !blobConnected) {
      return new Response('Demo workspace storage is unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    handle ??= createHostedTodo(secret, storage);
    const url = new URL(request.url);
    const route = url.searchParams.get('_wraithRoute');
    if (route !== null) {
      url.pathname = route;
      url.searchParams.delete('_wraithRoute');
      request = new Request(url, request);
    }
    return handle(request);
  },
};
