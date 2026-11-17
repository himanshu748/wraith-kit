# Wraith Kit

A lean TypeScript skeleton for small event agents that ask before they act. Built for the Kiroween 2026 hackathon, Skeleton Crew category.

## What it is

Wraith Kit is planned as a small TypeScript skeleton for agents that follow one path: an event arrives (a webhook, or a feed the kit polls) and is normalised into an `Event`; deterministic rules run on it; an LLM can optionally help through one adapter (Modal within its free monthly credits, or a local Ollama model, with a no-LLM default); and the result is a proposed `Action`. Every action waits for a human in a small approval web UI unless its kind is explicitly declared safe and it carries no unconfirmed LLM-sourced data. The plan includes an audit log, retries and idempotency keys, so a redelivered webhook should never produce a second action, and two ways to run it: locally with Node, or on the AWS free tier (Lambda, Function URLs and DynamoDB, deployed with SAM). Two apps will be built only from the skeleton's extension points: TODO Afterlife for developers and Notice Ghoul for students. None of this is built yet; see [Status](#status).

## Who it is for

| Part | Audience | Problem |
|---|---|---|
| The skeleton (`/skeleton`) | Developers who want a useful automation agent without giving an AI unchecked write access to real systems | Wiring intake, dedupe, retries, approval and audit by hand for every small agent |
| App 1, TODO Afterlife (`/apps/todo-afterlife`) | Developers | TODO and FIXME comments that rot because nobody turns them into tracked work |
| App 2, Notice Ghoul (`/apps/notice-ghoul`) | Students | Deadlines buried in college notice boards and RSS feeds |

## Status

- Phase 1 (spec) started on 16 Nov 2026, after the plan was approved.
- Neither application is runnable yet. The repo holds the plan, this README, [KIRO_USAGE.md](KIRO_USAGE.md), the license, the TypeScript toolchain, six Kiro agent hooks (`.kiro/hooks/`) with their scripts (`scripts/hooks/`) and tests, five steering files (`.kiro/steering/`), two custom agents (`.kiro/agents/`) and the MCP config (`.kiro/settings/mcp.json`). Kiro experiments are recorded in [docs/experiments.md](docs/experiments.md). The skeleton and both apps come after their specs.
- All eight feature requirements are written (564 acceptance criteria). Designs and tasks remain pending the reserved Kiro IDE core-design step on 18 Nov at 12:00 IST. Follow [the IDE handoff](docs/kiro-ide-steps.md) for the exact prompts and evidence to return.
- The 17 Nov continuation used Codex through T3 Code after the Kiro usage-limit interruption; tool attribution is recorded in [KIRO_USAGE.md](KIRO_USAGE.md).
- The full plan, with dates and the order of work, is in [PLAN.md](PLAN.md).

## Working app URLs

- TODO Afterlife: `<todo-afterlife-function-url>`
- Notice Ghoul: `<notice-ghoul-function-url>`

These placeholders are filled in only after the author approves a deploy. Nothing is deployed today.

## How to run

Not yet. Each app will get its own README with run instructions (`apps/todo-afterlife/README.md` and `apps/notice-ghoul/README.md`), covering both the local Node run and the AWS free tier deploy. They arrive with the apps in Phase 2.

## How to test

You need Node.js 22.13 or a later 22.x release, Node.js 24, or Node.js 26 or later (the range that both ESLint 10 and Vitest 5 support). This repo is developed on Node.js v22.14.0 with npm 10.9.2.

```sh
npm install
npm run typecheck   # tsc, strict, no output files
npm run lint        # ESLint with the typescript-eslint recommended rules
npm test            # Vitest; property tests use fast-check's default run count
npm run test:fast   # the same tests with WRAITH_PBT_RUNS=20 (the fast mode hooks use)
npm run guard       # the commit guard by hand: every check in scripts/guard-checks.json on the staged index
npm run spec:trace  # requirement ID traceability for .kiro/specs/ (strict: exits 1 on any error)
```

Today the tests cover the test helper `pbtRuns()` in `tests/pbt.ts`, the Kiro hook scripts in `scripts/hooks/` (`tests/hooks/`): commit detection, with fast-check properties, the guard checks, the spec traceability check, and each hook script run in temporary git repos, and the Kiro config files (`tests/kiro/`): steering front matter and file references, the spec ID examples in `structure.md`, the agents' fields and permission rules, and the MCP config.

`npm run guard` pipes a synthetic `git commit` hook event into `scripts/hooks/commit-guard.mjs`, the same script the `commit-guard` Kiro hook runs. It prints one line per check (pass, fail with the reason, or skipped) and exits 2 if a check fails. Stage your changes first: it checks what is staged. Until a Kiro session starts in this folder, the guard is run this way before every commit (see [KIRO_USAGE.md](KIRO_USAGE.md)).

## Repo layout

Planned layout (PLAN.md section 3). Today `.kiro/specs/*/requirements.md`, `.kiro/hooks/`, `.kiro/steering/`, `.kiro/agents/`, `.kiro/settings/`, `scripts/` (hook scripts and `guard-checks.json`), `tests/`, `docs/experiments.md`, the stub of `docs/make-your-own-app-in-15-min.md` and the root files exist.

