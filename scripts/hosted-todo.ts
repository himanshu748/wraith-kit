import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createTodoApp, todoDemoEvents } from '../apps/todo-afterlife/src/index.js';
import { Engine, type Snapshot } from '@wraith-kit/skeleton/core';
import { createHttpHandler } from '@wraith-kit/skeleton/node';
import { MemoryStore } from '@wraith-kit/skeleton/testing';
import { enhancementScript, stylesheet } from '@wraith-kit/skeleton/ui';

interface SavedWorkspace {
  etag: string;
  snapshot: Snapshot;
}

export interface WorkspaceStorage {
  read(id: string): Promise<SavedWorkspace | undefined>;
  write(id: string, snapshot: Snapshot, etag?: string): Promise<boolean>;
}

const visitorCookie = '__Host-wraith-visitor';
const cookieOptions = 'Path=/; Secure; HttpOnly; SameSite=Strict';
const privateHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const launchPage = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>TODO Afterlife</title><link rel="stylesheet" href="/assets/wraith.css">
<main><h1>TODO Afterlife</h1><p>Review a fictional TODO and turn it into a downloadable patch.</p>
<form method="post" action="/start"><button type="submit">Open demo workspace</button></form></main></html>`;

function text(body: string, status: number, contentType = 'text/plain; charset=utf-8') {
  return new Response(body, { status, headers: { ...privateHeaders, 'Content-Type': contentType } });
}

export function createHostedTodo(secret: string, storage: WorkspaceStorage) {
  if (secret.length < 32) throw new Error('The hosted demo requires a random session secret.');
  const app = createTodoApp({ liveIssues: false });
  const key = (purpose: string, id: string) =>
    createHmac('sha256', secret).update(purpose + ':' + id).digest('hex');

  function visitor(request: Request): string | undefined {
    const value = request.headers.get('cookie')?.split(';').map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(visitorCookie + '='))?.slice(visitorCookie.length + 1);
    const match = value?.match(/^([\da-f]{48})\.([\da-f]{64})$/);
    if (match && timingSafeEqual(Buffer.from(key('visitor', match[1])), Buffer.from(match[2]))) {
      return match[1];
    }
  }

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const route = url.pathname;
    const read = request.method === 'GET';
    if (read && route === '/health') return text('ok', 200);
    if (read && route === '/assets/wraith.css') return text(stylesheet, 200, 'text/css; charset=utf-8');
    if (read && route === '/assets/wraith.js') return text(enhancementScript, 200, 'text/javascript; charset=utf-8');
    if (read && (route === '/login' || (route === '/' && !visitor(request)))) {
      const response = text(launchPage, 200, 'text/html; charset=utf-8');
      response.headers.set('Content-Security-Policy', "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
      return response;
    }

    const start = request.method === 'POST' && route === '/start';
    const page = read && (/^\/(?:|queue|audit|settings|actions\/[\da-f]{64}(?:\/download)?|patches\/[\da-f]{64}\.patch)$/.test(route));
    const form = request.method === 'POST' && /^\/(?:demo|logout|actions\/[\da-f]{64}\/decision)$/.test(route);
    if (!start && !page && !form) return text('Not found', 404);
    if (!read && request.headers.get('origin') !== url.origin) return text('Cross-origin request refused', 403);

    const id = start ? randomBytes(24).toString('hex') : visitor(request);
    if (!id) {
      return read ? new Response(null, { status: 303, headers: { ...privateHeaders, Location: '/' } })
        : text('Open a demo workspace first.', 401);
    }

    try {
      const saved = start ? undefined : await storage.read(id);
      if (!start && !saved) {
        return new Response(null, { status: 303, headers: {
          ...privateHeaders, Location: '/', 'Set-Cookie': `${visitorCookie}=; ${cookieOptions}; Max-Age=0`,
        } });
      }
      const store = new MemoryStore(saved?.snapshot);
      const engine = new Engine(app, store, { auditKey: key('audit', id) });
      const loginToken = start ? randomBytes(32).toString('hex') : undefined;
      const handle = createHttpHandler({
        app, store, engine, loginToken, loginRole: 'demo', sessionKey: key('session', id),
        hosted: true, demo: true, publicDemo: false, demoEvents: todoDemoEvents,
      });
      if (start) {
        for (const event of todoDemoEvents()) await engine.ingest(event);
        url.pathname = '/auth';
        url.search = new URLSearchParams({ token: loginToken! }).toString();
      }
      const response = await handle(start ? new Request(url) : request);
      if (start && response.status !== 303) return text('Could not open the demo workspace.', 503);

      const snapshot = await store.read();
      if (snapshot.revision !== saved?.snapshot.revision) {
        if (Buffer.byteLength(JSON.stringify(snapshot)) > 64_000) return text('This demo workspace is full.', 409);
        if (!await storage.write(id, snapshot, saved?.etag)) return text('The workspace changed. Reload and try again.', 409);
      }
      if (start) {
        response.headers.append('Set-Cookie', `${visitorCookie}=${id}.${key('visitor', id)}; ${cookieOptions}; Max-Age=28800`);
      } else if (route === '/logout' && response.status === 303) {
        response.headers.append('Set-Cookie', `${visitorCookie}=; ${cookieOptions}; Max-Age=0`);
      }
      return response;
    } catch {
      return text('Demo workspace storage is temporarily unavailable.', 503);
    }
  };
}
