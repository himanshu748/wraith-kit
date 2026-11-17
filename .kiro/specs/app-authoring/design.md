# Design: app-authoring

Authored by Codex on 17 Nov 2026 after implementation was authorized. The scaffold is local and creates no remote repository. This document does not claim a Kiro app-smith rehearsal or human timing.

## 1. Small template and safe generation

`skeleton/template/` contains `.tpl` source, local runner, test, package metadata and README. The template defines a validated CLI source, one deterministic proposal rule and one action that returns a local text artifact only after approval. Placeholders are limited to a validated app id and its derived title. Only public core/node/testing exports are imported.

`scripts/new-app.ts` accepts one lowercase kebab-case slug with at most 48 characters, creates exactly `apps/<slug>`, refuses existing destinations and a symlinked apps directory, and copies template files with exclusive writes. It removes only its newly created directory if copying fails. It never changes the package lock, shared source, existing apps or repository metadata. Existing npm workspace resolution is enough for the documented root commands.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

## 2. Independent reuse evidence

The shared integrity suite resolves each supplied app in a separate Node process. A Node loader hook observes module paths, source hashes and loaded module hashes. It compares observed source with current disk bytes under `skeleton/src`, checks the core entry was actually loaded and permits unrelated optional entries to differ. The AST import scan checks all apps against package exports, rejects private/relative core imports and computed imports, and checks copied hashes and the core marker. Core source may not mention either supplied app id.

Registry checks exercise frozen objects and a mutation attempt. Negative fixtures cover copied source, marker carry-over, private and computed imports, missing core entry and altered loaded hashes; core definition tests exercise invalid mutable inputs and assert returned registries are frozen. This is source and process evidence, not deployed-runtime proof.

_Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

## 3. Normal workflow

The tests are included by Vitest in `npm test`; the commit guard runs the suite after both app modules exist. The skeleton-warden instructions require the same checks and honest results. Lambda bundle metadata checks restrict all skeleton inputs to the shared source tree independently. The guide explains each boundary and how a third app can add a process probe.

_Validates: Requirements 3.1, 3.2, 3.3, 3.4_

## 4. Runnable authoring guide

The canonical guide is `docs/make-your-own-app-in-15-min.md`. It begins with runtime prerequisites, scaffold/run commands and the fictional study-room printer request. The smallest path covers one source, one rule and an approved local artifact. It then explains memory-store testing, replay, rule priority/stop, approval and optional records, advisors, aggregates, views and action lookup. Public package exports are the only app integration surface. Missing capabilities belong in the shared contract with tests, never a copied engine. The steering file links this guide and must be updated as part of the shared documentation task.

The short name `docs/make-your-own-app.md` points to the canonical guide. Fifteen minutes remains an explicit goal. Automated smoke validation and any future human or Kiro rehearsal are distinct evidence.

_Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

## 5. Rehearsal boundary

The generated-app test creates and runs a scratch module in a separate Node process, checks duplicate input and approval, then removes exactly its own folder. It does not count as the specified clean-tree, timed app-smith rehearsal. That rehearsal is pending while the implementation tree is being built. The documented procedure starts on a clean tree, records timestamps and all commands/failures, preserves unrelated edits, and leaves cleanup to the main session. No scratch app is committed. Human timing is not measured and cannot be replaced with agent timing.

_Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

## Primary API documentation

Node's [filesystem API](https://nodejs.org/api/fs.html) confirms exclusive `wx` writes, `mkdir`, `realpath` and promise errors. The [child-process API](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options) confirms argument-vector spawning without a shell. These were checked on 17 Nov 2026. The generated runner uses the actual locally typed public skeleton contract, tested through its real HTTP entry point.
