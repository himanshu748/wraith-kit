# How Kiro is used in Wraith Kit

This file was written for the Kiroween 2026 hackathon write-up. It answers the Kiro questions from the [official rules](https://kiroween.devpost.com/rules) and is updated after every task. It records only what has happened so far. Anything that has not happened yet says "not yet", and anything not checked says "to confirm".

Last updated: 16 Nov 2026, in the Phase 1 steering, agents and MCP task (five steering files, two custom agents, the MCP config and experiment E7).

## Where the work runs today

- Every change so far was made by Kiro CLI, driven over ACP by T3 Code. Experiment E11 checked the running processes: this session's ACP process is `kiro-cli acp --agent-engine=v3 --auth-method=cli`, its executable is `/Users/himanshujha/.local/bin/kiro-cli` (`kiro-cli 3.3.0`), and it runs the 3.3.0 agent bundle on the V3 engine. Details in [docs/experiments.md](docs/experiments.md#e11-which-kiro-cli-version-does-the-acp-session-run).
- The Kiro session doing this work has its workspace root at the outer folder `/Users/himanshujha/.t3/projects/kiro`, not at `wraith-kit/`. Kiro loads steering, hooks, agents, specs and MCP config from the session's workspace root, so anything in `wraith-kit/.kiro` does not load in this session. The hooks in `wraith-kit/.kiro/hooks/` therefore do not guard this session's own commits. Instead, the commit guard is run by hand (`npm run guard`) on the staged tree before each commit, until a Kiro session starts in `wraith-kit/`.
- Checks run by hand before each commit of the hooks task and of the steering, agents and MCP task: `npm run typecheck`, `npm run lint`, `npm test` and `npm run guard` (which runs the U+2014 scan, the `.kiro` and `.gitignore` check, the secret scan and the other checks in `scripts/guard-checks.json`).

## Task log

| Task | Kiro surface | What happened |
|---|---|---|
| Plan, four drafts (commits `b7a7920`, `95932a0`, `166db36`, `f2bb4e4`) | Kiro CLI over ACP, through T3 Code | PLAN.md written on 15 Nov 2026, then revised after each of three design reviews |
| Plan approval (commit `2028ca2`) | Kiro CLI over ACP, through T3 Code | The approval and the author's answers to the open questions recorded in PLAN.md section 17 on 16 Nov 2026 |
| Phase 1 foundation (commit `e4fe417`) | Kiro CLI over ACP, through T3 Code | MIT license, `.gitignore`, README stub, this file, and the toolchain (TypeScript, ESLint, Vitest, fast-check) with its first test |
| Hooks (commit `57567cb`) | Kiro CLI over ACP, through T3 Code | Six hooks in `.kiro/hooks/`, their scripts in `scripts/hooks/`, the guard check list `scripts/guard-checks.json`, and unit, property and integration tests in `tests/hooks/` |
| Hook experiments (commit `c8ae2c4`) | Kiro CLI over ACP, through T3 Code, plus two headless `kiro-cli chat` runs in a scratch folder | Experiments E2, E3, E4, E5, E10 and E11 run and recorded in [docs/experiments.md](docs/experiments.md); follow-ups in the guard (a time budget) and tests on the recorded payloads |
| Steering (commit `cc5b835`) | Kiro CLI over ACP, through T3 Code | Five steering files in `.kiro/steering/`, the stub of `docs/make-your-own-app-in-15-min.md`, and `tests/kiro/steering.test.ts` (front matter, file references, and the spec ID examples in `structure.md` run through the spec-trace parser) |
| Custom agents and MCP (this commit) | Kiro CLI over ACP, through T3 Code, plus one headless `kiro-cli chat` run in `wraith-kit/` | `skeleton-warden` and `app-smith` in `.kiro/agents/`, the `aws-docs` server in `.kiro/settings/mcp.json`, `tests/kiro/agents.test.ts`, and experiment E7 |

## Kiro surfaces used (IDE, CLI, Web, Crew) and how they differed

- **Kiro CLI:** used for all work so far, through T3 Code over ACP (see above). In the hooks task the CLI was also run headless, twice, as `kiro-cli chat --no-interactive` inside a gitignored scratch folder, to test hook behaviour. The first run started on the V2 engine (the default for `--no-interactive` without `--trust-all-tools`, per `kiro-cli chat --help`) and every tool call was denied; the second run, with `--agent-engine v3`, worked (docs/experiments.md). In the steering, agents and MCP task it ran headless once more, with `--agent-engine v3` from the `wraith-kit/` root, to see which steering files load (E7). The CLI also validated the agent files (`kiro-cli agent validate`) and listed agents and MCP servers (`kiro-cli agent list`, `kiro-cli mcp list`).
- **Kiro IDE:** not used yet. Planned: the author runs the design phase of the `wraith-core` and `notice-ghoul` specs in the IDE, because the Correctness feature (properties extracted from EARS requirements) is IDE only (PLAN.md section 10.7).
- **Kiro Web:** not used yet. Not planned.
- **Kiro Crew:** not used yet. Not planned.
- **How they differed:** not yet. Only one surface has been used.

## Custom agents

Two project agents live in `.kiro/agents/`, one JSON file each, using only fields from the [agent configuration reference](https://kiro.dev/docs/custom-agents/configuration-reference) and rule syntax from [Permissions](https://kiro.dev/docs/permissions) (read 16 Nov 2026). Neither has been used for real work yet: their first real use is **not yet** (`skeleton-warden` needs the skeleton and an app to review; `app-smith` needs the skeleton, its template and the `new-app` scaffold).

| Agent | Serves | Tools | Permission rules | Loads (`resources`) |
|---|---|---|---|---|
| `skeleton-warden` | The skeleton and both apps: a reviewer that checks the Skeleton Crew claim | `read`, `write`, `shell` | Writes allowed under `docs/reviews/**` and denied everywhere else. Shell allowed for `npm test`, `npm run spec:trace`, `git log`, `git ls-files`, `git status` and `date`, and denied for every other command. Reading `.env` files denied (`.env.example` excepted) | `product.md`, `structure.md`, `wraith-domain.md` |
| `app-smith` | App #3: a builder that follows the 15-minute guide and rehearses it on a scratch app | `read`, `write`, `shell` | Writes allowed under `apps/**` and `docs/**`, except `apps/todo-afterlife/` and `apps/notice-ghoul/`; writes to `skeleton/**`, the two apps and everywhere else denied. Shell allowed for `npm run new-app *` (the scaffold, not built yet), `npm install`, the new app's tests (`npm test -w apps/*`, `npm test --workspace=apps/*`, `npx vitest run apps/*`), `git status` and `date`, and denied for every other command. Reading `.env` files denied | `skeleton-authoring.md`, `structure.md`, `docs/make-your-own-app-in-15-min.md` |

- **What `skeleton-warden` checks** (its prompt): apps import only the skeleton's package exports; the core keeps its line budget and imports only Node built-ins; no app file copies a skeleton file or carries its marker banner; `npm run spec:trace` passes and property IDs are named in tests; no app id appears under `skeleton/src/`. It writes `docs/reviews/<YYYY-MM-DD>.md` with the commands it ran, their exit codes and every finding with a file and line, and marks a check "not checked" when what it needs does not exist yet. The core budget script and the scaffold are named in its prompt as "when present"; the permission rules get them when they exist.
- **`app-smith`'s rehearsal rules** (its prompt): start only on a clean working tree; build the scratch app in `apps/scratch-<short-name>/`, which is never committed; time it with `date` at the start and end and report that as agent time, never as a person's time; report every step that did not work as written; do not clean up, because the main session deletes the scratch folder, restores `package-lock.json` from `HEAD` and checks `git status` (PLAN.md section 10.5).
- **Steering in agents.** The [Steering](https://kiro.dev/docs/steering) page says custom agents do not load steering automatically and must list it in `resources`. The configuration reference says custom agents inherit default resources, steering included, unless `chat.disableInheritingDefaultResources` is set. The pages disagree, so each agent lists the steering it needs in `resources` either way.
- **Validation.** `kiro-cli agent validate --path .kiro/agents/skeleton-warden.json` and the same for `app-smith.json` both exited 0 and printed nothing (also nothing with `-v`). A check with throwaway files outside the repo showed what `validate` covers in CLI 3.3.0: it rejected broken JSON (exit 1, "EOF while parsing a list") and a wrong field type (exit 1, `invalid type: string "read", expected a sequence`), but accepted an unknown field, a legacy `toolsSettings` profile, and a rule with capability `fs_wrte` and effect `maybe` (all exit 0). So `tests/kiro/agents.test.ts` checks what `validate` does not: only documented fields, tool selectors, capabilities and effects, resources that exist, the write and shell limits above, and the prompt rules.
- **Discovery.** `kiro-cli agent list`, run in `wraith-kit/`, lists both as `Workspace (v3 format)` next to the built-in `kiro_default`, `kiro_help` and `kiro_planner`. In the E7 headless run both appeared in the session's available commands as type `custom-agent`. Selecting one through T3 Code (ACP `session/set_mode`) and running one as a sub-agent are experiment E8, not run yet.
- **To confirm** (the docs leave these open): whether `fs_write` match paths are relative to the workspace root (the docs' examples, such as `src/**`, suggest so); whether a shell pattern without `*`, such as `npm install`, also matches a longer command (the docs say shell patterns match "command prefixes"); and whether `exclude` works on `deny` rules as it does on the documented `allow` example. The catch-all `deny` rules with an `exclude` list are written so that, if `exclude` works as documented, only the listed commands and paths stay open.

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

Five workspace steering files live in `.kiro/steering/`, with front matter as the [Steering](https://kiro.dev/docs/steering) page documents:

| File | Inclusion | What it holds | Why this mode |
|---|---|---|---|
| `product.md` | `always` | What Wraith Kit is, the three audiences, the Skeleton Crew fit, the honesty rules (DEMO labels, AI output labelled with provider and model, nothing auto-posts, no invented users or numbers), the five judging criteria (pointing to PLAN.md section 4), and how Notice Ghoul stays different from Deadline Graveyard | Every task, code or docs, has to respect these |
| `tech.md` | `always` | Node 22, strict TypeScript, ESM; the zero-dependency core and the runtime entries; Vitest and fast-check with `WRAITH_PBT_RUNS`; free tiers only and the `none`/`modal`/`ollama` LLM adapter; "confirm every API in official docs, never guess, mark the rest to confirm"; the secrets policy; no em dashes; the commands to run | Every code change needs the stack and the rules |
| `structure.md` | `always` | The folder layout, the extension-point boundary (apps import only the skeleton's package exports), naming, where tests go, the spec ID convention that `scripts/hooks/spec-trace.mjs` parses, and how tests name the property or requirement they check | Specs, code and tests all have to use the same layout and IDs |
| `wraith-domain.md` | `fileMatch`, `["skeleton/src/**", "apps/*/src/**"]` | Twelve invariants (approval by default, deterministic keys, pure rules, who writes records, `sourcedBy`, server-side `parseValue`, one store write per event, untrusted LLM output, approval for unconfirmed LLM data, audit in the same write, escaping in every output, DEMO labels), each with its PLAN.md section | Only needed when skeleton or app source is being worked on, so it stays out of docs and hook work |
| `skeleton-authoring.md` | `auto`, with `name: skeleton-authoring` and a description about building a new Wraith app | How to build app #3 from extension points only: the minimal path (one source, one rule, one action kind), the optional extension points, what never to do, how the core-integrity test proves it, and `#[[file:docs/make-your-own-app-in-15-min.md]]` | Only app authors need it; `auto` offers it when the request matches, and it is also a slash command |

- **Strategy:** three small always-on files carry what every task needs (product, tech, structure); a `fileMatch` domain file loads only when skeleton or app source is involved; an `auto` file serves app authors. The custom agents list the files they need in `resources`.
- **The 15-minute guide** is a stub for now (`docs/make-your-own-app-in-15-min.md`: title, "Status: not written yet", the planned outline, and the note that "15 min" is a goal and that agent time and a human run will be reported separately). It is written in the app-authoring task, after the skeleton exists.
- **Tests:** `tests/kiro/steering.test.ts` checks the five files' front matter, that every `#[[file:...]]` reference resolves, and that the requirements, design and tasks examples in `structure.md` pass the spec-trace parser with no findings.
- **What loaded (E7, one headless V3 run from `wraith-kit/`):** Kiro's own `steering_inclusion` event listed `product.md`, `structure.md` and `tech.md`, loaded in full. `skeleton-authoring.md` was offered by name and description only (progressively loaded, like a skill) and as the slash command `/skeleton-authoring`; the agent offered to activate it, so its body was not loaded in that one turn. `wraith-domain.md` did not load, as expected with no source file involved. So `skeleton-authoring.md` stays `auto`. Details in [docs/experiments.md](docs/experiments.md#e7-does-auto-steering-inclusion-trigger-in-cli-v3).
- This session's own work does not load these files, because its workspace root is the outer folder (see above). They were written by hand from PLAN.md.
- Which strategy made the biggest difference: not yet.

## MCP

- **Configured:** one server, `aws-docs`, in `.kiro/settings/mcp.json`: `uvx awslabs.aws-documentation-mcp-server@1.2.5` with `FASTMCP_LOG_LEVEL=ERROR` and `AWS_DOCUMENTATION_PARTITION=aws`, as the [AWS Documentation MCP server README](https://github.com/awslabs/mcp/tree/main/src/aws-documentation-mcp-server) shows. The README uses `@latest`; the config pins 1.2.5, the latest release on PyPI on 16 Nov 2026 (Apache-2.0, Python 3.10 or later), so the server cannot change under us. The README's optional `MCP_USER_AGENT` is left out: it is only for corporate proxies, and the default is already a browser-style User-Agent. It needs no AWS credentials.
- **What it is for:** confirming SAM, Lambda, Function URL, DynamoDB, EventBridge Scheduler and SSM details and the free-tier limits in AWS's own docs while the `runtimes` spec and the AWS stacks are written (PLAN.md section 10.6). Its tools: `read_documentation`, `read_sections`, `search_table`, `search_documentation`, `recommend`.
- **Checked:** a stdio MCP handshake, run by hand from `/tmp` with the AWS config and credentials files pointed at `/dev/null`, got `initialize` back from `awslabs.aws-documentation-mcp-server` (protocol `2025-06-18`) and a `tools/list` with those five tools, in 1.5 s, exit 0. (`uvx awslabs.aws-documentation-mcp-server@1.2.5 --help` printed no help and exited 0: the server has no `--help` and just ran until its input closed.) `kiro-cli mcp list` run in `wraith-kit/` printed `aws-docs  uvx` under the default agent `kiro_default`; run in `/tmp` it printed none, so the entry comes from this repo's workspace config, not from global config.
- **Used in a session:** not yet. This session's workspace root is the outer folder, so `wraith-kit/.kiro/settings/mcp.json` does not load here. In the E7 headless run the context breakdown showed 0 tokens of MCP tools, so the server's tools were not in that short run's context (whether the server had started is not shown: to confirm). What it enabled: not yet.
- **Context7 left out.** Its docs do not say the remote server works without an API key on a free plan: [Plans & Pricing](https://context7.com/docs/plans-pricing) gives the Free plan's 1,000 calls a month "with a free account and an API key", the [API guide](https://context7.com/docs/api-guide) says only "Without API key: Low rate limits" with no number, and the [API keys guide](https://context7.com/docs/howto/api-keys) says coding agents sign in with OAuth in the browser. A sign-in is the author's step, so it can be added later if the author creates a free account.
- **Not added yet:** the `wraith` MCP server (built in this repo in Phase 2, then added to `mcp.json` and to the agents that need it) and Playwright MCP (optional in PLAN.md, and on the cut list).
- **How docs were read so far:** in every task so far, the package docs, the Kiro pages and the AWS Documentation MCP server README were read with the session's web fetch tool or `curl`, not through MCP. The Kiro `.md` exports leave out the JSON examples inside tabbed sections, so those were read from the HTML pages.

## Property-based testing

- fast-check 4.10.2 runs inside Vitest. The first property tests are in `tests/pbt.test.ts`. They check the test helper `pbtRuns()` in `tests/pbt.ts`, which reads the run count for property tests from the `WRAITH_PBT_RUNS` variable: any positive integer string parses to itself, zero gives undefined, any string with a character that is not an ASCII digit gives undefined, and any string gives either undefined or a positive safe integer.
- What these tests caught so far: the first version of `pbtRuns()` took the value as a parameter that defaulted to `process.env.WRAITH_PBT_RUNS`. Under `npm run test:fast` (which sets `WRAITH_PBT_RUNS=20`), an example check failed: calling `pbtRuns(undefined)` returned 20, because an explicit `undefined` argument makes JavaScript use the default, which read the variable. The helper now takes an environment object instead. This was caught by an example-based check in fast mode, not by a property, and it is a test helper, not core logic.
- Hooks task: `tests/hooks/shell.test.ts` has three properties for the commit detection that `commit-guard` relies on. P-H1: any generated commit command (random git global options such as `-C`, `-c` and `--git-dir`, `env` and `VAR=value` prefixes, safe commit options, and messages with `&&`, `;`, `|` and quotes inside single or double quotes, chained with other commands) is found exactly once and is not unsafe. P-H2: adding any one unsafe form (`-a`, an `-a` cluster such as `-qa`, `--all`, `-i`, `--include`, `-o`, a pathspec, `-- <path>`, or a `git add` chained before it) makes it unsafe. P-H3: generated non-commit git commands (`log --grep commit`, `commit-tree`, `show commit` and others) and commands that only mention `git commit` (`echo`, `grep`) are never commits. They ran with fast-check's default run count in `npm test`, and once by hand with `WRAITH_PBT_RUNS=5000` (all 74 tests in that file passed). The only failure so far was in a generator, not in the code: P-H3 built a `#` comment followed by a joined command that had a newline inside quotes, which is not valid shell. The generator was fixed and the parser left as it was.
- Example-based tests caught real bugs in the guard while it was built: `git check-ignore -q` with two paths exits 128 (the guard failed closed on it and blocked), `--static-only` was applied after the missing-tool check, and the diff parser read an added line starting with `++ ` as a file header. All three are fixed and covered by tests.
- The core properties (idempotency and rule ordering among them, PLAN.md section 9) are not written yet. Kiro's Correctness feature has not been used yet.

## Kiro powers

Not yet. No power is installed. The candidates from the Kiro powers registry ("AWS Core", "Local AWS Emulator & Learning Environment", "GitWarren") are listed in PLAN.md section 10.7; their terms, licenses and credential needs are to confirm, and none is installed without the author's approval.

## Experiments

The experiments that check how hooks, steering and agents behave in this setup (E1 to E11, PLAN.md section 10.8) are recorded, including failures, in [docs/experiments.md](docs/experiments.md).

- Run in the hooks task: E2, E3, E4, E5 and E10 (two headless `kiro-cli chat` runs in a gitignored scratch folder; the first, on the default V2 engine, failed on tool permissions, and the second, on V3, answered all five), and E11 (from the process list).
- Run in the steering, agents and MCP task: E7 (one headless V3 run from the `wraith-kit/` root; the `always` files loaded in full and the `auto` file was offered by name and description). It also gave related evidence for E8: both project agents were offered as commands.
- Not run yet: E1, E6 and E8 need a Kiro session started in `wraith-kit/`; E9 belongs to the `wraith` MCP server task.

## Steps run in the Kiro IDE

None yet.
