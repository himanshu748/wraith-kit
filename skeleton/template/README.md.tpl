# __APP_TITLE__

A starter Wraith app: receive a local request, propose a task, approve it, and download the result. The study-room printer request is fictional DEMO data. No credentials, LLM or external service is needed.

From the repository root after `npm install`:

```sh
npx tsx apps/__APP_ID__/run.ts
npx vitest run apps/__APP_ID__/test
```

Open the private sign-in link printed by the server (it also opens automatically). Approve the printer task in the queue. The successful action links to a text file, also written under `.wraith/__APP_ID__/out/tasks/`. The default port is 4320; use `PORT=4321` if occupied. Stop with Ctrl+C.

`src/index.ts` defines one CLI source, one deterministic rule and one action kind through public `@wraith-kit/skeleton/core` exports. `run.ts` supplies the shared file store and local web UI. No source code is copied from the core.

The action needs approval because its kind has no `safety` field. `execute` returns a local artifact; the runtime writes it. Tests use the shared memory store and fake clock to prove replay does not create a second action and nothing executes before approval.

Follow [the authoring guide](../../docs/make-your-own-app-in-15-min.md) for new sources and optional extensions. Run `npm test` from the repository root before committing. Demo reset deletes only DEMO app data; it does not undo external effects if you add them later.
