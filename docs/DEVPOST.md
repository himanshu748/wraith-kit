# Wraith Kit judge guide

**[Try TODO Afterlife live](https://wraith-kit.vercel.app/)** · [Verified judge release](https://github.com/himanshu748/wraith-kit/releases/tag/kiroween-2026-ci-73ab9be) · [Watch the 1:12 walkthrough](https://www.youtube.com/watch?v=hltMBkDhLOU)

**Kiroween 2026 category:** Skeleton Crew. [Official rules](https://kiroween.devpost.com/rules).

Wraith Kit is a shared TypeScript runtime for agents that explain their proposals, ask before consequential actions and record the outcome. TODO Afterlife proposes a patch from a vague TODO. Notice Ghoul proposes a date from a student notice and exports a confirmed calendar entry.

## Try TODO Afterlife live

Open the hosted demo and choose **Open demo workspace**. Review and approve a proposed rewrite, download the patch, then check **Audit**. Each visitor starts with a separate workspace seeded with fictional TODOs.

## Run both apps offline

[Download the verified judge ZIP](https://github.com/himanshu748/wraith-kit/releases/download/kiroween-2026-ci-73ab9be/wraith-kit-judge.zip) and unzip it. Notice Ghoul runs offline. From that directory with Node.js 22.13 or newer, run `node wraith.mjs todo-afterlife` and `node wraith.mjs notice-ghoul` in separate terminals. Each app binds to loopback and opens its own one-time sign-in URL. If a browser does not open, the terminal prints a path to the local link file. No npm install, account or API key is needed.

1. TODO Afterlife: open a proposed rewrite, review the source and preview, approve, and download the patch. The fixture issue flow runs in local dry-run mode.
2. Notice Ghoul: open a proposed deadline, select a date, then open the digest and download the calendar. The sample notices are fictional.
3. Open **Audit** in either app to inspect the events and the verified chain.

[Chromium test for the release ZIP](https://github.com/himanshu748/wraith-kit/actions/runs/46168741325/job/141052094436) · [Packaged TODO approval](images/judge-todo-approved.png) · [Packaged Notice Ghoul digest](images/judge-notice-digest.png) · [Browser test](../tests/e2e/packaged.pw.ts).

## How Kiro was used

Kiro CLI over ACP in T3 Code produced the plan, foundation, hooks, steering, agent definitions, MCP configuration and first four requirement drafts. The [core requirements](../.kiro/specs/wraith-core/requirements.md) and [structure steering](../.kiro/steering/structure.md) defined the shared engine boundary. The [integrity test](../tests/core-integrity.test.ts) checks the shared modules actually loaded in both apps.

Headless Kiro CLI V3 experiments captured actual hook payloads and exit-2 blocking in a scratch workspace. A project-root run observed which steering files loaded. The project hooks and custom agents were configured and their definitions validated. Subsequent project-root runs reached the account limit before the requested work executed. Codex continued the implementation and authored the core and app property tests. A local MCP client exercised the project's read-only server over stdio. [Kiro usage evidence](../KIRO_USAGE.md) · [Experiment log](experiments.md).

## Submission fields

| Field | Value or evidence |
| --- | --- |
| Category | Skeleton Crew |
| Public GitHub repository | [Source](https://github.com/himanshu748/wraith-kit), MIT license, committed root `.kiro/`, and two app folders |
| Functional test build | [Hosted TODO Afterlife](https://wraith-kit.vercel.app/) and [verified offline ZIP for both apps](https://github.com/himanshu748/wraith-kit/releases/tag/kiroween-2026-ci-73ab9be) |
| Judge instructions | The hosted and offline approval steps above |
| Pre-existing work | [Dependency and license disclosures](../README.md#pre-existing-work) |
| Video | [YouTube walkthrough](https://www.youtube.com/watch?v=hltMBkDhLOU) (1:12) |
| Eligibility and survey responses | Entrant completes personal and bonus fields |