```text
wraith-kit/
  .kiro/
    steering/   product.md, tech.md, structure.md, wraith-domain.md, skeleton-authoring.md
    specs/      wraith-core/, llm-adapter/, approval-ui/, runtimes/, todo-afterlife/,
                notice-ghoul/, wraith-mcp/, app-authoring/
                (each: requirements.md, design.md, tasks.md)
    hooks/      tests-on-save.json, commit-guard.json, todo-afterlife-precommit.json,
                doc-sync.json, spec-trace.json, store-guard.json
    agents/     skeleton-warden.json, app-smith.json
    settings/   mcp.json
  skeleton/     the template: package.json (exports), src/{core,node,aws,llm,ui,mcp,testing},
                template/ (starter files for app #3), test/
  apps/
    todo-afterlife/   README.md, package.json, src/, fixtures/, template.yaml (SAM), test/
    notice-ghoul/     README.md, package.json, src/, fixtures/site/, template.yaml (SAM), test/
  tests/        repo-level tests (core-integrity.test.ts, store-contract.test.ts, ...)
  docs/         make-your-own-app-in-15-min.md, architecture.md, run-local.md, deploy-aws.md,
                experiments.md, reviews/
  scripts/      hook scripts, core budget, deps-vs-README check, new-app scaffold
  README.md  KIRO_USAGE.md  LICENSE  PLAN.md  DEVPOST_STORY.md  VIDEO_SHOTLIST.md
  BLOG_DRAFT.md  SOCIAL_POST.md  SUBMISSION_CHECKLIST.md
```

## Pre-existing work

Wraith Kit's code is new, written during the Kiroween 2026 Submission Period. No templates, starter kits, fonts or icon packs are used. The repo started empty.

npm packages (every package in `package.json`; versions as installed, from `npm ls --depth=0`; licenses from `npm view <name> license`, both on 16 Nov 2026):

| Item | Version | License | Used for |
|---|---|---|---|
| `@eslint/js` | 10.0.1 | MIT | ESLint's recommended JavaScript rules |
| `@types/node` | 22.20.5 | MIT | Node.js 22 type definitions for TypeScript |
| `eslint` | 10.15.0 | MIT | Linting (`npm run lint`) |
| `fast-check` | 4.10.2 | MIT | Property-based tests |
| `tsx` | 4.23.15 | MIT | Running TypeScript files directly with Node; installed for later scripts, not used yet |
| `typescript` | 6.0.3 | Apache-2.0 | Typechecking (`npm run typecheck`, no emitted files) |
| `typescript-eslint` | 8.72.2 | MIT | TypeScript parser and recommended rules for ESLint |
| `vitest` | 5.1.0 | MIT | Test runner (`npm test`) |

These are all dev dependencies. `package-lock.json` pins 193 packages in total: the ones above, their dependencies, and optional platform-specific binaries. Their licenses, as recorded in the lock file: MIT 148, Apache-2.0 15, MPL-2.0 12, BSD-2-Clause 6, ISC 6, BlueOak-1.0.0 3, BSD-3-Clause 2, 0BSD 1.

Other pre-existing work and tools:

| Item | Version | License | Used for |
|---|---|---|---|
| Node.js and its built-in modules | v22.14.0 | MIT (Node.js core; bundled third-party parts carry their own licenses, listed in the Node.js LICENSE file) | Runtime for the toolchain, the tests and later the skeleton |
| npm | 10.9.2 | Artistic-2.0 | Installing packages, running scripts |
| The MIT License text | standard text | n/a | `LICENSE`, copied from [choosealicense.com](https://choosealicense.com/licenses/mit/) with the year and holder filled in |
| Kiro CLI, driven over ACP by T3 Code | 3.3.0 (from `kiro-cli --version`) | to confirm | Authored the plan, foundation and initial requirements (see [KIRO_USAGE.md](KIRO_USAGE.md)) |
| Codex harness through T3 Code | Session model gpt-6-astra; harness version not captured | to confirm | Resumed interrupted requirements and wrote the remaining Phase 1 documentation on 17 Nov; not Kiro usage |
| T3 Code | to confirm | to confirm | The app that drives the Kiro CLI session |
| uv and uvx | 0.8.2 (from `uvx --version`, installed with Homebrew) | MIT OR Apache-2.0 (from PyPI's `uv` package metadata) | Running the AWS Documentation MCP server with `uvx`; uvx ran it on Python 3.12.11 |
| `awslabs.aws-documentation-mcp-server` (AWS Documentation MCP server) | 1.2.5 (pinned in `.kiro/settings/mcp.json`) | Apache-2.0 (from PyPI) | The `aws-docs` MCP server Kiro uses to read AWS documentation. uvx installs it and its Python dependencies (45 packages on 16 Nov 2026) into uv's cache, outside this repo |

More tools (cfn-lint, the AWS SAM CLI, other MCP servers) are listed here when they are first used.

## License

[MIT](LICENSE). Copyright (c) 2026 himanshu748.

## Kiroween 2026

Built for the [Kiroween 2026 hackathon](https://kiroween.devpost.com/), Skeleton Crew category. How Kiro is used, task by task, is recorded in [KIRO_USAGE.md](KIRO_USAGE.md).
