# Kiro IDE and T3 Code handoff

Status on 17 Nov 2026: all eight feature requirements are written. Designs, task lists and the applications are not built. Kiro's monthly usage-limit error interrupted the previous session; Codex completed the requirements handoff. None of the steps below is claimed as already run.

The next product step is the `wraith-core` design in Kiro IDE, due **18 Nov 2026 at 12:00 IST** under PLAN.md section 10.7. Notice Ghoul's corresponding IDE step is due **26 Nov**. The core's reserved IDE slot is why this phase stops at requirements. If that slot is missed, the plan allows a CLI-authored core design and reserves the IDE Correctness demonstration for Notice Ghoul. The fallback must be attributed to whichever tool actually authors it.

## 1. Start Kiro in the correct project

Add this directory as its own T3 Code project and open the same folder in Kiro IDE:

```text
/Users/himanshujha/.t3/projects/kiro/wraith-kit
```

The earlier session started in the parent `kiro` directory, so it did not load this repo's `.kiro` configuration. Exact T3 project-picker labels are **to confirm in your installed UI**. The acceptance check is the session's workspace path, not just a terminal `cd`.

Use Kiro as the provider for the following experiments. If the monthly limit still prevents a run, record the error and leave the experiment pending; do not purchase credits or describe a Codex turn as Kiro evidence.

Paste:

```text
Verify that this session's workspace is the wraith-kit repository. Report the
workspace path, Kiro version and engine if exposed by the session. List the
workspace hooks, custom agents and MCP servers actually discovered. Distinguish
configuration files on disk from capabilities loaded by this session. Do not
publish, deploy, call a runtime LLM or modify the product.
```

## 2. Complete the T3-specific experiments

These prompts continue [experiments E1, E6, E7 and E8](experiments.md). Keep raw tool/hook events where T3 exposes them. An assistant saying a hook ran is weaker evidence than the hook event and process result.

**E1: automatic hooks.** Paste:

```text
Check git status and preserve existing work. If tests/kiro/acp-probe.test.ts
already exists, stop this probe. Otherwise create that temporary file with one
passing Vitest test using the write tool. Observe whether tests-on-save fires
automatically. Then ask the shell tool to run exactly:
git commit --dry-run --all -m hook-probe
The commit-guard should block --all before Git runs; --dry-run prevents a commit
if the hook is absent. Record the actual hook events and results, not a manual
guard run as automatic-hook evidence. Remove only the temporary file you created.
Leave unrelated changes alone. Do not stage or commit anything.
```

**E6: commands and task hooks.** Paste:

```text
Inspect the session's advertised spec, agent, hook and steering commands. Report
which are actually available through T3 Code, without guessing command syntax.
If spec tasks are available, create an isolated temporary acp-probe spec with a
single harmless task to write .scratch/acp-probe.txt. Do not overwrite an existing
probe. Execute that task through the spec task interface and record whether
PostTaskExec and doc-sync fire, and their order relative to any commit attempt.
Do not commit the probe. Preserve any real documentation changes separately and
remove only probe files created by this run. If the command surface is unavailable,
report that and leave PostTaskExec unverified for the IDE fallback.
```

**E7: steering.** Paste:

```text
I want to build a new Wraith app. Before reading files, list which steering files
are already in your context, distinguishing full text from name and description.
Then activate skeleton-authoring if the session offers it and report what changed.
Do not build an app yet. Record the session's steering events if available.
```

**E8: project agents.** Use the agent selector or advertised command to select `skeleton-warden` (exact T3 control **to confirm**), then paste:

```text
Inspect the current repo read-only and report which of your configured review
checks can run now. Mark the absent skeleton, apps and integrity suite not checked.
Do not invent a passing product review. Write only a dated report under docs/reviews
if your configured permissions permit it. Record which agent actually ran.
```

To test invocation as a child as well, return to the main Kiro agent and paste:

```text
If this session supports invoking the project agent skeleton-warden as a child,
invoke it once for a read-only inventory of currently runnable checks. Report its
actual agent identity and result. If unavailable, report unavailable; do not
substitute a different agent or provider.
```

E8 is capability evidence only until the skeleton exists; app-smith's real rehearsal comes later. Return a short result for each experiment, relevant tool events and any report paths. Update `docs/experiments.md` and `KIRO_USAGE.md` only with observed outcomes.

## 3. Core design and Correctness in Kiro IDE

