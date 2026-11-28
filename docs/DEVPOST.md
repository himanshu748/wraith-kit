# Wraith Kit judge guide

**Kiroween 2026 category:** Skeleton Crew. [Official rules](https://kiroween.devpost.com/rules) · [Public test build](https://github.com/himanshu748/wraith-kit/releases/tag/kiroween-2026-test) · [Download ZIP](https://github.com/himanshu748/wraith-kit/releases/download/kiroween-2026-test/wraith-kit-kiroween-test-build.zip)

Wraith Kit is a shared TypeScript runtime for agents that explain their proposals, ask before consequential actions and record the outcome. TODO Afterlife proposes a patch from a vague TODO. Notice Ghoul proposes a date from a student notice and exports a confirmed calendar entry.

## Run the working test build

Unzip the release. From that directory with Node.js 22.13 or newer, run `node wraith.mjs todo-afterlife` and `node wraith.mjs notice-ghoul` in separate terminals. Each app binds to loopback and opens its own one-time sign-in URL. If a browser does not open, the terminal prints a path to the local link file. No npm install, account or API key is needed.

1. TODO Afterlife: open a proposed rewrite, review the source and preview, approve, and download the patch. The fixture issue flow runs in local dry-run mode.
2. Notice Ghoul: open a proposed deadline, select a date, then open the digest and download the calendar. The sample notices are fictional.
3. Open **Audit** in either app to inspect the events and the verified chain.

[Recorded Chromium run](proof/judge-approval-run.json) contains a real patch download, unchanged action count after replay, a two-entry calendar and two verified audit screens. [TODO approval screenshot](images/todo-afterlife-detail.png) · [Notice Ghoul digest screenshot](images/notice-ghoul-digest.png) · [Browser test](../tests/e2e/journeys.pw.ts).

## How Kiro was used

Kiro CLI over ACP in T3 Code produced the plan, foundation, hooks, steering, agent definitions, MCP configuration and first four requirement drafts. The [core requirements](../.kiro/specs/wraith-core/requirements.md) and [structure steering](../.kiro/steering/structure.md) defined the shared engine boundary. The [integrity test](../tests/core-integrity.test.ts) checks the shared modules actually loaded in both apps.

Headless Kiro CLI V3 experiments captured actual hook payloads and exit-2 blocking in a scratch workspace. A project-root run observed which steering files loaded. The project hooks and custom agents were configured and their definitions validated. Subsequent project-root runs reached the account limit before the requested work executed. Codex continued the implementation and authored the core and app property tests. A local MCP client exercised the project's read-only server over stdio. [Kiro usage evidence](../KIRO_USAGE.md) · [Experiment log](experiments.md).

## Submission fields

| Field | Value or evidence |
| --- | --- |
| Category | Skeleton Crew |
| Public GitHub repository | [Source](https://github.com/himanshu748/wraith-kit), MIT license, committed root `.kiro/`, and two app folders |
| Functional test build | [GitHub release](https://github.com/himanshu748/wraith-kit/releases/tag/kiroween-2026-test) |
| Judge instructions | The two launch commands and approval steps above |
| Pre-existing work | [Dependency and license disclosures](../README.md#pre-existing-work) |
| Public video | Enter the verified public YouTube walkthrough URL |
| Eligibility and survey responses | Entrant completes personal and bonus fields |
