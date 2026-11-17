# Run Wraith Kit locally

Use Node 22.13+ (22.14 tested), npm and this repository. No cloud, model or GitHub account is needed for the fixture journey.

```sh
npm ci
npm run dev:todo
# In another terminal:
npm run dev:notices
```

TODO Afterlife listens at 127.0.0.1:4317 and Notice Ghoul at 127.0.0.1:4318. The default browser opens each private one-time login link. If it does not, open the file path printed by that app, usually `~/.config/wraith-kit/<app>/login-link.txt`, in your browser. Do not paste the token into chat or screenshots. An ordinary `/queue` visit needs this session. Restarting produces a new link; old sessions remain valid until logout/expiry.

Use `WRAITH_OPEN_BROWSER=0 npm run dev:todo` for headless use. `PORT=4320 npm run dev:todo` changes the port. Server and browser must use the same loopback host; use the link as written. The server rejects other Host names.

## Five-minute judge journey

1. In TODO Afterlife, open a Rewrite proposal. Read the source path, rules and exact patch. Approve and download the patch. It is not applied to your source automatically.
2. Open an Open issue proposal. In the default configuration the preview says dry run. Approve to record the proposed issue locally. No issue is posted.
3. Load demo again. Identical event keys preserve the same proposals.
4. In Notice Ghoul, review an ambiguous or conflicting deadline. Select a candidate or type a correction. Invalid text stays in the form and leaves the record unchanged.
5. Open Daily digest and Calendar file. The calendar contains confirmed deadlines; the digest also explains dates still requiring review. Visit Audit trail for the recorded chain and its limits.

The seed data is fictional DEMO data and dates are relative to the current UTC date. Static fixtures retain their explicit2026 dates for parser tests. Source links point to the local fixture pages.

## Actually poll the fixture site

```sh
npx tsx apps/notice-ghoul/src/fixture-server.ts
# Another terminal, with the approval server stopped first if 4318 is in use:
WRAITH_NOTICE_CONFIG=apps/notice-ghoul/fixtures/config.json npm run dev:notices
```

This sends real HTTP requests to the fictional loopback source at 4319, including robots.txt. Configured mode does not seed the replay events. The Engine polls on its scheduler and keeps the previous records when a source fails. See [the app README](../apps/notice-ghoul/README.md) for RSS/Atom and real source configuration. Real URLs must be explicitly configured and permitted by the source's usage rules.

## Replay, hooks, audit and MCP

```sh
npm run demo:todo
npm run demo:notices
npm run audit -- todo-afterlife
npm run mcp -- todo-afterlife
```

Replay writes into the selected app's local store and does not require the server. The MCP command speaks stdio JSON-RPC and waits for a client, not a human prompt. It exposes six read-only tools; see [MCP design](../.kiro/specs/wraith-mcp/design.md). Kiro must be opened at this repository root to discover `.kiro`. Default MCP app is TODO Afterlife; change its startup argument to inspect Notice Ghoul.

The pre-commit hook runs `node --import tsx apps/todo-afterlife/src/precommit.ts`. It reads staged added/changed comments, prints rewrites and saves proposals, with no model, network, tick or executor. `WRAITH_TODO_BLOCK=1` blocks completed scans that found vague comments; internal errors remain advisory. [Hook details](../KIRO_USAGE.md) distinguish scripts tested manually from observed Kiro hook dispatch.

## Configuration and private files

`.env.example` names optional variables; it contains no credentials. Runtime scripts do not implicitly load .env. To use an owner-created file, invoke `node --env-file=.env --import tsx scripts/run-app.ts todo-afterlife` or export variables in the shell. Never paste secret values into commands captured for the demo.

Default state is `.wraith/<app>/journal.jsonl`; output files are `.wraith/<app>/out/`. The journal is authoritative, snapshot.json only a cache. Keys are outside the repo in `~/.config/wraith-kit/`; back them up separately from state. Losing a key prevents verification of the old chain. Do not edit the journal or share it over a network filesystem. Multiple processes on the same host are supported through exclusive locking. Stop servers before copying a backup. This full-snapshot journal is intended for small workloads and has no automatic compaction.

The AWS store caps active state at 1.5 MB; local state is bounded by available disk and grows with the journal. Demo reset is explicit in the Engine API and keeps audit/real data; no automatic reset or deletion runs. Unknown-outcome external actions cannot be reset until reviewed.