Official documentation checked on 17 Nov 2026: [Specs](https://kiro.dev/docs/specs/), [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements/) and [Correctness](https://kiro.dev/docs/specs/correctness/). Feature specs work in CLI and IDE; the documented Correctness surface is IDE-only. The Markdown variants of the first two pages were inaccessible during this check, so the HTML pages were used.

1. Open `.kiro/specs/wraith-core/requirements.md` in the project's spec workflow. How an existing manually authored spec is selected in your IDE build is **to confirm**; do not generate a replacement requirement set.
2. Optionally use **Analyze Requirements**, documented in chat or the editor's **Continue** dropdown. Review each proposed requirement change. Preserve numbered IDs and resolve actual contradictions, especially retry caps versus Retry-After and provenance of reworded safe actions.
3. Use **Proceed to Design** from that workflow. Paste the design brief below. The Correctness documentation describes property extraction during design; inspect the resulting properties and their links to requirements. Exact properties-panel controls are **to confirm** in the installed version.

```text
Continue the existing wraith-core spec at design only. Read PLAN.md and all eight
requirements files. Resolve the open design questions explicitly. Preserve the
extension-point boundary and free-tier/no-LLM path. Produce design.md with concrete
types, state transitions, transactional boundaries, retry and lease behaviour,
failure handling and P1-P7 correctness properties linked to requirement IDs using
the convention in .kiro/steering/structure.md. Use Kiro IDE property extraction.
Do not implement code or generate tasks yet. Do not change requirements unless
analysis identifies a real problem; explain any such change and preserve IDs.
Confirm API choices against official docs, using aws-docs for AWS. Stop after
design so the dependent specs can be aligned. Do not publish or deploy.
```

4. Review the diff. Leave it uncommitted for integration, or run the checks below, stage only the reviewed files, run the guard, and commit with `docs(spec): design wraith-core with Kiro IDE correctness`.
5. Return the changed files, unresolved findings, Kiro version, and screenshots of extracted properties with their requirement links. Keep credentials and unrelated projects out of screenshots. Do not call the properties tested until their implementations run.

```sh
npm run spec:trace
npm run typecheck
npm run lint
npm test
# Stage reviewed files by name in a separate command, then:
npm run guard
```

If traceability fails because generated citation syntax differs, fix the citations to the repository convention; do not relax the checker. If the IDE cannot continue an existing spec, report the exact UI limitation before recreating anything.

## 4. Notice Ghoul design by 26 Nov

Repeat the IDE workflow for `.kiro/specs/notice-ghoul/requirements.md` after the core contracts are available. Paste:

```text
Continue notice-ghoul at design only using the existing core contracts. Use Kiro
IDE property extraction for NG-P1 through NG-P4. Specify stable notice and deadline
identity, date grammar and timezones, missing-year uncertainty, symmetric source
disagreement, human confirmation, output-set membership and RFC 5545 UID/SEQUENCE
behaviour. Resolve whether confirming a conflicting source retires an existing
confirmed date. Link every criterion using structure.md conventions. Do not build
the app or call real college sites. Stop after design and report unresolved issues.
```

Return the reviewed diff and properties screenshots. Optional checked commit message: `docs(spec): design notice-ghoul with Kiro IDE correctness`.

## 5. Account setup later, not needed for this handoff

These commands are preparation instructions, **not authorization to execute them now**. No repository, token, endpoint or AWS resource was created in this phase.

- **GitHub sandbox:** when approved, `gh repo create himanshu748/wraith-kit-sandbox --public`. Syntax checked against local `gh repo create --help` on 17 Nov. It creates a separate empty public sandbox, not publication of this project. Create the fine-grained token in GitHub settings scoped only to that repo; proposed permissions are Contents read and Issues write, to confirm against the exact endpoints before use. Store the token outside the repo and never paste it into chat.
- **Modal:** first check applicable free credits and configure a custom spend limit under **Usage & Billing**. [Modal budgets](https://modal.com/docs/guide/budgets) distinguishes total usage from net out-of-pocket spend; the minimum selectable value and actual account allowance remain unverified. Keep the runtime provider `none` until the free-only boundary is established. Later commands are `modal workspace proxy-tokens create` and `modal endpoint create --name wraith-advisor --model <supported-model-id>`. Both command forms were checked with local `--help`. `Qwen/Qwen3.5-4B` is the plan's candidate and Qwen3.5 4B appears on the supported-models page checked 17 Nov; its exact CLI model ID, license and cost remain to confirm. Recheck the [supported models](https://modal.com/docs/guide/supported-models), license and price before choosing it. Token output is secret; keep it outside logs and Git.
- **AWS SAM CLI:** installation still needs the author's go. For this Apple silicon Mac, download `aws-sam-cli-macos-arm64.pkg` from the [official install guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), verify the installer, then the documented all-users command is `sudo installer -pkg /absolute/path/to/aws-sam-cli-macos-arm64.pkg -target /`. Verify with `sam --version`. Do not remove an existing installation blindly; follow its documented upgrade path. No installation was performed here.
- **AWS deploy:** planned for 30 Nov only on the author's go, after local build and validation. No final deploy command is asserted before the SAM templates and parameters exist. Account opening date, remaining free allowance and Region confirmation are still open in PLAN.md section 17.2.

The main repo remains local, with no remote. Publication, deployment, posting and submission remain separate later actions.
