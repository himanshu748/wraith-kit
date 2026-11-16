# Kiro experiments

This file records the experiments from [PLAN.md](../PLAN.md) section 10.8: questions the Kiro docs leave open for this setup (Kiro CLI driven over ACP by T3 Code). Each section gives the question, the method, the raw evidence, the result and what changed in the hook scripts because of it. Failures are recorded too.

All experiments so far ran on Mon 16 Nov 2026 (IST), in the hooks task.

## Setup used for E2, E3, E4, E5 and E10

The Kiro session that does this work starts in the outer folder `/Users/himanshujha/.t3/projects/kiro`, so `wraith-kit/.kiro` does not load in it. The hook experiments therefore ran in headless `kiro-cli chat` sessions started inside a scratch folder:

- **Lab folder:** `wraith-kit/.scratch/hook-lab` (gitignored through `.scratch/`; called `<lab>` below). It was made its own git repository (`git init`) so that it was the session's workspace root. It was deleted after the runs.
- **Lab hooks:** one file, `<lab>/.kiro/hooks/lab.json`, with eight hooks. Each ran `node <lab>/log.mjs <hook-name>`, which appended its name, its arguments, its working directory and the raw STDIN to `<lab>/log.jsonl`.

| Hook | Trigger | Matcher | What it did |
|---|---|---|---|
| `e2-shell-a` | `PreToolUse` | `shell` | Logged STDIN (first in the file) |
| `e10-shell-b` | `PreToolUse` | `shell` | Logged STDIN (second in the file) |
| `e3-block` | `PreToolUse` | `shell` | Logged STDIN; exit 2 with a stderr message when the command contained `wraith-block-me` |
| `e5-slow` | `PreToolUse` | `shell` | Logged STDIN; `timeout` 5; slept 20 s when the command contained `wraith-slow`, then logged `slow-done` |
| `post-shell` | `PostToolUse` | `shell` | Logged STDIN, to show whether each command ran |
| `e2-write` | `PreToolUse` | `write` | Logged STDIN |
| `e4-create` | `PostFileCreate` | `\.ts$` | Logged STDIN and argv; the command ended in `{{filePath}}` |
| `e4-save` | `PostFileSave` | `\.ts$` | Logged STDIN and argv; the command ended in `{{filePath}}` |

`post-shell` and `e4-create` were added to the planned lab: the first shows whether a command really ran, and the second covers the case where creating a file fires File Create and not File Save.

- **Prompt** (the planned prompt, plus an edit step so File Save has an edit to fire on, plus a last sentence to keep the run small): "Run these shell commands one at a time and tell me after each whether it ran: echo wraith-e2, echo wraith-block-me, echo wraith-slow. Then create the file notes/sample.ts containing: export const x = 1; Then edit notes/sample.ts so that it contains: export const x = 2;" Run 2 added "Do not run any other commands."
- **Runs:** two headless runs, the most allowed for this task. Both used `--trust-workspace`, `--trust-tools=execute_bash,fs_write,fs_read`, `--output-format stream-json`, STDIN from `/dev/null`, and a 290 s kill timer.

### Run 1: the default engine (failed)

Command: `kiro-cli chat --no-interactive --trust-workspace --trust-tools=execute_bash,fs_write,fs_read --output-format stream-json "<prompt>"`, from 21:57:33 to 21:58:23, exit 0.

- The first event was `{"type": "runStarted", "data": {"payloadSchema": "acp", "acpProtocolVersion": 1, "engine": "v2"}}`. `kiro-cli chat --help` explains why: "When nothing selects an engine: ... v2 with --no-interactive or piped stdin (v3 with --trust-all-tools)".
- Every tool call failed. stderr had four lines of `[denied] tool permission approval is not supported in non-interactive mode. Use --trust-all-tools to auto-approve.` So on the V2 engine the trust list did not trust these tools.
- No lab hook ran (`log.jsonl` was never created) and `notes/sample.ts` was not created.
- The ACP events still showed the tool calls, for example `"rawInput": {"command": "echo wraith-e2"}` with `"_meta": {"kiro": {"toolName": "shell"}}`. Those are ACP fields, not hook STDIN.
- Credits used, from the stream's metering: 0.3165 (five entries).

### Run 2: the V3 engine (worked)

Command: `kiro-cli chat --agent-engine v3 --no-interactive --trust-workspace --trust-tools=execute_bash,fs_write,fs_read --output-format stream-json "<prompt>"`, from 22:00:37 to 22:01:24, exit 0.

