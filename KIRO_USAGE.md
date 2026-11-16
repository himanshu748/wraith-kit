# How Kiro is used in Wraith Kit

This file was written for the Kiroween 2026 hackathon write-up. It answers the Kiro questions from the [official rules](https://kiroween.devpost.com/rules) and is updated after every task. It records only what has happened so far. Anything that has not happened yet says "not yet", and anything not checked says "to confirm".

Last updated: 16 Nov 2026, in the Phase 1 hooks task (six agent hooks, their scripts and tests, and the hook experiments).

## Where the work runs today

- Every change so far was made by Kiro CLI, driven over ACP by T3 Code. Experiment E11 checked the running processes: this session's ACP process is `kiro-cli acp --agent-engine=v3 --auth-method=cli`, its executable is `/Users/himanshujha/.local/bin/kiro-cli` (`kiro-cli 3.3.0`), and it runs the 3.3.0 agent bundle on the V3 engine. Details in [docs/experiments.md](docs/experiments.md#e11-which-kiro-cli-version-does-the-acp-session-run).
- The Kiro session doing this work has its workspace root at the outer folder `/Users/himanshujha/.t3/projects/kiro`, not at `wraith-kit/`. Kiro loads steering, hooks, agents, specs and MCP config from the session's workspace root, so anything in `wraith-kit/.kiro` does not load in this session. The hooks in `wraith-kit/.kiro/hooks/` therefore do not guard this session's own commits. Instead, the commit guard is run by hand (`npm run guard`) on the staged tree before each commit, until a Kiro session starts in `wraith-kit/`.
- Checks run by hand before each commit of the hooks task: `npm run typecheck`, `npm run lint`, `npm test` and `npm run guard` (which runs the U+2014 scan, the `.kiro` and `.gitignore` check, the secret scan and the other checks in `scripts/guard-checks.json`).

## Task log

| Task | Kiro surface | What happened |
|---|---|---|
| Plan, four drafts (commits `b7a7920`, `95932a0`, `166db36`, `f2bb4e4`) | Kiro CLI over ACP, through T3 Code | PLAN.md written on 15 Nov 2026, then revised after each of three design reviews |
| Plan approval (commit `2028ca2`) | Kiro CLI over ACP, through T3 Code | The approval and the author's answers to the open questions recorded in PLAN.md section 17 on 16 Nov 2026 |
| Phase 1 foundation (commit `e4fe417`) | Kiro CLI over ACP, through T3 Code | MIT license, `.gitignore`, README stub, this file, and the toolchain (TypeScript, ESLint, Vitest, fast-check) with its first test |
| Hooks (commit `57567cb`) | Kiro CLI over ACP, through T3 Code | Six hooks in `.kiro/hooks/`, their scripts in `scripts/hooks/`, the guard check list `scripts/guard-checks.json`, and unit, property and integration tests in `tests/hooks/` |
| Hook experiments (this commit) | Kiro CLI over ACP, through T3 Code, plus two headless `kiro-cli chat` runs in a scratch folder | Experiments E2, E3, E4, E5, E10 and E11 run and recorded in [docs/experiments.md](docs/experiments.md); follow-ups in the guard (a time budget) and tests on the recorded payloads |

## Kiro surfaces used (IDE, CLI, Web, Crew) and how they differed

- **Kiro CLI:** used for all work so far, through T3 Code over ACP (see above). In the hooks task the CLI was also run headless, twice, as `kiro-cli chat --no-interactive` inside a gitignored scratch folder, to test hook behaviour. The first run started on the V2 engine (the default for `--no-interactive` without `--trust-all-tools`, per `kiro-cli chat --help`) and every tool call was denied; the second run, with `--agent-engine v3`, worked (docs/experiments.md).
- **Kiro IDE:** not used yet. Planned: the author runs the design phase of the `wraith-core` and `notice-ghoul` specs in the IDE, because the Correctness feature (properties extracted from EARS requirements) is IDE only (PLAN.md section 10.7).
- **Kiro Web:** not used yet. Not planned.
- **Kiro Crew:** not used yet. Not planned.
- **How they differed:** not yet. Only one surface has been used.

## Custom agents

Not yet. Two project agents are planned in `.kiro/agents/`: `skeleton-warden` (a reviewer) and `app-smith` (a builder for app #3) (PLAN.md section 10.5).

## Agent hooks

Six hooks live in `.kiro/hooks/`, one JSON file each, in the documented schema (`{"version": "v1", "hooks": [...]}` from [kiro.dev/docs/hooks](https://kiro.dev/docs/hooks)). Five run a Node script from `scripts/hooks/`; `doc-sync` is an agent prompt. None has fired yet as a hook of this repo, because no Kiro session has started in `wraith-kit/` (experiment E1). What was verified, and how:

| Hook | Trigger and matcher | What it does | How it was verified |
|---|---|---|---|
| `commit-guard` | `PreToolUse`, `shell`, timeout 180 s | For agent `git commit` commands: blocks (exit 2) `-a`/`--all`, `-i`/`--include`, `-o`/`--only`, `-p`/`--patch`, `--interactive`, `--pathspec-from-file`, pathspecs and a `git add` (or `rm`, `mv`, `stage`, `update-index`, `apply --cached`) earlier in the same call. Then runs every check in `scripts/guard-checks.json` on the staged index: `.kiro` not ignored, LICENSE present, secret scan of added lines, no `.env` files, every dependency listed in README "Pre-existing work", no em dashes, typecheck, lint, fast tests. Blocks if any check fails; fails closed on internal errors | Unit tests and three fast-check properties for commit detection (P-H1 to P-H3, below); integration tests that run the script in temporary git repos for every blocking case; tests on the payloads recorded in E2; run by hand with `npm run guard` before both commits of the hooks task (all required checks passed; core-integrity and fixture-demo-label skipped, as planned); exit-2 blocking and the timeout behaviour checked with lab hooks in E3 and E5 |
| `todo-afterlife-precommit` | `PreToolUse`, `shell`, timeout 30 s | For agent commits it prints `todo-afterlife-precommit: skipped: TODO Afterlife is not built yet`. The real run comes with the todo-afterlife build task. Fails open | Integration tests: the skip message, silence for other commands, and exit 0 with a warning when its modules cannot load |
| `store-guard` | `PreToolUse`, `write`, timeout 10 s | Blocks (exit 2) a file write whose target is inside `.wraith/` (the local action store and audit log). Fails open with a warning on a payload it does not recognise | Unit tests; integration tests, including the `fs_write` and `str_replace` payloads recorded in E2 |
| `tests-on-save` | `PostFileSave`, `\.(ts\|mjs)$`, timeout 60 s | For `.ts` and `.mjs` files under `skeleton/`, `apps/<name>/`, `tests/` or `scripts/`, runs `npx vitest related --run <file>` with fast property tests and sends failures back to the agent | Unit tests; an integration test that runs it on `tests/pbt.ts` (it ran the related test file and passed); the `PostFileSave` payload shape checked in E4 |
| `spec-trace` | `PostFileSave`, `\.kiro/specs/.*\.md$`, timeout 30 s | Reports duplicate or malformed requirement IDs, criteria not in EARS form, IDs with no design reference or task, and references to IDs that do not exist. Also `npm run spec:trace` (strict) | Unit tests and fixture specs in `tests/hooks/fixtures/spec-trace/`; `npm run spec:trace` run by hand (no specs exist yet, so it reported none) |
| `doc-sync` | `PostTaskExec`, no matcher | Agent prompt: after a spec task, update this file and the README sections the task affected with what happened, tick the task only if it is implemented and tested, and do not commit | Not verified yet. A schema test checks the file; whether `PostTaskExec` fires through T3 Code is experiment E6 |

Limits, stated plainly:

- A `git commit` typed in a terminal skips every Kiro hook. Only commands the Kiro agent runs reach them.
- Commit detection reads the shell command line. Commits hidden in scripts (`npm run x`, `./commit.sh`), git aliases (`git ci`), or strings run by another shell (`sh -c '...'`, `bash -c`, `eval`) are not detected. Commands inside `$(...)` and backticks are detected. A line that cannot be parsed and mentions git and commit is blocked.
- File triggers (`tests-on-save`, `spec-trace`) fire only on agent edits, not on saves made by hand. In E4, creating a file fired File Save as well as File Create.
- This session's own commits are not guarded by Kiro, because its workspace root is the outer folder. The guard was run by hand (`npm run guard`) before each commit instead.
- A `PreToolUse` hook that hits its timeout lets the tool call run (E5). So `commit-guard` gives its command checks a 150 s budget, below its 180 s hook timeout, and blocks when the budget runs out. The full guard took about 17 s on this repo when run by hand.
- Typecheck, lint and the fast tests run on the working tree, so unstaged edits can change their result. The other checks read the staged index.
- `store-guard` compares resolved paths and does not follow symbolic links. Only the `fs_write` and `str_replace` payloads were seen in E2.
- `todo-afterlife-precommit` and `store-guard` fail open on purpose (they guard against mistakes, not attacks). `commit-guard` fails closed, except on a Kiro timeout (above).

What the hook experiments found (details and raw payloads in [docs/experiments.md](docs/experiments.md)):

- E2: the shell tool is `execute_bash` with the command in `tool_input.command`; `fs_write` and `str_replace` put an absolute target path in `tool_input.path`. The scripts already read these fields first, so no code change was needed.
- E3: exit 2 from a `PreToolUse` hook blocks the shell call, and the hook's stderr reaches the model.
- E4: `PostFileSave` sends a top-level `file_path` with an absolute path. CLI 3.3.0 did not expand `{{filePath}}`; the script received the literal text, so the hook does not use it.
- E5: a timed-out `PreToolUse` hook does not block (see the limits above).
- E10: hooks in one file run one at a time, in file order, before the permission step. The order across files was not tested.

## Spec-driven development versus vibe coding

- So far the work has been plan-first: PLAN.md was written, reviewed three times and approved before any code or config was added.
- No Kiro spec exists yet. Eight are planned (`wraith-core`, `llm-adapter`, `approval-ui`, `runtimes`, `todo-afterlife`, `notice-ghoul`, `wraith-mcp`, `app-authoring`), each with requirements.md in EARS form, design.md and tasks.md (PLAN.md section 10.3).
- Comparison with vibe coding: not yet.

## Steering

Not yet. Five workspace steering files are planned: `product.md`, `tech.md` and `structure.md` (always included), `wraith-domain.md` (included for skeleton and app source files) and `skeleton-authoring.md` (how to make app #3) (PLAN.md section 10.2). Which strategy made the biggest difference: not yet.

## MCP

Not yet. No MCP server is configured for this repo. Planned: a custom `wraith` MCP server built in this repo and the AWS Documentation MCP server (PLAN.md section 10.6). For the foundation task, the package docs (Vitest, fast-check, typescript-eslint, ESLint, TypeScript) were read with the session's web fetch tool, not through MCP. For the hooks task, the five Kiro hook pages were read the same way; their `.md` exports leave out the JSON examples inside tabbed sections, so those examples were read from the HTML pages with `curl`.

## Property-based testing

- fast-check 4.10.2 runs inside Vitest. The first property tests are in `tests/pbt.test.ts`. They check the test helper `pbtRuns()` in `tests/pbt.ts`, which reads the run count for property tests from the `WRAITH_PBT_RUNS` variable: any positive integer string parses to itself, zero gives undefined, any string with a character that is not an ASCII digit gives undefined, and any string gives either undefined or a positive safe integer.
- What these tests caught so far: the first version of `pbtRuns()` took the value as a parameter that defaulted to `process.env.WRAITH_PBT_RUNS`. Under `npm run test:fast` (which sets `WRAITH_PBT_RUNS=20`), an example check failed: calling `pbtRuns(undefined)` returned 20, because an explicit `undefined` argument makes JavaScript use the default, which read the variable. The helper now takes an environment object instead. This was caught by an example-based check in fast mode, not by a property, and it is a test helper, not core logic.
- Hooks task: `tests/hooks/shell.test.ts` has three properties for the commit detection that `commit-guard` relies on. P-H1: any generated commit command (random git global options such as `-C`, `-c` and `--git-dir`, `env` and `VAR=value` prefixes, safe commit options, and messages with `&&`, `;`, `|` and quotes inside single or double quotes, chained with other commands) is found exactly once and is not unsafe. P-H2: adding any one unsafe form (`-a`, an `-a` cluster such as `-qa`, `--all`, `-i`, `--include`, `-o`, a pathspec, `-- <path>`, or a `git add` chained before it) makes it unsafe. P-H3: generated non-commit git commands (`log --grep commit`, `commit-tree`, `show commit` and others) and commands that only mention `git commit` (`echo`, `grep`) are never commits. They ran with fast-check's default run count in `npm test`, and once by hand with `WRAITH_PBT_RUNS=5000` (all 74 tests in that file passed). The only failure so far was in a generator, not in the code: P-H3 built a `#` comment followed by a joined command that had a newline inside quotes, which is not valid shell. The generator was fixed and the parser left as it was.
- Example-based tests caught real bugs in the guard while it was built: `git check-ignore -q` with two paths exits 128 (the guard failed closed on it and blocked), `--static-only` was applied after the missing-tool check, and the diff parser read an added line starting with `++ ` as a file header. All three are fixed and covered by tests.
- The core properties (idempotency and rule ordering among them, PLAN.md section 9) are not written yet. Kiro's Correctness feature has not been used yet.

## Kiro powers

Not yet. No power is installed. Candidates from the Kiro powers registry are listed in PLAN.md section 10.7; none is installed without the author's approval.

## Experiments

The experiments that check how hooks, steering and agents behave in this setup (E1 to E11, PLAN.md section 10.8) are recorded, including failures, in [docs/experiments.md](docs/experiments.md).

- Run in the hooks task: E2, E3, E4, E5 and E10 (two headless `kiro-cli chat` runs in a gitignored scratch folder; the first, on the default V2 engine, failed on tool permissions, and the second, on V3, answered all five), and E11 (from the process list).
- Not run yet: E1, E6, E7 and E8 need a Kiro session started in `wraith-kit/` (or, for E7 and E8, the steering and agents tasks); E9 belongs to the MCP task.

## Steps run in the Kiro IDE

None yet.
