# TODO Afterlife

Turn vague TODO and FIXME comments into a concrete task, a reviewable patch or a GitHub issue. Every outcome needs approval. This app imports Wraith Kit's public extension points; it does not contain a fork of the engine.

## Run the local demo

From the repository root, with the Node version in the root README:

```sh
npm install
npm run dev:todo
```

The server listens on `http://127.0.0.1:4317` and opens a one-time local sign-in link. If the browser does not open, use the private link file named in the terminal. The queue is seeded with fictional, visibly labelled demo comments. The default LLM provider is `none` and issue creation is dry-run.

1. Open the payment comment that says `fix this later`.
2. Inspect its ordered rule findings and rewrite patch.
3. Approve the rewrite. Download the patch from the result; nothing is committed or pushed.
4. Approve the issue proposal to see the exact dry-run title and body. No issue is created without explicit live configuration.
5. Replay the fixture. The existing event and actions remain single copies:

```sh
npm run demo:todo
npx vitest run apps/todo-afterlife/test
```

The local state is under `.wraith/todo-afterlife/`; the audit key is stored separately with private file permissions. See the root README for audit verification. Keep these private files out of Git.

## Scan a staged diff locally

Set an owner for useful local rewrites, then run the check from this repository:

```sh
WRAITH_OWNER=your-github-login node --import tsx apps/todo-afterlife/src/precommit.ts
```

It reads `git diff --cached`, uses the same app/core/store as the server, and prints proposals. It never fetches GitHub, calls an LLM, executes actions or edits files. Without an owner it labels the rewrite `incomplete: no owner set`. Failures are advisory, including a store lock held beyond five seconds. Only `WRAITH_TODO_BLOCK=1` makes a completed scan with vague comments block a commit.

Kiro's hook sees agent commits only. For terminal commits, an optional ordinary Git hook is provided. Inspect an existing hook first; this command refuses to replace it:

```sh
test ! -e .git/hooks/pre-commit && cp apps/todo-afterlife/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

This hook assumes the Wraith Kit monorepo layout. To use TODO Afterlife in another repository, adapt the entrypoint's absolute path deliberately rather than copying the core into it. Existing Git hooks must be integrated manually; do not overwrite them.

## Live GitHub setup, later and only when authorized

The application implements the endpoints but this build has not created a repository, webhook or issue. A live test sends data to GitHub and may create public issues.

- `WRAITH_GITHUB_REPO`: one allowed repository, default `himanshu748/wraith-kit-sandbox`.
- `WRAITH_GITHUB_TOKEN`: fine-grained token restricted to that repository, with Contents read and Issues write. Keep it outside the repo and terminal recordings.
- `WRAITH_WEBHOOK_SECRET`: the matching webhook secret. The app verifies the raw body with HMAC-SHA256 before JSON parsing.
- `WRAITH_LIVE_ISSUES=1`: explicitly enables real issue creation when a token is also present. The runtime supplies an atomic persistent quota, default 20 creations per UTC day.
- `WRAITH_OWNER`: preferred task owner; webhook input can otherwise use the sender's available GitHub login. A missing identity is not invented.

Send push webhooks to `/webhooks/github`. Durable intake returns 202 before expansion. Expansion retrieves tracked issues, then comparison patches, and evaluates each comment through the shared rules. New/deleted branches and omitted patches produce incomplete-scan warnings. GitHub compare responses are limited to 300 files; reaching that limit is reported as possibly incomplete.

Issues use labels `wraith-kit` and `todo-afterlife`. Create those labels in the sandbox before a live run and ensure the token can apply them. Demo issues carry `[DEMO]` in the title and a demo-data line. An idempotency marker allows recovery by searching all labelled issues, including closed ones. Lookup is bounded to 1,000 items and fails closed if incomplete. An unresolved write outcome stops blind creation retries; inspect GitHub before manually retrying. This does not claim exactly-once execution against an external service.

Approved patches have original-line context. Apply them with `git apply --check downloaded.patch` before `git apply downloaded.patch`; stale patches fail instead of silently editing another line. The app itself does not apply patches.

## What the parser supports

Added lines in unified text diffs, with TODO/FIXME/HACK/XXX after `//`, `/*`, `*`, `#`, `--` or `<!--` comment introducers. It is a conservative text scanner, not a language compiler: comment-like sequences inside string literals can need manual review. Binary or missing patches are reported. Same-text occurrences use an ordinal within a file, so moving lines preserves their keys while inserting another identical occurrence may shift ordinals. The tests document that limit.

The optional reword advisor sends the comment and available code context to the selected provider only when enabled. It can change displayed wording, not the action kind, target or payload. The pre-commit entrypoint always disables it.

## Verification and AWS

The app suite covers generated diff extraction and rewrite rules, replay/approval with the real shared engine, webhook signature failures, unavailable patches, issue recovery and quota refusal. Provider HTTP responses in these tests are fakes; no live GitHub success is claimed.

AWS packaging and deployment prerequisites are documented at the repository root and in `docs/deploy-aws.md`. No stack is deployed by the local startup commands. The SAM template for this app uses the same source modules.