- First event: `"engine": "v3"`. Session id `sess_2164ea2f-62d9-4645-8954-3f302437aabd`.
- The trust list worked: each shell call raised a `tool_approval` interaction that resolved to `accept` without a prompt.
- stderr had one `HTTP 429 ... ThrottlingException ... USER_REQUEST_RATE_EXCEEDED` line and six `GenerateAssistantResponseCommand done` lines. The run still finished with `"status": "success"`.
- Credits used, from the turn summary: 0.5292 (tools used: `execute_bash` three times, `fs_write`, `str_replace`).
- `log.jsonl` got 38 lines. Every ACP `hook_update` event named a hook in `<lab>/.kiro/hooks/lab.json`, so the lab was the workspace root and `wraith-kit/.kiro/hooks` did not load.
- The agent's final answer:

  > - `echo wraith-e2` ran and printed `wraith-e2`.
  > - `echo wraith-block-me` did not run. The `e3-block` PreToolUse hook blocked it with exit 2 because the command contains `wraith-block-me`.
  > - `echo wraith-slow` ran and printed `wraith-slow`.
  > - I created `notes/sample.ts` with `export const x = 1;`, then edited it to `export const x = 2;`. I didn't read the file back afterward.
  >
  > I ran no other commands.

- Timeline from `log.jsonl` (IST; `<lab>` replaces the lab's absolute path):

| Time | Hook | Event | Exit |
|---|---|---|---|
| 22:00:50.986 | `e2-shell-a` | PreToolUse `execute_bash` `echo wraith-e2` | 0 |
| 22:00:51.040 | `e10-shell-b` | same | 0 |
| 22:00:51.088 | `e3-block` | same | 0 |
| 22:00:51.140 | `e5-slow` | same | 0 |
| 22:00:51.316 | `post-shell` | PostToolUse, `tool_response` `"Output:\nwraith-e2\n\n\nExit Code: 0"` | 0 |
| 22:00:57.140 to .294 | `e2-shell-a`, `e10-shell-b`, `e3-block`, `e5-slow` | PreToolUse `echo wraith-block-me` | 0, 0, **2**, 0 |
| (none) | `post-shell` | no PostToolUse for `echo wraith-block-me` | |
| 22:01:02.133 to .235 | `e2-shell-a`, `e10-shell-b`, `e3-block` | PreToolUse `echo wraith-slow` | 0 |
| 22:01:02.281 | `e5-slow` | same; logged `sleeping` (20 s) | none logged |
| 22:01:07.345 | `post-shell` | PostToolUse, `tool_response` `"Output:\nwraith-slow\n\n\nExit Code: 0"` | 0 |
| 22:01:12.369 | `e2-write` | PreToolUse `fs_write` `<lab>/notes/sample.ts` | 0 |
| 22:01:12.448 | `e4-create` | PostFileCreate `<lab>/notes/sample.ts` | 0 |
| 22:01:12.500 | `e4-save` | PostFileSave `<lab>/notes/sample.ts` | 0 |
| 22:01:17.576 | `e2-write` | PreToolUse `str_replace` `<lab>/notes/sample.ts` | 0 |
| 22:01:17.642 | `e4-save` | PostFileSave `<lab>/notes/sample.ts` | 0 |

The first payload of each kind is kept, with `<lab>` written as `/path/to/workspace`, in `tests/hooks/fixtures/payloads/`, and `tests/hooks/recorded-payloads.test.ts` runs the hook scripts on them.

## E1: Do `.kiro/hooks/` hooks fire inside the T3 Code ACP session?

- **Question:** do the repo's hooks fire in a T3 Code session over ACP that starts in `wraith-kit/`?
- **Method:** needs a Kiro session started in `wraith-kit/` (PLAN.md section 17.2 item 1).
- **Result:** not run yet: needs a Kiro session started in `wraith-kit/`. Related evidence: the headless V3 run (same `kiro-cli 3.3.0` bundle as the ACP session, see E11) did load and run workspace hooks, and the ACP event stream reported each hook run as a `hook_update` event. That is not the same as a T3 Code session, so E1 stays open.
- **Follow-up:** until then the guard is run by hand (`npm run guard`) before each commit.

## E2: Shell tool ID, command field and write path field

- **Question:** what is the shell tool's ID, which `tool_input` field holds the command, and which field holds the target path of the write tools?
- **Method:** run 2 above (`e2-shell-a`, `e2-write`).
- **Evidence** (STDIN of `e2-shell-a` for the first command, and of `e2-write` for the two writes):

```json
{"session_id": "sess_2164ea2f-62d9-4645-8954-3f302437aabd", "hook_event_name": "PreToolUse", "cwd": "<lab>", "tool_name": "execute_bash", "tool_input": {"command": "echo wraith-e2", "description": "Run first echo command", "cwd": null, "run_in_background": false, "timeout": null}}
{"session_id": "sess_2164ea2f-62d9-4645-8954-3f302437aabd", "hook_event_name": "PreToolUse", "cwd": "<lab>", "tool_name": "fs_write", "tool_input": {"path": "<lab>/notes/sample.ts", "text": "export const x = 1;"}}
{"session_id": "sess_2164ea2f-62d9-4645-8954-3f302437aabd", "hook_event_name": "PreToolUse", "cwd": "<lab>", "tool_name": "str_replace", "tool_input": {"path": "<lab>/notes/sample.ts", "oldStr": "export const x = 1;", "newStr": "export const x = 2;", "replace_all": false}}
```

- **Result:** on CLI 3.3.0 with the V3 engine, the shell tool is `execute_bash` and the command is in `tool_input.command`. The write tools seen were `fs_write` and `str_replace`; both put the target in `tool_input.path`, as an absolute path. The `shell` and `write` matchers matched them. There was no `tool_tags` field, as the hooks migration page says for V3. The hook's working directory and the payload's `cwd` were both the workspace root.
- **Follow-up:** `scripts/hooks/lib/event.mjs` already checked `command` and `path` first, so no code change was needed. Its comments now record the confirmed fields, and the other candidate fields stay as a fallback for surfaces and versions not tested. Other write tools (for example `fs_append` or `delete_file`) were not seen.

## E3: Does exit 2 block, and where does stderr show?

- **Question:** does exit 2 from a `PreToolUse` hook block the shell call in CLI V3, and where does stderr appear?
- **Method:** run 2 above (`e3-block` on `echo wraith-block-me`).
- **Evidence:** `e3-block` logged exit 2 for `echo wraith-block-me`. No `post-shell` entry followed for that command. The ACP stream ended that tool call with `"status": "failed"` and no output content. The agent wrote: "The second command, `echo wraith-block-me`, did not run. A PreToolUse hook (`e3-block`) blocked it because the command contains `wraith-block-me`."
- **Result:** exit 2 blocks the shell call. The hook's stderr reached the model: the agent repeated the reason and the exit code, which were in the hook's stderr message (`lab-e3: blocked by the e3-block hook (exit 2) because the command contains wraith-block-me`). The stderr text did not appear as such in the ACP event stream. The hook after it in the file (`e5-slow`) still ran for the blocked command, so one hook blocking does not stop the others. Other non-zero exit codes were not tested; the two docs pages disagree on them (PLAN.md section 10.4), and the guards only use exit 2.
- **Follow-up:** none needed. `commit-guard` and `store-guard` block with exit 2 and put the reason on stderr.

## E4: The PostFileSave payload and `{{filePath}}`

- **Question:** what is the shape of the `PostFileSave` STDIN payload, is the path relative or absolute, what does the matcher see, and does CLI V3 expand `{{filePath}}`?
- **Method:** run 2 above (`e4-create` and `e4-save`, both with `{{filePath}}` at the end of the command).
- **Evidence:**

```json
{"session_id": "sess_2164ea2f-62d9-4645-8954-3f302437aabd", "hook_event_name": "PostFileCreate", "cwd": "<lab>", "file_path": "<lab>/notes/sample.ts"}
{"session_id": "sess_2164ea2f-62d9-4645-8954-3f302437aabd", "hook_event_name": "PostFileSave", "cwd": "<lab>", "file_path": "<lab>/notes/sample.ts"}
```

  Both hooks logged `"argv": ["e4-save", "{{filePath}}"]` (and `e4-create` the same), so the script received the literal text `{{filePath}}`.
- **Result:** the payload has a top-level `file_path` with an absolute path. The `\.ts$` matcher matched it. CLI 3.3.0 (V3) did **not** expand `{{filePath}}`. Creating the file with `fs_write` fired both `PostFileCreate` and `PostFileSave`; the `str_replace` edit fired `PostFileSave`.
- **Follow-up:** `tests-on-save` already reads `file_path` from STDIN, normalises it to a repo-relative path and ignores a literal `{{filePath}}` argument. Its hook keeps the command without `{{filePath}}`. The `spec-trace` matcher (`\.kiro/specs/.*\.md$`) is unanchored at the start, so it matches the absolute path. Because File Save also fires on creation, `tests-on-save` runs for new files as well; its comment says so.

## E5: Does a timed-out `PreToolUse` hook block or allow?

- **Question:** when a `PreToolUse` command hook hits its `timeout`, is the tool call blocked or allowed?
- **Method:** run 2 above (`e5-slow`, `timeout` 5, sleeping 20 s on `echo wraith-slow`).
- **Evidence:** `e5-slow` started at 22:01:02.281 and logged `sleeping`. At 22:01:07.345, 5.06 s later, `post-shell` logged the PostToolUse event for `echo wraith-slow` with output `wraith-slow` and exit code 0, and the agent reported that the command ran. `e5-slow` never logged `slow-done`, although the session lasted until about 22:01:24, after the 20 s sleep would have ended (22:01:22.3). The ACP `hook_update` event for `e5-slow` said `"status": "completed"`.
- **Result:** a timed-out `PreToolUse` hook does **not** block: the tool call runs after the timeout. The hook process was most likely stopped at the timeout, because it never wrote its last line (to confirm). For `commit-guard` this means a timeout lets the commit through.
- **Follow-up:** PLAN.md section 10.8 says to move slow checks out of the guard if a timeout allows the call. The checks stay in the guard for now, because the full guard took about 17 s on this repo against the 180 s timeout. Instead, `scripts/hooks/lib/guard.mjs` gives the command checks (typecheck, lint, fast tests, core integrity) a 150 s budget: a command still running at the budget is stopped and fails, later command checks fail without running, and the guard blocks. Tests in `tests/hooks/guard.test.ts` cover both cases. If the checks grow close to the budget, the slow ones move to `npm test` as the plan says.

## E6: Spec, agent and hook slash commands through T3 Code, and `PostTaskExec`

- **Question:** are `/spec`, `/agent`, `/hooks` and the steering slash commands reachable through T3 Code, does a spec task run there fire `PostTaskExec`, and does it fire before or after the per-task commit?
- **Result:** not run yet: needs a Kiro session started in `wraith-kit/`. Related evidence from run 2: the headless V3 session advertised a `mode` option with the values `vibe` (current), `spec`, `quick-spec`, `bug-fix`, `plan`, `autonomous` and `semantic_reviewer`, and two bundled agents as commands (`general-task-execution`, `context-gatherer`). That says nothing yet about T3 Code or `PostTaskExec`.
- **Follow-up:** `doc-sync` keeps its `PostTaskExec` trigger; the fallback in PLAN.md section 10.4 applies if E6 shows it does not fire.

## E7: Does `auto` steering inclusion trigger in CLI V3?

- **Result:** not run yet: needs a Kiro session started in `wraith-kit/`, or the steering task's headless run.

## E8: Selecting a custom agent through ACP, and project agents as sub-agents

- **Result:** not run yet: needs a Kiro session started in `wraith-kit/`, or the agents task's headless run.

## E9: Do `@wraith/<tool>` matchers match `mcp_wraith_<tool>` IDs?

- **Result:** not run yet. It only matters if a hook targets `wraith` MCP tools; none of the six hooks does. It belongs to the MCP task.

## E10: Order of two `PreToolUse` hooks on `shell`

- **Question:** with two `PreToolUse` hooks on `shell`, in what order do they run?
- **Method:** run 2 above (four `PreToolUse` `shell` hooks in one file).
- **Evidence:** the timeline above. For each of the three commands the hooks ran in file order, `e2-shell-a`, `e10-shell-b`, `e3-block`, `e5-slow`, about 50 ms apart, and each one had ended before the next started. The ACP `hook_update` events for these hooks came before the `tool_call` and `tool_approval` events of the same command.
- **Result:** hooks in one file run one at a time, in the order they are listed, and before the permission step. The order of hooks in **different** files (as `commit-guard.json` and `todo-afterlife-precommit.json` are) was not tested.
- **Follow-up:** none needed. The two hooks do not depend on each other's result (PLAN.md section 10.4).

## E11: Which kiro-cli version does the ACP session run?

- **Question:** does the T3 Code ACP session run the 3.3.0 binary or the earlier 3.2.1 bundle?
- **Method:** followed this session's own shell up its parent processes with `ps -o pid=,ppid=,command=`, listed the Kiro processes with `ps -axo pid,command | grep -i kiro`, and read the executable path of the ACP process with `lsof -p <pid>`.
- **Evidence:**

```text
zsh (this session's shell)
 <- 16674 /Users/himanshujha/Library/Application Support/kiro-cli/node --experimental-wasm-modules
          .../kiro-cli/kas/3.3.0-2d550cf8.../node_modules/@kiro/agent/dist/server/acp-server.js --transport=stdio --auth=acp-callback
 <- 16673 kiro-cli acp --agent-engine=v3 --auth-method=cli
 <- 6309  /Applications/T3 Code (Beta).app/Contents/MacOS/T3 Code (Beta) ...
```

  `lsof` gave `/Users/himanshujha/.local/bin/kiro-cli` as the executable of PID 16673: the same file `kiro-cli` resolves to on PATH, which reports `kiro-cli 3.3.0`. The `kas/` folder also holds 3.0.0 and 3.2.1 bundles, but no running process used them. The bundled Node.js reports v22.23.4. Four `kiro-cli acp --agent-engine=v3` processes were running, started between 21:12:40 and 21:12:53.
- **Result:** the ACP session runs kiro-cli 3.3.0 with the 3.3.0 agent bundle on the V3 engine. The capability matrix in PLAN.md section 10.1 was written for 3.3.0, so it does not need a re-check for a different version.
- **Follow-up:** none needed.
