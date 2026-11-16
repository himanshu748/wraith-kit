---
inclusion: auto
name: skeleton-authoring
description: How to build a new Wraith Kit app (app number 3) from the skeleton's extension points only. Use when someone asks to create, scaffold or build a new Wraith app, add an app under apps/, or write a new source, rule or action kind for an app.
---

# Building a new Wraith app (app #3)

A Wraith app is a folder under `apps/<name>/` that passes extension points to the skeleton's `defineApp({...})` and touches nothing else. TODO Afterlife and Notice Ghoul are built this way, and app #3 must be too. The names below (`defineApp`, `sources`, `rules`, `actions` and the rest) are design intent from PLAN.md section 5.1; the `wraith-core` spec sets the final names and signatures, so check the spec and the skeleton's exports before writing code. The skeleton and its scaffold are not built yet; until they are, this file describes the planned path.

## The minimal app: one source, one rule, one action kind

Follow this path first and stop when it works. Everything else is optional and has a default.

1. **Start on a clean working tree** (`git status` shows nothing).
2. **Scaffold the app** with the `new-app` scaffold script when it exists (it copies `skeleton/template/`, which is the minimal app). The folder name is the app id: lowercase kebab-case, and not `todo-afterlife` or `notice-ghoul`.
3. **Write one source.** Either a poller with a schedule and an `expand` that fetches through `ctx.http` and returns `Event[]`, or a webhook route with only an `accept` that verifies the request and returns a delivery key and the payload (without an `expand`, the core turns the payload into one `Event`). `accept` makes no outbound calls. Give every event a deterministic idempotency key derived from the source identity, plus a content hash if the content can change.
4. **Write one rule** with an `id`, a `priority`, a `description` and a pure `evaluate(event, ctx)` that returns findings and candidate actions. No I/O, time only from `ctx.clock`, other events only through `ctx.state`.
5. **Write one action kind** with `describe` (the preview shown in the approval UI) and `execute(payload, ctx)`, which receives the idempotency key and an abort signal. Leave `safety` out, so it needs approval.
6. **Run it locally** with the skeleton's `node` runtime and demo events labelled "DEMO", and approve one action in the approval UI.
7. **Run the tests:** the app's own tests (`apps/<name>/test/`) and `npm test`, which includes the core-integrity test.

## Optional extension points, after the minimal app works

Add only what the app needs:

- `advisor` in `reword` mode (the LLM may reword proposed actions, never decide them) or `extract` mode (the LLM proposes data with an evidence quote, and your deterministic `verify` must reproduce the value from the quote). Always provide the deterministic fallback; the default provider is `none`.
- `aggregates`: scheduled jobs that read `ctx.state` and propose at most one action per period or per distinct input set.
- `records`: record types your rules upsert, each with a `parseValue` that checks a typed edit on the server.
- `lookup` on an action kind, to find an earlier effect after an unknown outcome, and a retry policy.
- `views` (HTML cards through the skeleton's escaping `html` template) and `theme` (name, accent colour, icon).
- `safety: "safe"` on an action kind, only with a written `reason`, and only for kinds whose effect is harmless to repeat.

If a rule or aggregate must see unconfirmed LLM-sourced records (`includeUnconfirmed`, proposed name), keep the query narrow: every new value it sets will ask a person to confirm it.

## Never do this

- Fork, copy or patch any skeleton file, or monkey-patch what `defineApp` returns.
- Import a `skeleton/src/...` path or use a relative path into `skeleton/`. Import only the entries in the skeleton's `package.json` `exports`.
- Put the new app's id or folder name anywhere under `skeleton/src/`.
- Write records anywhere except in rule upserts and the built-in `confirm-record` action.
- Mark an action kind safe without a reason, or let LLM output decide safety, targets or action kinds.
- Add manual deadline entry or a scene view to anything that reads student deadlines (product.md explains why).
- Commit a scratch or rehearsal app.

## How to prove the app uses the unmodified core

`tests/core-integrity.test.ts` (PLAN.md section 8) runs in `npm test`, in the commit guard and in the skeleton-warden review. It checks that the app resolves the skeleton to the same real path, imports only public entries, contains no copy of a skeleton file, loads skeleton files whose bytes match the files on disk, does not patch frozen registries, and that the skeleton never names the app. A new app is done only when that test passes with the new app included.

## The 15-minute guide

#[[file:docs/make-your-own-app-in-15-min.md]]
