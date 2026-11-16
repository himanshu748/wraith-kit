# How Kiro is used in Wraith Kit

This file was written for the Kiroween 2026 hackathon write-up. It answers the Kiro questions from the [official rules](https://kiroween.devpost.com/rules) and is updated after every task. It records only what has happened so far. Anything that has not happened yet says "not yet", and anything not checked says "to confirm".

Last updated: 16 Nov 2026, in the Phase 1 foundation task (license, `.gitignore`, README stub, this file and the TypeScript toolchain).

## Where the work runs today

- Every change so far was made by Kiro CLI, driven over ACP by T3 Code. The installed binary reports `kiro-cli 3.3.0`. Which version the ACP session actually runs (the 3.3.0 binary or an earlier bundle) is experiment E11 in [PLAN.md](PLAN.md) section 10.8: not checked yet.
- The Kiro session doing this work has its workspace root at the outer folder `/Users/himanshujha/.t3/projects/kiro`, not at `wraith-kit/`. Kiro loads steering, hooks, agents, specs and MCP config from the session's workspace root, so anything in `wraith-kit/.kiro` does not load in this session. Until a Kiro session starts in `wraith-kit/`, the guard scripts are run by hand before each commit. No `.kiro` folder or guard script exists yet; both come in the next Phase 1 tasks.
- Checks run by hand before this task's commit: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:fast`, a scan of tracked files for the U+2014 character, and `git check-ignore .kiro` (it must report that `.kiro` is not ignored).

## Task log

| Task | Kiro surface | What happened |
|---|---|---|
| Plan, four drafts (commits `b7a7920`, `95932a0`, `166db36`, `f2bb4e4`) | Kiro CLI over ACP, through T3 Code | PLAN.md written on 15 Nov 2026, then revised after each of three design reviews |
| Plan approval (commit `2028ca2`) | Kiro CLI over ACP, through T3 Code | The approval and the author's answers to the open questions recorded in PLAN.md section 17 on 16 Nov 2026 |
| Phase 1 foundation (this commit) | Kiro CLI over ACP, through T3 Code | MIT license, `.gitignore`, README stub, this file, and the toolchain (TypeScript, ESLint, Vitest, fast-check) with its first test |

## Kiro surfaces used (IDE, CLI, Web, Crew) and how they differed

- **Kiro CLI:** used for all work so far, through T3 Code over ACP (see above).
- **Kiro IDE:** not used yet. Planned: the author runs the design phase of the `wraith-core` and `notice-ghoul` specs in the IDE, because the Correctness feature (properties extracted from EARS requirements) is IDE only (PLAN.md section 10.7).
- **Kiro Web:** not used yet. Not planned.
- **Kiro Crew:** not used yet. Not planned.
- **How they differed:** not yet. Only one surface has been used.

## Custom agents

Not yet. Two project agents are planned in `.kiro/agents/`: `skeleton-warden` (a reviewer) and `app-smith` (a builder for app #3) (PLAN.md section 10.5).

## Agent hooks

Not yet. No hook exists. Six hooks are planned for the next Phase 1 task: `tests-on-save`, `commit-guard`, `todo-afterlife-precommit`, `store-guard`, `doc-sync` and `spec-trace` (PLAN.md section 10.4). Because `wraith-kit/.kiro` does not load in the current session, the commit checks were run by hand for this task (listed above).

## Spec-driven development versus vibe coding

- So far the work has been plan-first: PLAN.md was written, reviewed three times and approved before any code or config was added.
- No Kiro spec exists yet. Eight are planned (`wraith-core`, `llm-adapter`, `approval-ui`, `runtimes`, `todo-afterlife`, `notice-ghoul`, `wraith-mcp`, `app-authoring`), each with requirements.md in EARS form, design.md and tasks.md (PLAN.md section 10.3).
- Comparison with vibe coding: not yet.

## Steering

Not yet. Five workspace steering files are planned: `product.md`, `tech.md` and `structure.md` (always included), `wraith-domain.md` (included for skeleton and app source files) and `skeleton-authoring.md` (how to make app #3) (PLAN.md section 10.2). Which strategy made the biggest difference: not yet.

## MCP

Not yet. No MCP server is configured for this repo. Planned: a custom `wraith` MCP server built in this repo and the AWS Documentation MCP server (PLAN.md section 10.6). For this task, the package docs (Vitest, fast-check, typescript-eslint, ESLint, TypeScript) were read with the session's web fetch tool, not through MCP.

## Property-based testing

- fast-check 4.10.2 runs inside Vitest. The first property tests are in `tests/pbt.test.ts`. They check the test helper `pbtRuns()` in `tests/pbt.ts`, which reads the run count for property tests from the `WRAITH_PBT_RUNS` variable: any positive integer string parses to itself, zero gives undefined, any string with a character that is not an ASCII digit gives undefined, and any string gives either undefined or a positive safe integer.
- What these tests caught so far: the first version of `pbtRuns()` took the value as a parameter that defaulted to `process.env.WRAITH_PBT_RUNS`. Under `npm run test:fast` (which sets `WRAITH_PBT_RUNS=20`), an example check failed: calling `pbtRuns(undefined)` returned 20, because an explicit `undefined` argument makes JavaScript use the default, which read the variable. The helper now takes an environment object instead. This was caught by an example-based check in fast mode, not by a property, and it is a test helper, not core logic.
- The core properties (idempotency and rule ordering among them, PLAN.md section 9) are not written yet. Kiro's Correctness feature has not been used yet.

## Kiro powers

Not yet. No power is installed. Candidates from the Kiro powers registry are listed in PLAN.md section 10.7; none is installed without the author's approval.

## Experiments

Not run yet. The experiments that check how hooks, steering and agents behave through T3 Code (E1 to E11, PLAN.md section 10.8) will be recorded, including failures, in `docs/experiments.md`, which is created in the hooks task.

## Steps run in the Kiro IDE

None yet.
