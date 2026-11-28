# Host the TODO Afterlife demo on Vercel

The Vercel function runs the existing TODO Afterlife rules, approval pages and
patch generator. Each visitor starts a workspace seeded with fictional TODOs.
The demo uses no GitHub credentials or model provider. Issue approvals are
dry runs.

1. Import this repository into a Vercel Hobby project using the repository root.
2. Create a private Vercel Blob store and connect it to the project. The
   function uses the connected `BLOB_READ_WRITE_TOKEN` variable.
3. Set a randomly generated production `WRAITH_HOSTED_SECRET` of at least
   32 characters, then deploy. Keep the secret stable while demo sessions
   are active.
4. Open the production URL. Choose **Open demo workspace**, approve a rewrite,
   download the patch, and check the audit. Open the URL in a second browser
   session and check that its copy of the rewrite is still pending.

The private store persists each visitor's demo state. Concurrent writes are
checked against the previous snapshot, and the browser's session expires after
eight hours. Each workspace is capped at 64 KB. Vercel's Hobby Blob quota
applies across workspaces.

The handler can be tested without a Vercel account or Blob credentials by
running `npx vitest run tests/hosted-todo.test.ts`.
