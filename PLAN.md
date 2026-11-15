# Wraith Kit: Plan

Kiroween 2026 entry. **Category:** Skeleton Crew. **Bonus targets:** Best Student Project (Skeleton Crew), Best Demo, Bonus Blog, Social Blitz.

**Hard deadline:** Fri 4 Dec 2026, 2:00 PM PT (Sat 5 Dec 2026, 03:30 IST). The rules allow no extensions and no late submissions.

## 0. Status and approval gate

- Status: **draft, waiting for your approval.**
- Nothing in this plan has been built, tested or measured. This repo holds only this file. There is no `LICENSE`, `.kiro/`, `package.json`, `README.md`, spec, hook, agent or code yet.
- This plan was written on 15 Nov 2026 through T3 Code driving Kiro CLI over ACP. KIRO_USAGE.md will record that surface from its first commit (section 10.9).
- This is the second draft. It was revised the same evening after a design review of the first draft found gaps in the skeleton contract (advisor modes, state shared across events, the action lifecycle on Lambda, audit and approval claims, the hosted demo split and the hook details). Items the review placed in the spec phase are recorded below as spec-phase requirements.
- Work continues with the spec phase (section 12) only after you approve this plan or send changes. Open questions are in section 17.
- Every later task ends with a local commit. Nothing is pushed, deployed, posted or submitted without your explicit go.

## 1. What Wraith Kit is

Wraith Kit is a lean TypeScript skeleton for small event agents that ask before they act. An event arrives (a webhook, or a feed the kit polls) and is normalised into an `Event`. It then passes through deterministic rules, optionally gets help from a free-tier or local LLM through one adapter (rewording, or proposing data that deterministic code must verify), and ends as a proposed `Action`. Every action waits for a human in a tiny approval web UI unless its kind is explicitly declared safe and it carries no unconfirmed LLM-sourced data. Everything is recorded in a keyed, hash-chained audit log, with retries and idempotency keys, so a redelivered webhook never produces a second action. It runs locally with Node or on the AWS free tier (Lambda, Function URLs, DynamoDB via SAM). Two very different apps are built on it: TODO Afterlife for developers and Notice Ghoul for students.

**Who each part is for:**

| Part | Audience | Problem |
|---|---|---|
| The skeleton (`/skeleton`) | Developers who want a useful automation agent without giving an AI unchecked write access to real systems | Wiring intake, dedupe, retries, approval and audit by hand for every small agent |
| App 1, TODO Afterlife (`/apps/todo-afterlife`) | Developers | TODO and FIXME comments that rot because nobody turns them into tracked work |
| App 2, Notice Ghoul (`/apps/notice-ghoul`) | Students | Deadlines buried in college notice boards and RSS feeds |

**Theme fit (Skeleton Crew).** The rules ask for "a skeleton code template lean enough to be clear but flexible enough to support various use cases" and "two distinct applications from your foundation". Wraith Kit is the skeleton; the two apps serve two audiences with nothing in common except the core. The spooky layer: a wraith watches events, proposed actions wait in "Limbo" (working name for the approval queue, see question 11) until a human approves, retired TODOs are "laid to rest", and Notice Ghoul digs deadlines out of notice boards. The spooky layer stays in names and the visual theme, never in the meaning of buttons. "Approve" and "Reject" stay plain words.

**Product honesty rules:**

- Demo data is always labelled "DEMO" in the UI, in exports, in digests and in the video.
- AI output is labelled with its provider and model.
- Nothing auto-posts anywhere.
- No invented users, statistics or testimonials, in the product or in any write-up.

## 2. Facts from the official rules that shape this plan

Source: [Kiroween 2026 Official Rules](https://kiroween.devpost.com/rules), read in full on 15 Nov 2026 and re-read at about 23:15 IST the same day. Devpost returned HTTP 403 to the fetch tool, so the page was downloaded with `curl` and a browser User-Agent. The second read found no changes to the items below. Rules can change, so the page gets re-read before submission.

- **Submission Period:** 30 Oct 2026, 9:00 AM PT to 4 Dec 2026, 2:00 PM PT. No extensions, no late submissions. This repo was created on 15 Nov 2026, inside the period.
- **Judging Period:** 16 Dec 2026, 1:00 PM PT to 29 Jan 2027, 1:00 PM PT. Winners are announced on or around 3 Feb 2027.
- **Skeleton Crew text:** "Build a skeleton code template lean enough to be clear but flexible enough to support various use cases. Show us its versatility with two distinct applications from your foundation."
- **Skeleton Crew repo requirement:** "Your repo must contain 2 separate repo folders for the 2 separate applications." Our reading: `/apps/todo-afterlife` and `/apps/notice-ghoul` in one public repo. The rules say entrants who find a term ambiguous "must submit a written request for clarification". I can draft that request for you to send (question 10).
- **Working app URL:** "Provide a URL to your functional application(s)." Access must be free of charge and without restriction for the Sponsor, Administrator and Judges until the Judging Period ends (29 Jan 2027). If the site is private, login credentials go in the submission form. Judges are not required to test and may judge from text, images and video.
- **Functionality:** the project must install and run consistently on its intended platform and work as shown in the video and description.
- **New work only:** projects must be built during the Submission Period. Frameworks, libraries and starter templates are allowed; any other pre-existing code or work must be disclosed (section 16).
- **Third-party integrations** (SDKs, APIs, data) must be used in line with their terms.
- **Video:** under 3 minutes (judges need not watch beyond 3:00), footage of the project working on its device, public on YouTube, no third-party trademarks, copyrighted music or other material without permission.
- **Repo:** public GitHub (not GitLab or Bitbucket), an open-source license file that GitHub detects and shows in the About section, and all source, assets and instructions needed to run it. `/.kiro` must sit at the repo root to show specs, hooks and steering. Adding `/.kiro` or any sub-folder to `.gitignore` "could disqualify your submission".
- **Category and bonus:** the form must identify the category and the bonus category.
- **Kiro write-up questions** (KIRO_USAGE.md answers all of them): Kiro IDE, CLI, Web or Crew and how they differed; custom agents (which app, impact); agent hooks (workflows automated, how they helped); spec-driven development (structure, how it helped, comparison with vibe coding); steering docs (the strategy that made the biggest difference); MCP (what it enabled); property-based testing (issues caught, which requirements); Kiro powers (which ones, third-party tooling).
- **Judging:** "Insufficient use of Kiro will result in disqualification at the Judges' sole discretion." Stage One is pass/fail on theme fit and use of the required tools. Stage Two has five equally weighted criteria, 10 points each: Potential Impact, Technological Implementation, Design, Innovation/Idea, Presentation (wording in section 4). The rules say judging may use "automated AI-driven analysis".
- **Prizes relevant here:** Best Skeleton Crew $5,000. Best Student Project, one per category: a 1-year Kiro Pro Max subscription (listed at $1,500 USD). Best Demo $1,000, for the highest Presentation score among the top 10% overall. Bonus Blog: 2,000 bonus Kiro credits, top 100. Social Blitz: 3-month Kiro Pro+, 5 winners. A project can win one Overall prize OR one Category prize, plus any number of Bonus prizes.
- **Best Student Project:** name the category the student project is submitted for (Skeleton Crew) and give LinkedIn profile, student email, year and degree, and school name for every member. All team members must be students. Proof of enrolment may be requested; not providing it in time removes the project from Best Student consideration.
- **Bonus Blog:** a public post about Kiro and the build on a third-party blog platform, published during the Submission Period, that says it was written as part of the Kiroween 2026 hackathon. Its URL goes in the form.
- **Social Blitz:** a post on any social platform that starts with `#KiroweenHackathon26` before any other content, shares your favourite thing about Kiro and how it changed the way you approached development, posted during the Submission Period, link in the form. Judged on original thoughts versus AI writing, insights, and quality of assets. Social profiles that do not match other submission details may be disqualified.
- **Kiro credits:** a one-time 4,000 credits per eligible person through the Credit Request Form. Request by Tue 1 Dec 2026, 12:00 PM PT; redeem by Fri 4 Dec 2026; redeemed credits expire 31 Dec 2026, 11:59 PM PT. The Deadline Graveyard plan in this workspace records that you already received credits; please confirm (question 9).
- **Not targeted:** Best Ghost of Kiroween Past (needs Kiroween 2025 registration, which the Deadline Graveyard plan records you did not do), Best Kiro Crew App (needs a separate repo for a Kiro Crew app), Best Startup Project (not applicable).
- **Multiple submissions** are allowed only if each is "unique and substantially different". Other Kiroween plans exist in this workspace: Deadline Graveyard (Costume Contest, a deadline tracker with `.ics` export aimed at students), Fagan's Ghost (Resurrection, a code inspection ritual with commit gates) and Stitchform (Frankenstein, a paper-form filler). Notice Ghoul overlaps with Deadline Graveyard on "student deadlines plus `.ics`". This is a risk (section 15) and question 7. No code is shared between entries.
- **Eligibility:** age of majority; teams of up to 3. India is not on the excluded list.
- **Language:** English.

## 3. Repo location and layout

**Decision: a dedicated git repo at `/Users/himanshujha/.t3/projects/kiro/wraith-kit/`**, published later as a public GitHub repo named `wraith-kit`. It was created on 15 Nov 2026 at 22:51 IST with `git init -b main`. It has no remote. Its first commit is this plan.

Why a dedicated repo:

- **Shared workspace history.** The outer workspace repo (`/Users/himanshujha/.t3/projects/kiro`) is shared by other Kiroween plans that write their own root `PLAN.md`. One of those commits already replaced another project's plan at the root. A repo per project keeps the public history, `/.kiro`, `README.md` and `LICENSE` about Wraith Kit only.
- **`.kiro/` loads from the session's workspace root.** Kiro reads steering, hooks, agents, specs and MCP config from the root of the folder the Kiro session starts in. **For hooks and steering to load, the Kiro session must start in `wraith-kit/`.** Please add `wraith-kit/` as its own T3 Code project (question 1). For IDE steps, open this same folder in the Kiro IDE.

Planned layout. The required parts (`/.kiro`, `/skeleton`, `/apps/todo-afterlife`, `/apps/notice-ghoul`) are fixed by your instruction; the rest is proposed.

```text
wraith-kit/
  .kiro/
    steering/   product.md, tech.md, structure.md, wraith-domain.md, skeleton-authoring.md
    specs/      wraith-core/, llm-adapter/, approval-ui/, runtimes/, todo-afterlife/,
                notice-ghoul/, wraith-mcp/, app-authoring/
                (each: requirements.md, design.md, tasks.md)
    hooks/      tests-on-save.json, commit-guard.json, todo-afterlife-precommit.json,
                doc-sync.json, spec-trace.json, store-guard.json
    agents/     skeleton-warden.md, app-smith.md
    settings/   mcp.json
  skeleton/     the template: package.json (exports), src/{core,node,aws,llm,ui,mcp,testing},
                template/ (starter files for app #3), test/
  apps/
    todo-afterlife/   README.md, package.json, src/, fixtures/, template.yaml (SAM), test/
    notice-ghoul/     README.md, package.json, src/, fixtures/site/, template.yaml (SAM), test/
  tests/        core-integrity.test.ts, store-contract.test.ts
  docs/         make-your-own-app-in-15-min.md, architecture.md, run-local.md, deploy-aws.md,
                experiments.md, reviews/ (skeleton-warden reports)
  scripts/      hook scripts, core budget, deps-vs-README check, new-app scaffold
  README.md  KIRO_USAGE.md  LICENSE  PLAN.md  DEVPOST_STORY.md  VIDEO_SHOTLIST.md
  BLOG_DRAFT.md  SOCIAL_POST.md  SUBMISSION_CHECKLIST.md
```

- Each app folder has its own `README.md` with run instructions, its own `package.json` and its own SAM template. Both apps are built only from the skeleton's extension points (section 8 proves it).
- npm workspaces (npm 10.9.2 is installed), TypeScript strict, ESM.
- `.gitignore` covers `node_modules`, `dist`, `.aws-sam`, `.wraith/` (local data), `.env*` and the user's notice-source config. It never mentions `.kiro`; the commit guard checks this on every agent commit (section 10.4).

## 4. Feature to judging-criterion map

Criterion wording, summarised from the rules:

- **Potential Impact:** a credible case for solving a real problem for a real audience; useful, intuitive, accessible; would someone use it.
- **Technological Implementation:** how thoroughly and skillfully the project uses Kiro; a thoughtful AI development strategy; variety of Kiro tools; deep understanding; experimentation.
- **Design:** a complete, coherent product experience, not just a technical proof of concept; intuitive, polished, intentional.
- **Innovation/Idea:** creative and novel; differs from existing concepts; unusual technologies or public resources combined in a unique way.
- **Presentation:** the video shows the project working end to end; the pitch says what problem, who it is for and why it matters; easy to follow; creative and memorable.

Each feature is mapped to exactly one criterion, the one it mainly serves.

| # | Feature | Criterion | Why it scores there |
|---|---|---|---|
| F1 | Core pipeline and extension-point API (`defineApp`): sources with `accept` and `expand`, rules with a read-only state view, advisor, actions, aggregates | **Potential Impact** | A developer gets a working event agent by writing only sources, rules and actions, which is the problem the skeleton exists to solve. |
| F2 | Idempotency keys, dedupe, retries with backoff, claim leases, dead-letter | **Potential Impact** | Webhooks get redelivered, networks fail and functions time out; without these an agent creates duplicate issues or loses actions, and nobody would keep using it. |
| F3 | Approval-by-default action safety model (safe kinds must say why; unconfirmed LLM-sourced data always needs approval) | **Innovation/Idea** | The agent proposes and a human decides, and "safe" is a declared, explained exception rather than the default. |
| F4 | Keyed (HMAC) hash-chained audit log and "explain this action" trace | **Innovation/Idea** | Combines a history that shows edits by anyone without the audit key with a plain trace of which rules fired and why, inside a small kit. |
| F5 | One LLM adapter (none, Gemini free, Groq free, Ollama) with a deterministic fallback, and two advisor modes: `reword` ("AI can edit the words, never the decision") and `extract` ("the LLM proposes, the rules verify") | **Innovation/Idea** | The LLM is optional and boxed in: it may reword, or propose data that deterministic code must reproduce from a quoted piece of evidence, and anything it proposes goes to a human. |
| F6 | Approval UI (queue, detail, approve, edit, reject, audit view) | **Design** | The approval step is where people meet the product, so it has to be clear and intentional, not a JSON dump. |
| F7 | Shared theme and accessibility (keyboard first, WCAG AA, reduced motion, axe checks) | **Design** | Polish and accessibility make it a complete product; keyboard-first suits a repetitive approve or reject task. |
| F8 | Local Node runtime: one command, file store, demo data, webhook replay | **Potential Impact** | Anyone, judges included, can run both apps with no account, no API key and no tunnel. |
| F9 | AWS free-tier deployment with SAM (Lambda, Function URL, DynamoDB, Scheduler) | **Potential Impact** | Gives a real hosted path that stays inside free-tier limits (limits and coverage to confirm, section 11). |
| F10 | TODO Afterlife app (push webhook, vague-TODO rules, rewrite, issue, retire) | **Potential Impact** | Turns vague TODOs into concrete tasks or tracked issues, or retires them, for developers. |
| F11 | TODO Afterlife local Kiro pre-commit hook | **Technological Implementation** | Uses a Kiro `PreToolUse` hook as part of the product: the same app checks TODOs before the agent commits. |
| F12 | Notice Ghoul app (poll, deadline extraction, dedupe, digest, `.ics`, "confirm deadline" approvals for uncertain dates) | **Potential Impact** | Gives students one de-duplicated digest and a calendar file instead of several notice boards to check, and asks before adding any date it is unsure of. |
| F13 | Fictional fixture college site and hosted demo mode | **Presentation** | Gives judges and the video a safe, repeatable end-to-end demo with clearly labelled demo data. |
| F14 | Core-integrity test (both apps import the same unmodified core), run by the commit-guard hook and the skeleton-warden agent | **Technological Implementation** | Proves the Skeleton Crew claim in code, enforced by a Kiro hook and a Kiro agent, instead of asserting it. |
| F15 | "Make your own app in 15 min" guide, `new-app` scaffold, skeleton-authoring steering | **Design** | For a skeleton, the developer experience of building app #3 is the product experience. |
| F16 | `/.kiro` specs (EARS), steering, hooks, custom agents | **Technological Implementation** | This is what judges read in `/.kiro`: several Kiro tools doing real work, with experiments recorded. |
| F17 | `wraith` MCP server plus docs MCP servers | **Technological Implementation** | Kiro can replay fixtures through an app's rules with zero side effects, and confirm APIs in official docs. |
| F18 | Property-based tests (P1 to P7, TA-P1 to TA-P3, NG-P1 to NG-P4), with a store contract suite run against both stores | **Technological Implementation** | Covers the two properties you asked for (idempotency, rule ordering) and links each property to EARS requirement IDs. |
| F19 | README, KIRO_USAGE, DEVPOST_STORY, BLOG_DRAFT, SOCIAL_POST, SUBMISSION_CHECKLIST | **Presentation** | States the problem, the audiences and the build plainly, including what was not done. |
| F20 | Video: one skeleton, two audiences (VIDEO_SHOTLIST.md) | **Presentation** | Shows both apps working end to end on the same core in under 3 minutes, each with a real approval step in the same UI. |

Coverage: Potential Impact (F1, F2, F8, F9, F10, F12), Technological Implementation (F11, F14, F16, F17, F18), Design (F6, F7, F15), Innovation/Idea (F3, F4, F5), Presentation (F13, F19, F20).

## 5. Skeleton architecture

All names below are design intent. Final names, signatures and config syntax are set in the `wraith-core` spec after the relevant docs are confirmed.

### 5.1 Pipeline and extension points

Pipeline stages:

```text
Intake, fast path (webhook route or cli)
  -> accept: verify the request, dedupe on the delivery key, store it, reply
Intake, slow path (scheduler tick, a poller's schedule, or an async invocation on AWS)
  -> expand: may do I/O through ctx.http, returns Event[], each with its own key
  -> Dedupe by event idempotency key
  -> Rules (deterministic, ordered, read-only state view)
  -> Advisor (optional LLM: reword, or extract then verify; deterministic fallback)
  -> Proposed Action
  -> Approval (human, unless the kind is declared safe and the action
     carries no unconfirmed LLM-sourced data)
  -> Executor (claim with a lease, retries, idempotency)
Aggregates (scheduled, for example daily) -> at most one proposed Action per period
Audit log entry at every step.
```

The scheduler tick drives all background work, and it is the backstop when a faster trigger (such as the async invocation) fails. Each tick expands accepted deliveries that are still waiting, retries actions whose retry time has come, expires stale claim leases, runs due aggregates and pollers, and resets demo state when it is due. Locally the interval scheduler runs it. On AWS each stack's EventBridge Scheduler schedule runs it (section 11.2).

An app provides only these extension points, passed to `defineApp({...})`:

1. **`sources`:**
   - Webhook routes with `accept` and `expand`. `accept` gets the path and the raw request, verifies it and returns a delivery key and the payload. It makes no outbound calls, so the reply is fast. `expand` runs later, may fetch through `ctx.http`, and returns `Event[]`.
   - Pollers with a schedule and an `expand` that fetches (with conditional GET support) and returns `Event[]`.
   - A third source type, `cli`, lets a local command feed events, with `accept` and `expand` run in the same process; the TODO Afterlife pre-commit hook uses it.
2. **`rules`:** a list of rules, each with `id`, `priority`, `description` and a pure `evaluate(event, ctx)`. It returns findings, candidate actions and record upserts (keyed app data, such as a deadline, that the core stores). Rule ids must be unique, and `defineApp` rejects duplicates. Rules do no I/O and read time only from `ctx.clock`. They read data from other events only through `ctx.state`, a read-only snapshot of the app's records and actions taken before evaluation. So a rule's result depends only on the event, the snapshot and the clock.
3. **`advisor`** (optional): a prompt builder, an output schema and a deterministic fallback, in one of two modes.
   - **`reword`:** the advisor may only rewrite the wording of actions the rules already proposed. It cannot add action kinds, change targets or change safety. In short: **AI can edit the words, never the decision.**
   - **`extract`:** the advisor proposes structured data plus an evidence quote from the input. The app must supply a deterministic `verify` function, and the core runs it before accepting anything. `verify` must reproduce the proposed value from the quote by itself, not only check that the quote exists. Rejected proposals are dropped with an audit entry. Accepted values are marked LLM-sourced and stay unconfirmed until you approve an action that carries them. Any action that carries unconfirmed LLM-sourced data needs approval, whatever its kind declares. In short: **the LLM proposes, the rules verify, and a human confirms.**
4. **`actions`:** action kinds with `describe` (the preview shown in the UI), `execute(payload, ctx)` (which receives the idempotency key), an optional `lookup(payload, ctx)` that finds an earlier effect after an unknown outcome, an optional retry policy, and `safety`. Omitted safety means "needs approval". `safety: "safe"` must carry a written `reason`, which the UI and the audit log show.
5. **`aggregates`** (optional): scheduled jobs (for example "daily at 07:00 in the app's timezone") that read `ctx.state` and propose at most one action per period. Their action key is built from the app, the aggregate id and the period (or a hash of the input set, for outputs that refresh when their input changes), so a re-run with the same inputs proposes nothing new.
6. **`views`** (optional): HTML renderers for event and action cards, written with a tiny escaping `html` tagged template that the skeleton provides.
7. **`theme`:** app name, accent colour, icon.

Where aggregate output lives: locally it is written as files under `.wraith/out/` and also served by the local server. On AWS it is stored as DynamoDB items and rendered on request at fixed paths of the app's Function URL (for example `/digest` and `/deadlines.ics`), because Lambda has no lasting disk and the plan uses no S3 bucket. The DynamoDB item size limit is to confirm in AWS docs; if a digest could exceed it, the output is split across items.

Runtime entry points are separate package exports so the core stays small:

| Entry | Contents |
|---|---|
| `core` | Pure pipeline, zero runtime npm dependencies, Node built-ins only |
| `node` | `node:http` server, JSON-lines file store, interval scheduler |
| `aws` | Lambda Function URL handler, scheduled tick handler, DynamoDB store |
| `llm` | The adapter and its providers |
| `ui` | The approval UI |
| `mcp` | The `wraith` MCP server |
| `testing` | Fakes and fast-check arbitraries for app authors |

**Lean budget.** `skeleton/src/core` stays under a line budget (proposed: 1,200 non-blank lines, counted by a script) and has zero runtime npm dependencies. The README reports both numbers as measured by that script, not as targets.

### 5.2 Data model and action states

- **`Delivery`:** `deliveryKey` (for GitHub, the `X-GitHub-Delivery` GUID), `appId`, `source`, `receivedAt`, raw payload, `status` (`accepted` or `expanded`). A delivery that `expand` has not processed yet is picked up by the next tick.
- **`Event`:** `id`, `appId`, `source`, `kind`, `occurredAt`, `receivedAt`, `subject` (for example `repo/path:line` or a notice URL), `data` (app-typed JSON), `idempotencyKey` (deterministic, never random; derived from the source identity and, where the content can change, a hash of the content), `demo` flag.
- **`Record`:** keyed app data that rules upsert and `ctx.state` reads: `appId`, `type`, `key`, `data`, `sourcedBy` (`rules` or `llm:<provider>/<model>`), `confirmed`, `updatedAt`. Notice Ghoul's deadlines and TODO Afterlife's list of tracked issues are records.
- **`Finding`:** `ruleId`, `severity`, `message`, `evidence`.
- **`Suggestion`:** `by` (`rules` or `llm:<provider>/<model>`), the text, and the raw output kept for audit.
- **`Action`:** `id`, `idempotencyKey` (a hash of the event key, kind and target; for aggregates, of the app, aggregate id and period or input-set hash), `kind`, `safety`, `llmSourced`, `status`, `attempts`, `leaseUntil`, `nextAttemptAt`, `payload`, `preview`, `decidedBy`, `decidedAt`, `result`.
- **`AuditEntry`:** `seq`, `at`, `type`, references, data, `prevHash`, `hash`. The hash is an HMAC-SHA-256 over the entry and `prevHash`, keyed with an audit key that is kept outside the store (section 5.3). A `wraith audit verify` command checks the chain.

Action states:

```text
proposed -> approved | rejected
proposed -> auto-approved              (safe kinds, no unconfirmed LLM-sourced data)
approved | auto-approved -> executing  (conditional claim that sets a lease)
executing -> succeeded | retry-wait
executing -> retry-wait                (lease expired after a crash or timeout; audited)
retry-wait -> executing ... -> dead    (dead-letter after max attempts)
dead -> approved                       (manual "retry" from the UI, with an audit entry)
```

`rejected`, `succeeded` and `dead` are terminal, with one exception: the audited manual retry from `dead` above.

### 5.3 Idempotency, retries and audit

- **Dedupe at two levels.** Deliveries are deduped on the delivery key, and events on the event key. Both use a conditional insert. On AWS this is a DynamoDB conditional put with `attribute_not_exists` (syntax to confirm in AWS docs).
- **Local file store, safe for several processes on one machine.** The TODO Afterlife Kiro hook runs as a separate process from the local server, so an in-process lock is not enough. The file store uses a lock file created with exclusive create (Node `fs` `wx` flag) with a stale-lock timeout, plus atomic rename for snapshot writes. The exact mechanism is set in the `runtimes` spec. Using the file store from several machines (for example over a network share) stays unsupported, and the docs say so.
- **Action dedupe:** the same event twice yields the same action key, so one action.
- **Execution with a claim lease.** The executor claims an action with a conditional state change from `approved` to `executing` that also sets `leaseUntil` (proposed: the function timeout plus a margin). It then records the result. If the process dies (a Lambda timeout, an out-of-memory kill, a server restart), the next tick finds the expired lease and moves the action to `retry-wait` with an audit entry.
- **Unknown outcomes.** Before any retry after a timeout or an expired lease, the executor runs the action kind's `lookup`. For GitHub issue creation, the issue body carries a hidden marker with the idempotency key, and `lookup` looks for an open issue with that marker. Proposed method: list the repo's issues filtered by the `wraith-kit` label and check the body for the marker, which avoids search-index lag (endpoint and parameters to confirm in GitHub docs). Search stays a fallback, and any remaining lag is a documented risk (section 15).
- **Retries:** exponential backoff with full jitter, a cap and a maximum number of attempts (proposed: 5), only for retryable errors (network errors, 5xx, 429). `Retry-After` is honoured. The tick runs actions whose `nextAttemptAt` has passed. After the last attempt the action moves to `dead` and shows in the UI.
- **Audit chain.** Every state transition and every LLM call is an audit entry. LLM entries record provider, model, a prompt hash and any fallback reason, never keys.
  - Appends are serialised. On DynamoDB, entry `seq` N+1 is a conditional put that fails if N+1 already exists, and the writer re-reads the head and retries (syntax to confirm). In the file store, appends take the same lock file as other writes.
  - The chain is keyed. Locally the audit key lives outside the repo and outside `.wraith/` (proposed: a file in the user's config folder with owner-only permissions). On AWS it lives in SSM Parameter Store, or in a Lambda environment variable if SSM is not usable on your plan (section 11.2).
  - What this does and does not prove: anyone who can write the store but does not hold the audit key cannot rewrite history without `wraith audit verify` failing. A process running as the same OS user can read the local key, and an AWS principal that can read the parameter can too. The README and DEVPOST_STORY.md say exactly this and do not call the log tamper-proof.

### 5.4 Safety and security

- The default for every action kind is "needs approval". Safe kinds must be declared with a reason. An action that carries unconfirmed LLM-sourced data needs approval even if its kind is declared safe.
- The LLM never decides safety and never adds actions. Its output is untrusted text and is escaped in the UI. Webhook and notice content goes to the LLM inside clearly delimited data blocks.
- **Untrusted text in every output.** Event text (TODO comments, notice titles and quotes) is escaped in every output, not only in the UI: HTML through the skeleton's `html` template, Markdown with its special characters escaped, and `.ics` with RFC 5545 text escaping and line folding (section 7).
- **Webhooks:** verify `X-Hub-Signature-256` with a constant-time compare before parsing the body. The delivery-key dedupe then also blocks replays of a valid delivery.
- **Approval UI sessions, local and AWS.** The same rules apply in both: an HttpOnly, SameSite=Strict cookie (plus Secure on AWS), a CSRF token on every POST, a CSP without inline script, and no token ever carried in a query string after login.
  - **Local:** binds to 127.0.0.1. The one-time login link with a random token is written to a file outside the repo with owner-only permissions and opened in your browser, not printed to stdout, so it does not land in the Kiro agent's context when the agent starts the server (exact mechanism set in the `runtimes` spec).
  - **AWS:** a login form exchanges the token once for the session cookie. The real stack's admin token is stored in SSM Parameter Store (free standard tier and how Lambda reads it: to confirm). If SSM is not usable on your account's plan, the fallback is a DynamoDB item holding a hash of the token (section 11.2).
- **What the human gate covers.** The `wraith` MCP server has no approve or execute tool, so nothing reached through MCP can approve an action. A `store-guard` hook blocks the Kiro agent's write tools from editing `.wraith/` (section 10.4). The Kiro agent can still run shell commands as your OS user, so locally the gate protects against mistakes and against the agent's tool surfaces, not against a determined process with your rights. The README states this limit.
- **Secrets** live only in environment variables or SSM, never in code, logs, audit entries or the repo. The commit guard scans staged changes for token patterns.
- **Hosted demo, separate from real execution** (details in section 11.3):
  - The judge-facing demo stacks hold no GitHub token at all. They run with demo data and dry-run executors that show exactly what would happen, and reset on a schedule.
  - Real execution happens only in a separate TODO Afterlife stack that holds your fine-grained token and points at your sandbox repo. Its admin token is never shared.
  - Question 4 asks whether you want judge approvals to create real issues in a sandbox repo instead.

### 5.5 LLM adapter

- One interface (`LlmProvider`) and one selector environment variable (proposed: `WRAITH_LLM_PROVIDER=none|gemini|groq|ollama`). The default is `none`, so judges can test everything with no key.
- Providers call documented REST endpoints with `fetch`; no vendor SDKs. Endpoints, request shapes and structured-output options for Gemini, Groq and Ollama: to confirm in each provider's official docs during the spec phase.
- Output must parse against the advisor's schema. On a parse failure, timeout, 429 or missing key, the deterministic fallback runs and an audit entry records the reason.
- A daily call cap per app (config) keeps usage inside free limits.
- Free model IDs change, so model IDs are configuration, not hard-coded. The [Gemini API pricing](https://aistudio.google.com/docs/pricing) page shows some models are paid only ("Gemini 4 Argon is not available on the Free tier"); which model IDs are free is confirmed at spec time.
- **Privacy disclosure** in the README and in the UI settings panel:
  - Gemini free tier: the pricing page lists "Content used to improve our products" for the Free tier (read 15 Nov 2026); the Paid tier says content is not used.
  - Groq free plan: data-use terms to confirm. [Groq rate limits](https://console.groq.com/docs/rate-limits) are per organization (RPM, RPD, TPM, TPD), with a 429 and a `retry-after` header when exceeded.
  - Ollama keeps data on the machine. It is a local-mode provider only, because it cannot run inside Lambda.
  - `none` sends nothing anywhere.
- Calls run server side (Node or Lambda), so browser CORS rules do not apply.

### 5.6 Approval UI

- Server-rendered HTML from the skeleton with a small progressive-enhancement script. No frontend framework and no UI build step.
- Screens:
  - Queue grouped by app, pending first.
  - Action detail: the event, the rules that fired in evaluation order, the suggestion labelled "Rule-based" or "AI-suggested: provider/model", and an exact preview of the effect (for example the issue title and body, or the digest). For a Notice Ghoul "confirm deadline" action it shows the quoted notice text, the date each extractor found and the reason a human is needed (section 7).
  - Approve, edit then approve, reject with a reason.
  - Audit log with a chain-verified badge.
  - Settings: LLM provider status, demo mode.
- Keyboard first (proposed: j and k to move, a to approve, r to reject, visible focus), WCAG AA contrast, `prefers-reduced-motion`, axe checks in Playwright.
- A shared dark theme with one accent per app (proposed: spectral green for TODO Afterlife, candle amber for Notice Ghoul; question 11). System font stack and self-drawn SVG icons, so there is no font or icon licensing.

## 6. App 1: TODO Afterlife (developers)

- **Source:** a GitHub repository webhook on the `push` event. Delivery headers include `X-GitHub-Event`, `X-GitHub-Delivery` ("A globally unique identifier (GUID) to identify the event"), `X-Hub-Signature-256` (HMAC SHA-256 hex digest of the body using the webhook secret) and a `User-Agent` starting with `GitHub-Hookshot/`. Payloads are capped at 25 MB ([Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads), read 15 Nov 2026).
- **Reply fast, work later.** GitHub says a server "should respond with a 2XX response within 10 seconds", or the delivery counts as failed ([Best practices for using webhooks](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks), read 15 Nov 2026). GitHub "does not automatically redeliver failed deliveries"; you can redeliver deliveries from the past 3 days by hand ([Redelivering webhooks](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/redelivering-webhooks), read 15 Nov 2026). So `accept` only verifies the signature, checks the event type, dedupes on `X-GitHub-Delivery`, stores the delivery and replies 202. `expand` (the diff fetch, extraction and the tracked-issue refresh) runs after the reply. Locally it starts in the same process right after the reply. On AWS, the proposed design is an asynchronous invocation of the same function, with the scheduler tick as the backstop (invocation type and IAM permission to confirm in AWS docs). The app README tells you to redeliver by hand if a delivery failed.
- **Keys:**
  - Delivery key: `X-GitHub-Delivery`. A requested redelivery keeps the same value ("If you request a redelivery, the `X-GitHub-Delivery` header will be the same as in the original delivery", [Best practices for using webhooks](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)), so a redelivery is deduped and a replayed delivery is ignored.
  - Event key: `expand` turns each TODO occurrence into its own `Event`. Its idempotency key is a hash of repo, path, the normalised TODO text and a position component. The action key is built from this per-TODO key, not from the delivery key. So the same TODO pushed twice (another branch, a force push) yields one action.
  - The position component keeps two identical `TODO: fix this` lines in one file apart. It is either the occurrence index among identical TODO texts in the file or a hash of nearby lines. **Spec-phase requirement:** the `todo-afterlife` spec picks one and states how each behaves when code moves, with a property test for it.
- **Diff:** the push payload lists commits and changed files, but finding TODO lines needs patches. They come from the GitHub REST compare endpoint with a fine-grained token. The exact `push` payload fields, the compare endpoint, the issue list and creation endpoints and the token permissions: to confirm in GitHub docs at spec time. Demo mode uses recorded fixture responses labelled as demo data.
- **Extraction:** TODO, FIXME, HACK and XXX on added or changed lines only, across common comment syntaxes, with path and line number.
- **Rules** (ordered, with configurable phrase lists). Phrases are matched only in the text after the marker, so the `HACK` marker itself never counts as the vague phrase "hack".
  - Vague phrase: "fix this", "later", "temp", "cleanup", "hack", "???".
  - Too short.
  - No owner (for example `TODO(@name)` or an `@name` in the text).
  - No anchor: none of an issue reference or link, a date, a trigger ("when", "before", "after", "once") or a "done when" clause.
  - Retire candidate: "maybe", "someday", "probably not", or a duplicate of an existing tracked item. Tracked items are the repo's open issues with the `wraith-kit` label. `expand` refreshes them into a record, and the rule reads that record through `ctx.state`.
- **Proposals, all needing approval:**
  1. **Rewrite** into a concrete task, delivered on approval as a downloadable patch the developer applies. Nothing is pushed.
  2. **Open a GitHub issue** on approval, with labels `wraith-kit` and `todo-afterlife`. The follow-up rewrite patch then references the new issue number.
  3. **Retire** ("lay to rest"): record the reason and offer a deletion patch.
- **Deterministic rewrite fallback:** a template using the file, the nearest function name and the verb in the comment. It adds an owner (from config; default the push author's GitHub login, payload field to confirm) and a "done when" clause, so its output passes the app's own rules. Property TA-P3 checks this (section 9.2). The LLM rewrite is optional and goes through the `reword` advisor mode. It sends nearby code lines to the provider only when you have enabled one, and the README says so.
- **Local Kiro hook (`todo-afterlife-precommit`):** a `PreToolUse` hook on the `shell` tool category that acts on agent commit commands, detected as described in section 10.4. It runs the same TODO Afterlife app with the `cli` source over `git diff --cached`, writes proposals into the local store so they show up in the approval UI, and prints findings and suggested rewrites to stdout.
  - It is advisory and fails open. Any internal error (missing build, missing `node_modules`, a store lock held for longer than its bounded wait, proposed 5 s) ends with exit 0 and a warning on stdout. The Hook actions page says any non-zero Pre Tool Use exit blocks the tool, so a crash must never surface as a non-zero code.
  - Blocking on vague TODOs is opt-in (proposed: `WRAITH_TODO_BLOCK=1`). Only then, and only when the run completed and found vague TODOs, does it exit 2.
- **Terminal-commit bypass:** Kiro hooks only see actions the Kiro agent takes. A `git commit` typed in a terminal skips them. So the app also ships an optional plain git pre-commit script that you install with a documented command. KIRO_USAGE.md and the app README state this limit.
- **Real footage for the video:** a push to a sandbox repo you own, delivered to the real TODO Afterlife stack's Function URL, approved in the UI, creating a real issue in that sandbox repo (questions 4 and 5).
- Its own `apps/todo-afterlife/README.md` covers setup, local run, webhook replay, the pre-commit hook and AWS deploy.

## 7. App 2: Notice Ghoul (students)

- **Sources:** pollers for RSS 2.0 and Atom feeds and for HTML notice pages (per-source CSS selectors for item, title, link and date). Conditional GET (ETag, If-Modified-Since), a minimum poll interval per source, an identifying User-Agent, a timeout and a size cap, and robots.txt respected for HTML sources.
- **Real URLs are user-configured only**, in a config file that is gitignored. The repo ships `config.example.json`. No real college site is polled by the demo.
- **Fixture site created for the demo:** `apps/notice-ghoul/fixtures/site/`, a fictional institution (proposed name: "Hollowmere Institute of Technology") with an HTML notice board, an RSS feed, and a second department page that repeats some notices in another format to exercise dedupe. It also includes a corrected notice, a date with no year and an ambiguous `05/12` date, so the demo shows the "confirm deadline" path. Every page carries a visible "Fictional institution, demo data" banner. A script serves it locally, and the hosted demo serves it too.
- **Keys and records:**
  - Event key: the source, the item identity (RSS or Atom item id or link; for HTML, the item link) and a hash of the normalised notice text. A corrected notice keeps its identity but changes its text, so it becomes a new event instead of a duplicate.
  - Each deadline is a record keyed by the notice identity plus a deadline label (the phrase it came from, for example "last date for fee payment"); exact key set in the `notice-ghoul` spec. When a corrected notice moves a date, the same record is updated, not duplicated.
- **Rules:**
  - Deadline phrase detection: "last date", "deadline", "due", "submit by", "register by", "closes on".
  - Deterministic date and time extraction (for example 05/12/2026, 5 Dec 2026, December 5, 2026, 5th December, and times like 5:00 PM) with a per-source locale and timezone. Default DD/MM and Asia/Kolkata, configurable.
  - An ambiguity flag when DD/MM versus MM/DD is unclear.
  - Year inference for dates with no year: the first matching date on or after the notice's publish date. If the notice has no publish date, or the inferred date is far from it (proposed: more than 6 months later), the deadline is flagged as uncertain.
  - Past deadlines are hidden from the digest only when their date is certain. They are never deleted; they stay in the records and the audit log.
  - Category tags: exam, fee, scholarship, assignment, event.
  - Cross-source dedupe: deadlines from different sources merge when the normalised titles and the dates match. If the titles match and the dates differ, the deadline is flagged "sources disagree".
- **Advisor (optional, `extract` mode):** for messy notices the LLM returns a date plus an evidence quote. The app's `verify` accepts it only if the quote appears in the notice text (after whitespace normalisation) **and** the deterministic date parser, run on the quote alone with the source's locale and the notice's publish date, produces the same date. A date the quote does not contain is rejected with an audit entry. The LLM's job is to find which date in a messy notice is the deadline; it cannot add a date the text does not contain. In short: **the LLM proposes, the rules verify, and you confirm.**
- **Actions:**
  1. **Confirm deadline** (needs approval). Created for every deadline that is LLM-sourced, flagged ambiguous, has an uncertain year, or has sources that disagree. The UI shows the quote, the candidate dates and the reason. Approve (optionally after editing the date) marks the record confirmed; reject drops it from the outputs. This gives Notice Ghoul a real approval step, so both apps use the approval UI in the video.
  2. **Daily digest** (an aggregate, declared safe with the reason "writes the digest you asked for, posts nothing, and holds only confirmed deadlines"). HTML and Markdown, grouped "due in 48 h", "this week" and "later", each item with its source link and evidence quote. It includes only deterministic, unambiguous deadlines and deadlines you confirmed.
  3. **`deadlines.ics` regeneration** (an aggregate, declared safe with the same kind of reason) over the same confirmed set. It runs on a tick only when that set has changed; its action key includes a hash of the set, so the same set never produces a second action.
- **Output safety for the digest and `.ics`.** Notice text is untrusted. The HTML digest is rendered through the skeleton's escaping `html` template and the Markdown digest escapes Markdown and HTML characters. The `.ics` writer applies RFC 5545 text escaping and line folding, so a CR or LF in a notice title cannot add calendar properties. UIDs come from the deadline record key, not from the date, so a moved date updates the same calendar entry (UID, SEQUENCE and related RFC 5545 details to confirm in the RFC).
- **Nothing auto-posts anywhere.** The app has no email, chat or social posting code at all.
- **Hosted demo:** a digest page and an `.ics` URL for the fictional fixture institution, rendered on request from stored items (section 5.1).
- Its own `apps/notice-ghoul/README.md` covers setup, the fixture site, configuring your own sources, local run and AWS deploy.

## 8. Proving both apps use the same unmodified core

A repo-level test, `tests/core-integrity.test.ts`, runs in `npm test`, in the commit-guard hook and in the skeleton-warden agent's review. It checks six things:

1. **Resolution:** from each app folder, the skeleton package resolves to the same real path inside `/skeleton`.
2. **Public entry points only:** every import of the skeleton in `apps/**` uses an entry listed in the skeleton's `package.json` `exports`. No relative or deep imports into `skeleton/src`.
3. **No forks:** no file under `apps/**` has the same content hash as a core file, and no app file carries the marker banner that every core file has.
4. **Same bytes as on disk, file by file:** each app, started in its own process, reports a map from each core file it actually loaded to that file's SHA-256. Every entry in both maps must match the hash of the same file in `/skeleton/src/core` on disk, and both maps must include the core entry module. A per-file map works even when an app loads only some core files. Under test the apps run under tsx, and the skeleton's `exports` resolve to the TypeScript sources, so the loaded files are the sources themselves (the export-condition mechanism is to confirm in the Node.js and TypeScript docs). The Lambda bundles are built from the same sources. **Spec-phase requirement:** the `runtimes` spec adds a bundle check that lists the core inputs of each bundle (for example from an esbuild metafile; format to confirm) and requires them all to come from `/skeleton/src/core`.
5. **No monkey-patching:** exported registries and the object `defineApp` returns are frozen, and the test checks it.
6. **The core knows nothing about the apps:** no app id or app folder name (`todo-afterlife`, `notice-ghoul`) appears anywhere under `/skeleton/src`.

Why item 4 compares against the files on disk and not git `HEAD`: during development the staged core always differs from `HEAD`, so a `HEAD` comparison would make the commit guard block every legitimate change to the core. The on-disk comparison still catches an app that loads a copied or patched core.

## 9. Testing strategy and property-based tests

Property-based tests use fast-check with Vitest (the exact integration package is to confirm). Each property is linked to EARS requirement IDs in its spec's design.md.

### 9.1 Core properties

| ID | Property |
|---|---|
| P1 | **Idempotent intake.** For any delivery list with duplicates and redeliveries in any order, including intake interleaved from two store handles on the same local store (as the hook process and the server would do), the store ends with one Delivery per delivery key, one Event per distinct event key and one Action per distinct action key. "Same event twice gives one action." |
| P2 | **Idempotent execution.** For any approved action and any pattern of failures, retries and simulated crashes (including a crash after the side effect and a crash that leaves an expired claim lease), a fake external service records at most one effect per idempotency key, and no action stays in `executing` after its lease has expired and a tick has run. |
| P3 | **Rule ordering.** For any rule set with unique ids (`defineApp` rejects duplicates, which a unit test checks) and any permutation of registration order, the evaluation trace, findings and proposed actions are identical, and the trace is sorted by (priority, id). |
| P4 | **Stop semantics.** If a rule returns stop, no later rule in (priority, id) order runs and every earlier one did, whatever the registration order. |
| P5 | **Approval gate** (model-based, using fast-check commands). No action of a non-safe kind, and no action carrying unconfirmed LLM-sourced data, reaches `executing` without a prior `approved` audit entry; rejected actions never execute; terminal states stay terminal, except the audited manual `dead -> approved` retry. |
| P6 | **Audit chain.** Verification passes for any generated chain, including chains built from appends interleaved across two store handles, and fails after any single edit, deletion or reorder made without the audit key. |
| P7 | **Retry bounds.** Attempts never exceed the maximum; delays stay within [0, cap]; `Retry-After` is honoured. |

### 9.2 App properties

| ID | Property |
|---|---|
| TA-P1 | TODO extraction finds exactly the TODO lines inserted into generated diffs, and only on added lines. |
| TA-P2 | The vagueness classifier is deterministic, ignores case and whitespace differences, and matches phrases only after the marker (a `HACK:` marker alone is never "vague"). |
| TA-P3 | For any flagged TODO, the deterministic rewrite passes every vagueness rule. |
| NG-P1 | Dedupe is idempotent and order-insensitive. |
| NG-P2 | Date extraction round-trips every supported format. For dates with no year, the inferred date is never before the notice's publish date, and a missing publish date always sets the uncertain flag instead of dropping the deadline. |
| NG-P3 | A generated `.ics` file parsed by an independent parser (proposed: `ical.js` as a dev-only dependency) returns the same UID, start and summary, including for titles with hostile characters (CR, LF, commas, semicolons, backslashes, HTML). A moved date keeps the same UID. |
| NG-P4 | An LLM-proposed date is accepted only when its evidence quote is present in the notice text and the deterministic parser gets the same date from the quote alone. Every accepted LLM date, and every ambiguous or uncertain date, produces a "confirm deadline" action and never reaches the digest or `.ics` before approval. |

### 9.3 Runs and other tests

- Hooks run property tests in a fast mode (fewer runs, set by an environment variable). `npm test` runs the full number of runs.
- Failing seeds are printed in the test output and recorded in KIRO_USAGE.md.
- Unit tests per module.
- **Store contract suite** (`tests/store-contract.test.ts`): one suite with P1, P2 and P6 and the lease-expiry case, run against both the file store and the DynamoDB store. The DynamoDB run uses DynamoDB Local in Docker (Docker is installed; image, license and conditional-write support to confirm in AWS docs), or the "Local AWS Emulator" power if you approve it (section 10.7). A mocked DynamoDB client would not test the conditional writes, so it is not used for this suite.
- Playwright end-to-end flows for both apps, with `@axe-core/playwright` accessibility checks.
- `sam validate --lint` (or `cfn-lint`, which is already installed) on both SAM templates.
- The core-integrity test from section 8.
- Kiro's own spec Correctness feature (IDE only) is run as an extra step and compared with these hand-written properties (section 10.7).

## 10. Kiro usage plan

### 10.1 Which surface this work runs on, and CLI vs IDE

The agent doing the work is **Kiro CLI, `kiro-cli 3.3.0`** (from `kiro-cli --version` on 15 Nov 2026), driven over ACP by T3 Code. CLI 3.0.0 and later default to the V3 harness, "the same unified agent harness as the Kiro IDE and Kiro Web" ([CLI](https://kiro.dev/docs/cli)). New ACP clients start on V3 by default since 3.0.0 ([ACP](https://kiro.dev/docs/cli/acp), [CLI changelog](https://kiro.dev/changelog/cli)). An earlier task in this workspace recorded the running ACP server loading a 3.2.1 bundle, so experiment E11 checks what the T3 Code session actually runs.

Installed subcommands seen on this machine: `agent {list, create, edit, validate, migrate, upgrade, set-default}`, `chat`, `mcp {add, remove, list, import, status}`, `powers {install, uninstall}`, `crew`, `settings`, `serve`. `kiro-cli acp` is documented on the ACP page but is not listed in `kiro-cli --help`.

Support values below are copied from the kiro.dev availability tables (read 15 Nov 2026; the hook pages were re-checked the same evening). "V3" means available in the CLI only on the V3 harness. Where ACP behaviour is not stated in the docs, the row points to an experiment in section 10.8.

| Capability | IDE | CLI 3.3.0 | How Wraith Kit uses it | Docs |
|---|---|---|---|---|
| Feature Specs, Bugfix Specs, Quick Spec, parallel task execution | Yes | Yes. V3 starts specs with `/spec new <name>` and has "in-terminal Spec review, full-screen task execution" (through T3 Code: E6) | 8 feature specs | [Specs](https://kiro.dev/docs/specs), [CLI V3](https://kiro.dev/docs/cli/v3/) |
| Analyze Requirements | Yes | Yes | Run on each spec's requirements.md | [Specs](https://kiro.dev/docs/specs) |
| **Correctness (property-based testing extracted from EARS requirements)** | **Yes (IDE only)** | **No** | You run the design phase of `wraith-core` and `notice-ghoul` in the IDE, where Correctness extracts properties (sections 10.7 and 12). Our fast-check tests run under Vitest anywhere; only Kiro's spec-level PBT feature is IDE only | [Correctness](https://kiro.dev/docs/specs/correctness) |
| Markdown Review | Documented as a floating "Review" button in the editor | Not stated | Optional IDE step | [Specs](https://kiro.dev/docs/specs) |
| Workspace steering, global steering, AGENTS.md (also nested in subfolders) | Yes | Yes | 5 workspace steering files; no AGENTS.md | [Steering](https://kiro.dev/docs/steering) |
| Steering inclusion modes (always, fileMatch, manual, auto) | Yes | Full in V3; partial in V1 and V2 | Three modes planned (always, fileMatch, auto); manual only as a fallback (E6, E7) (section 10.2) | [Steering](https://kiro.dev/docs/steering) |
| Generate foundation steering via UI | Yes | No | Not needed; steering is hand-written | [Steering](https://kiro.dev/docs/steering) |
| Hooks: event-driven, shell command actions, agent prompt actions | Yes | Yes | 6 hooks in `.kiro/hooks/` (section 10.4) | [Hooks](https://kiro.dev/docs/hooks), [Hook actions](https://kiro.dev/docs/hooks/actions) |
| Triggers Pre Tool Use, Post Tool Use, Agent Stop | Yes | Yes | `commit-guard` and `todo-afterlife-precommit` on `PreToolUse` `shell`; `store-guard` on `PreToolUse` `write` | [Hook types](https://kiro.dev/docs/hooks/types) |
| Trigger Prompt Submit | Yes, can block | Yes, but **CLI Prompt Submit hooks cannot block** | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| Trigger Session Start | Yes | **V3** | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| Trigger Session End | No | V3 only | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| Pre and Post Compaction | Yes | V3 (3.1.0+) | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| File Create, File Save, File Delete | Yes | **V3** ("File and task triggers are available in the IDE and CLI V3") | `tests-on-save` and `spec-trace` on `PostFileSave`. File triggers fire only on agent edits, not on manual editor saves | [Hook types](https://kiro.dev/docs/hooks/types) |
| Pre and Post Task Execution | Yes | **V3** | `doc-sync` on `PostTaskExec` | [Hook types](https://kiro.dev/docs/hooks/types), [IDE 1.0 hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks) |
| Manual hooks | Cannot create new ones | Listed in V3, but **`/hooks` cannot invoke them** | Not used. Manual and auto steering files act as slash commands instead | [Hook types](https://kiro.dev/docs/hooks/types) |
| Global hooks in `~/.kiro/hooks/` | Not stated | V3 | Not used; everything lives in this repo | [Hooks](https://kiro.dev/docs/hooks) |
| Custom agents, project level `.kiro/agents/` | Yes | Yes | `skeleton-warden`, `app-smith` (section 10.5) | [Custom agents](https://kiro.dev/docs/custom-agents) |
| Global agents, agent switching via UI, modify agent settings | Yes | Yes (switching through ACP: E8) | Switch to an agent for reviews and for app #3 | [Custom agents](https://kiro.dev/docs/custom-agents) |
| Sub-agents | Yes | Yes | `skeleton-warden` as a sub-agent for reviews (E8) | [CLI](https://kiro.dev/docs/cli), [CLI V3](https://kiro.dev/docs/cli/v3/) |
| MCP: local stdio, remote HTTP/SSE, OAuth, JSON config, server prompts and resources | Yes | Yes | `wraith` (stdio, built here) and docs servers (section 10.6) | [MCP](https://kiro.dev/docs/mcp) |
| Powers: install and use | Yes | V3 | Review registry candidates with you; install only with approval | [Powers](https://kiro.dev/docs/powers) |
| Powers: create | Yes | V3 | Stretch: a `wraith-kit` power | [Powers](https://kiro.dev/docs/powers) |
| Skills | Yes | Yes | A "new Wraith app" skill inside the stretch power | [CLI](https://kiro.dev/docs/cli) |
| Kiro Web | Separate surface | n/a | Not planned; KIRO_USAGE.md will say so | not reviewed for this plan |
| Kiro Crew | n/a | `kiro-cli crew` launches it | Not planned; docs not reviewed. KIRO_USAGE.md will say so | `kiro-cli --help` |

CLI V3 has no built-in AWS tool; the docs say "Use MCP servers for AWS access" ([CLI V3](https://kiro.dev/docs/cli/v3/)). That is one reason for the `aws-docs` server.

### 10.2 Steering

Front matter uses `inclusion: always | fileMatch | manual | auto`. `fileMatch` takes `fileMatchPattern` as a single glob or an array of globs. `auto` requires `name` and `description`, and auto files also appear as slash commands ([Steering](https://kiro.dev/docs/steering)).

| File | Inclusion | Contents |
|---|---|---|
| `product.md` | `always` | Audiences, problem, judging goals, honesty rules |
| `tech.md` | `always` | Stack, free-tier-only rule, "confirm every API in official docs, never guess", secrets policy |
| `structure.md` | `always` | Folders, the extension-point boundary, naming, test placement |
| `wraith-domain.md` | `fileMatch` with `fileMatchPattern: ["skeleton/src/**", "apps/*/src/**"]` | Invariants: approval by default, deterministic idempotency keys, pure rules that read other events only through `ctx.state`, LLM output untrusted and verified, unconfirmed LLM-sourced data always needs approval, every transition audited, untrusted text escaped in every output, demo data labelled |
| `skeleton-authoring.md` | `auto`, with a `name` and a `description` so Kiro loads it when someone asks to build a new Wraith app; also a slash command | How to make app #3 from extension points only. Links `docs/make-your-own-app-in-15-min.md` with a `#[[file:...]]` reference. Falls back to `manual` if auto inclusion does not trigger in the CLI (E7) |

- Steering is not loaded automatically into custom agents. Each agent lists the steering files it needs in its `resources` (the docs example is `"resources": ["file://.kiro/steering/**/*.md"]`).
- **"Make your own app in 15 min" guide:** `docs/make-your-own-app-in-15-min.md`, backed by `skeleton/template/` and a `new-app` scaffold script. "15 min" is the goal in the title, not a measured result. The `app-smith` agent rehearses the guide on a scratch app, and that time is reported as **agent time**, labelled as such, whatever it turns out to be. An agent's time says little about a person's, so the README and DEVPOST_STORY.md name what was timed. If you time one human run yourself (question 15), that time is reported too; otherwise the README says no human run was timed.

### 10.3 Specs

- One spec per feature area: `wraith-core`, `llm-adapter`, `approval-ui`, `runtimes`, `todo-afterlife`, `notice-ghoul`, `wraith-mcp`, `app-authoring`.
- `requirements.md` in EARS with numbered requirement IDs.
- `design.md` with a "Correctness properties" section that links each property from section 9 to requirement IDs, and cites the official docs pages each design relies on.
- `tasks.md` with each task linked to requirement IDs.
- Created in the CLI with `/spec new <name>` if T3 Code exposes it (E6); otherwise written by hand in the documented format. The design phase of `wraith-core` and `notice-ghoul` runs in the IDE instead (section 10.7).
- Analyze Requirements runs on each spec in the CLI.

### 10.4 Hooks

Hook files follow the documented schema: `{"version": "v1", "hooks": [{name, description?, trigger, matcher?, action: {type: "command" | "agent", command | prompt}, timeout?, enabled?, confirm?}]}` ([Hooks](https://kiro.dev/docs/hooks)). Facts that shape the design:

- Trigger names are PascalCase. The JSON names used here (`PostFileSave`, `PreToolUse`, `PostTaskExec`) come from the [Hooks](https://kiro.dev/docs/hooks) and [IDE 1.0 hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks) pages.
- `timeout` is in seconds for command actions, default 60, and `0` disables it. It is ignored for agent actions.
- For tool triggers the matcher is a tool selector (tool ID, the categories `read`, `write`, `shell`, `web`, `spec`, `@mcp`, `@powers`, `@builtin`, `@<server>`, `@<server>/<tool>`) or a regex against the tool ID; hook JSON also accepts `*` and `?` wildcards. For file triggers the matcher is a regex against the file path ([Hook types](https://kiro.dev/docs/hooks/types)).
- Command actions run in the project root and receive session context as JSON on STDIN.
- Exit 0 adds stdout to the agent's context. Per the [Hook actions](https://kiro.dev/docs/hooks/actions) page, any other exit sends stderr to the agent and, for Pre Tool Use, blocks the tool call. The [IDE 1.0 hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks) page says exit 2 blocks and other non-zero codes are errors. The guards use exit 2, which satisfies both pages, and E3 tests it. Because any non-zero exit may block, each Pre Tool Use hook below states which way it fails.
- Kiro hooks only see actions the Kiro agent takes. A `git commit` typed in a terminal skips every hook below.
- File triggers fire only on agent edits. The [Hook types](https://kiro.dev/docs/hooks/types) page says: "File triggers respond only to changes made by the agent. Manual editor changes do not trigger File Create, File Save, or File Delete hooks." So any demo of `tests-on-save` or `spec-trace` (in the IDE fallback or the video) uses an agent edit, not a hand save.

**Commit detection** (shared by `commit-guard` and `todo-afterlife-precommit`). One script reads the shell command string (the field found in E2). It treats any `git` invocation whose subcommand is `commit` as a commit, including `git -C <path> commit`, `git -c <key>=<value> commit`, and commands chained with `&&`, `||`, `;` or `|`. The hook runs before the whole shell call, so it sees the index as it is before the call. `commit-guard` therefore blocks (exit 2) every form that would commit content the staged scan did not see: `-a` or `--all`, `--include`, pathspec arguments, and a `git add` chained before the commit in the same call. Its stderr message asks the agent to stage with `git add` in one call and commit in the next. Commands hidden in scripts, aliases or `sh -c` strings are not detected; KIRO_USAGE.md records this limit next to the terminal bypass.

**Guard bootstrap.** Phase 1 commits happen before a tsconfig, ESLint, Vitest or any app exists. Each `commit-guard` check reports pass, fail, or `skipped: <tool> not set up yet`, and skipped checks are printed in the hook output, never passed silently. A checked-in list (proposed: `scripts/guard-checks.json`) marks each check as required. The task that adds a tool switches its check to required in the same commit; after that, a missing tool is a failure. The `.kiro` and `.gitignore` check, the `LICENSE` check, the secret scan and the dependencies-versus-README check are required from the first commit.

| Hook | Trigger | Matcher | Action | Timeout and failure direction | Real work |
|---|---|---|---|---|---|
| `tests-on-save` | `PostFileSave` | A regex on the file path matching `.ts` files under `skeleton/` or `apps/<name>/` (exact regex set after E4) | Command: a script in `scripts/` reads the saved path from STDIN and runs the related Vitest tests with property tests in fast mode | Explicit `timeout` (proposed 60 s). A save cannot be blocked, so a timeout only reports that the run was cut short | Failing tests go straight back to the agent after every agent save |
| `commit-guard` | `PreToolUse` | `shell` | Command: acts on agent commit commands (detection above). Checks: `.gitignore` never mentions `.kiro` and `git check-ignore` does not ignore it; `LICENSE` exists; staged-diff secret scan (GitHub, AWS, Gemini and Groq key patterns, private keys); typecheck; lint; fast tests; the core-integrity test; every dependency in any `package.json` is listed in README "Pre-existing work"; fixture files carry the demo label. Blocks with exit 2 and a reason on stderr | Explicit `timeout` (proposed 180 s) and fast test mode keep it well under the limit. Whether a timeout blocks or allows the commit is E5. Fails closed: a crash blocks the commit, which is the right direction for a guard | Stops bad agent commits, including ones that would break the hard rules |
| `todo-afterlife-precommit` | `PreToolUse` | `shell` | Command: acts on agent commit commands (detection above); runs TODO Afterlife with the `cli` source (section 6). Exit 0 with findings; exit 2 only when `WRAITH_TODO_BLOCK=1` and the run completed | Explicit `timeout` (proposed 30 s), with its store-lock wait bounded far below it (proposed 5 s). Fails open: any internal error exits 0 with a warning, so an advisory hook never blocks commits by crashing | The app's own feature, used on this repo |
| `store-guard` | `PreToolUse` | `write` | Command: reads the target path from the tool input (field found in E2), resolves it, and blocks with exit 2 when it falls under `.wraith/`, with a stderr message pointing to the approval UI | Explicit `timeout` (proposed 10 s). Fails open with a warning if the payload shape is unknown, because it guards against mistakes, not attacks (section 5.4) | Keeps the agent's write tools from editing the action store or audit log behind the human gate |
| `doc-sync` | `PostTaskExec` | none | Agent prompt: update KIRO_USAGE.md and the README sections affected by the finished spec task, recording only what happened, with the commands run and their results | `timeout` does not apply to agent actions. It fires once per finished spec task, not on every save | Keeps KIRO_USAGE.md current as the rules' write-up questions require |
| `spec-trace` | `PostFileSave` | A regex on the file path matching markdown under `.kiro/specs/` | Command: a deterministic script that reports requirement IDs without a design reference or a task, and tasks that point at missing IDs | Explicit `timeout` (proposed 30 s) | Keeps EARS IDs, designs, tasks and tests traceable |

- Two hooks share the `PreToolUse` `shell` trigger. Neither depends on the other's result, and E10 records the order they run in.
- `PostTaskExec` fires after a spec task finishes. If tasks run through T3 Code do not fire it (E6), `doc-sync` falls back to a manual steering file run as a slash command at the end of each task, and KIRO_USAGE.md records that.
- **Order of doc-sync and the per-task commit.** The task's commit is made after `doc-sync` finishes, so the code and its docs land in one commit. If E6 shows that this order cannot be controlled through T3 Code, `doc-sync` makes its own docs-only commit right after the task commit (proposed message: `docs: sync KIRO_USAGE for <task>`), which also passes `commit-guard`. Either way, no task's docs land in the next task's commit.
- Optional backstop for the terminal-commit bypass: the plain git pre-commit script from section 6, installed only if you choose to.

### 10.5 Custom agents

Agent files are JSON or Markdown in `.kiro/agents/`. Documented fields include `name`, `description`, `tools`, `excludedTools`, `includeMcpJson`, `includePowers`, `resources` (`file://`, `skill://`), `permissions.rules` (`capability`, `match`, `effect`), `prompt`, `model` and `mcpServers` ([Custom agents](https://kiro.dev/docs/custom-agents), [MCP](https://kiro.dev/docs/mcp)). In V3, a sub-agent tool call runs without a prompt only when the parent session's policy also allows it ([CLI V3](https://kiro.dev/docs/cli/v3/)). Every agent file is checked with `kiro-cli agent validate`.

| Agent | Role | Tools and permissions | Loads |
|---|---|---|---|
| `skeleton-warden` | Reviewer | Read and search tools; shell limited by permission rules to the integrity, budget and test scripts; write allowed only under `docs/reviews/` (exact path-matching syntax for permission rules: to confirm) | `product.md`, `structure.md`, `wraith-domain.md` |
| `app-smith` | Builder for app #3 | May write only under a new `apps/<name>/` folder and `docs/`; writes to `skeleton/` denied (exact path-matching syntax for permission rules: to confirm) | `skeleton-authoring.md`, `structure.md`, the 15-minute guide |

- `skeleton-warden` checks that apps use only public extension points, that the core budget and zero-dependency rule hold, that there is no forked code, and that specs trace to tests. It writes dated reports to `docs/reviews/`, the only place it may write.
- `app-smith` rehearses the 15-minute guide on a scratch app in `apps/<scratch-name>/` inside the repo. That folder is inside its write permission and inside the npm workspaces, so the scratch app resolves the skeleton exactly as the guide describes. The scratch app is deleted afterwards and never committed. Its time is reported as agent time (section 10.2).

### 10.6 MCP servers

Configured in `.kiro/settings/mcp.json`.

| Server | What it is | Why it helps |
|---|---|---|
| `wraith` | A custom stdio MCP server built in this repo with the official MCP TypeScript SDK (package and API to confirm). Tools: list events, list pending actions, explain an action (rules fired in order, advisor or fallback, audit trail), simulate an event through an app's rules with zero side effects, verify the audit chain, list extension points | While Kiro writes rules, it can replay fixtures and see exactly which rules fire. It deliberately has no approve or execute tool, so nothing reached through MCP can approve an action (the wider limits of the gate are in section 5.4) |
| `aws-docs` | The [AWS Documentation MCP server](https://github.com/awslabs/mcp/tree/main/src/aws-documentation-mcp-server), run with `uvx awslabs.aws-documentation-mcp-server@latest`. Tools `read_documentation`, `search_documentation`, `read_sections`, `search_table`, `recommend`. Needs uv and Python 3.10+, no AWS credentials (uv and uvx are installed) | Confirms SAM, Lambda, Function URL, DynamoDB, Scheduler and SSM details and the free-tier tables in official docs |
| Context7 (candidate) | A docs MCP server for library docs (Vitest, fast-check, the MCP TypeScript SDK, esbuild). Free usage terms and whether it needs an API key: to confirm before adding | Confirms library APIs instead of guessing |
| Playwright MCP (optional) | Screenshot-based design review of the approval UI. Package and terms to confirm | Lets an agent look at the real UI during the design pass |

Provider docs that no MCP server covers (GitHub REST, Gemini, Groq, Ollama, RFC 5545) are read directly from the official pages and cited in each spec's design.md.

### 10.7 Powers, and steps you run in the Kiro IDE

**Powers.** A power is a directory with a `plugin.json` manifest (with activation keywords), an optional `skills/` folder and an optional `mcp.json`. It follows the Agent Plugins specification and activates by keyword ([Powers](https://kiro.dev/docs/powers)). Candidates seen on the [Kiro powers registry](https://kiro.dev/powers/) on 15 Nov 2026:

- "AWS Core" (AWS MCP Server plus skills for infrastructure, core services, security, observability, databases, SDKs and cost).
- "Local AWS Emulator & Learning Environment" (MiniStack; claims to emulate 60+ AWS services on one port, no account, no Docker).
- "GitWarren" (local code review).

The terms, licenses and credential needs of each are to confirm before install. Nothing is installed without your approval. If you approve "Local AWS Emulator", its concrete job is running the DynamoDB half of the store contract suite (section 9.3) instead of DynamoDB Local. KIRO_USAGE.md records what each installed power changed, or that none fitted. Stretch goal: author a `wraith-kit` power (manifest, a "new Wraith app" skill, and an `mcp.json` for the `wraith` server) so app #3 authors can add the skeleton know-how to any Kiro session. Creating powers is supported in CLI V3.

**Steps you run in the Kiro IDE** (the CLI cannot do these; I will stop and ask when the work reaches each one):

1. **Design phase with Correctness for `wraith-core` and `notice-ghoul`.** Correctness is IDE only, and in the IDE properties are extracted in the design phase ([Correctness](https://kiro.dev/docs/specs/correctness)). It is not established that the IDE extracts properties from a design.md written elsewhere. So for these two specs, the CLI writes requirements.md, and you run the design phase in the IDE. You review the IDE's diff before anything is committed. I then add the links from the IDE's properties to the section 9 property IDs, and KIRO_USAGE.md compares Kiro's extracted properties with the hand-written fast-check properties. The other six specs keep their design phase in the CLI.
2. **Optional:** Markdown Review on one spec.
3. **If hooks do not fire through T3 Code (E1):** demo the hooks in the IDE or in an interactive `kiro-cli` terminal session. For `tests-on-save` and `spec-trace` the demo needs an agent edit, because manual saves do not fire file triggers (section 10.4).
4. **Screenshots** of the specs, hooks, agents and MCP panels for KIRO_USAGE.md, and IDE footage for the video if useful.

### 10.8 Experiments at the start of the spec phase

The docs leave these unclear for a session driven by T3 Code over ACP. Results, including failures, go into KIRO_USAGE.md and `docs/experiments.md`.

| ID | Question | When | Fallback if it fails |
|---|---|---|---|
| E1 | Do `.kiro/hooks/` hooks fire inside the T3 Code ACP session? (The session must start in `wraith-kit/`.) | First hook task | Demo hooks in an interactive `kiro-cli` session or the IDE; KIRO_USAGE.md says so |
| E2 | What is the shell tool's ID, which field inside `tool_input` holds the command, and which field holds the target path for the `write` tools (for `store-guard`)? | First hook task | The guard scripts check several candidate fields and log the payload shape in a debug mode |
| E3 | Does exit 2 (and other non-zero codes) block the shell call in CLI V3, and where does stderr show? | First hook task | If exit 2 does not block, use the code that does and record the difference between the two docs pages |
| E4 | What is the shape of the `PostFileSave` STDIN payload? Is the file path relative or absolute, and what does the matcher see? Does CLI V3 expand the `{{filePath}}` variable shown on the IDE 1.0 page? | First hook task | Widen the matcher to `\.ts$` and filter in the script, which normalises the path itself |
| E5 | When a `PreToolUse` command times out, is the tool call blocked or allowed? | First hook task | If allowed, move slow checks out of the guard into `npm test` and document it; if blocked, size the timeout so slow runs do not block valid commits |
| E6 | Are `/spec`, `/agent`, `/hooks` and the steering slash commands reachable through T3 Code? Does a spec task run there fire `PostTaskExec`, and does it fire before or after the agent's per-task commit? | First spec task | Run them in interactive `kiro-cli`; write spec files by hand in the documented format; run `doc-sync` as a manual steering slash command; if the order cannot be controlled, `doc-sync` makes its own docs-only commit (section 10.4) |
| E7 | Does `auto` steering inclusion trigger in CLI V3 for `skeleton-authoring.md`? | Steering task | Switch the file to `manual` |
| E8 | Can a custom agent be selected through ACP (`session/set_mode`), and do project agents work as sub-agents? | Agents task | Start the agent in an interactive `kiro-cli chat` session (exact command checked with `kiro-cli chat --help`) |
| E9 | Do hook matchers `@wraith/<tool>` match the internal `mcp_wraith_<tool>` IDs? Only matters if a hook targets `wraith` tools; none of the six planned hooks does yet | MCP task | Use a regex against the internal ID, which the docs also allow |
| E10 | With two `PreToolUse` hooks on `shell`, in what order do they run? | First hook task | Nothing depends on the order; if needed, the TODO check moves into the commit-guard script |
| E11 | Which kiro-cli version does the ACP session actually run (the 3.3.0 binary or the earlier 3.2.1 bundle)? | Start of the spec phase | Record it, re-check the matrix in section 10.1 against the [CLI changelog](https://kiro.dev/changelog/cli) for that version, and ask you to restart T3 Code if needed |

### 10.9 KIRO_USAGE.md upkeep

- Created in the first spec-phase commit, not in this plan commit (your ORDER says PLAN.md first, then stop).
- Records from day one that this plan was written through T3 Code driving Kiro CLI over ACP.
- Updated after every task by `doc-sync`, or by the fallback in E6.
- Answers all eight write-up questions from the rules: Kiro surfaces used (IDE, CLI, Web, Crew) and how they differed, custom agents, hooks, spec-driven versus vibe coding, steering strategy, MCP, property-based testing, powers.
- States "not yet" for anything not done, and reports experiment results and test results as they happened, including failures.

## 11. Running locally and on the AWS free tier

### 11.1 Local (no account needed)

- `npm install`, then one command per app that starts the server, the scheduler and the approval UI with the file store and demo data.
- A replay command for signed fixture webhook deliveries, so TODO Afterlife needs no public URL or tunnel.
- A fixture site server for Notice Ghoul.
- Exact script names are set in the `runtimes` spec. `docs/run-local.md` and each app README document them.

### 11.2 AWS free tier (only when you say go)

One SAM template per app, in that app's folder. The same template deploys as separate stacks, chosen by a parameter (proposed name: `Mode=demo|real`):

| Stack | Who uses it | Holds | Executors |
|---|---|---|---|
| `notice-ghoul-demo` | Judges and visitors | Demo data, the fixture site, the audit key, a demo access code | Dry-run where an action has an outside effect; the digest and `.ics` are generated for real from demo data |
| `todo-afterlife-demo` | Judges and visitors | Demo data, the audit key, a demo access code. **No GitHub token** | Dry-run only: shows the exact issue or patch that would be created |
| `todo-afterlife-real` | You only, for the video footage | Your fine-grained token, the sandbox repo's webhook secret, the audit key, an admin token you never share | Real, against your sandbox repo only. You may delete the stack after recording |

Notice Ghoul has no real-mode stack because it holds no outside credentials. Each stack has:

- One Lambda function (Node.js runtime version to confirm, arm64 proposed), bundled with esbuild.
- A Function URL with auth type NONE, because the app checks the webhook HMAC and its own session tokens itself (to confirm). No API Gateway.
- One DynamoDB table: Standard class, provisioned mode, and a TTL attribute. Capacity stays under 25 RCU and 25 WCU in total across all three stacks, including any indexes (proposed: 5 RCU and 5 WCU per table, 15 and 15 in total). Whether the free allowance counts per account or per region: to confirm.
- One EventBridge Scheduler schedule that runs the tick (section 5.1): expanding deliveries, retries, lease expiry, aggregates, Notice Ghoul polling and the demo reset. Proposed rate: every 5 minutes, which is 8,640 invocations per stack in a 30-day month. TODO Afterlife's stacks have this schedule too, so their retries and demo reset have a driver.
- **A cap on public traffic.** Function URLs with auth type NONE are open to anyone, and on the Free plan the account closes when credits run out. Each function gets a reserved concurrency limit (proposed: a small number; whether a new account's concurrency quota allows reserving any is to confirm). An AWS Budgets alert at a low amount warns you by email (Budgets pricing and Free plan coverage to confirm through `aws-docs`). If the alert fires, the demo stacks are the first thing to take down, and the README's local run stays available.
- CloudWatch log retention set short.
- No Provisioned Concurrency.

Free-tier facts (read 15 Nov 2026):

- [AWS Free Tier](https://aws.amazon.com/free/): new accounts get up to $200 in credits over 6 months on the Free plan. "The account closes on its own 6 months after you open it or when your credits run out, whichever comes first." The Free plan is "Limited to select services only". 30+ services are "always free" within monthly limits on both the Free and Paid plans. Your account type is unknown (question 3); nothing was called.
- [Lambda pricing](https://aws.amazon.com/lambda/pricing/): the free tier for Event Functions includes 1 million requests and 400,000 GB-seconds per month. The page also lists "MicroVMs" and "Web Functions" pricing types; the plan uses standard functions. Provisioned Concurrency is not covered by the free tier. Function URL pricing: to confirm.
- [DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/): the free tier includes 25 WCUs and 25 RCUs of provisioned capacity and 25 GB of storage for the Standard table class. The on-demand free allowance: to confirm.
- [EventBridge pricing](https://aws.amazon.com/eventbridge/pricing/): the EventBridge Scheduler free tier is 14,000,000 invocations per month.
- **Free plan service coverage, to confirm in the spec phase through `aws-docs`:** whether Lambda Function URLs, DynamoDB, EventBridge Scheduler, SSM Parameter Store and CloudWatch Logs are all usable on the Free plan. If one is not, the plan uses a documented alternative (for example a DynamoDB item instead of SSM for the admin token hash), never a paid feature.

Validation and deploy:

- Templates are validated offline with `sam validate --lint` or `cfn-lint` (installed).
- The AWS SAM CLI is not installed. Installing it needs your OK; the exact install command is to confirm in AWS docs.
- Deploy uses `sam deploy --guided`, only after you log in. The exact login command depends on how your AWS profile is set up (SSO profile or console sign-in) and is confirmed at that point. I stop and hand you the command.

### 11.3 Hosted demo mode and the judge URL

- The public URLs are the two demo stacks: demo data, dry-run executors where an action has an outside effect, scheduled reset (section 5.4). README placeholders: `<todo-afterlife-function-url>` and `<notice-ghoul-function-url>`. The real TODO Afterlife stack's URL is never published.
- **How judges get in (proposal, question 4).** Read-only pages (queue, action detail, audit log, digest, `.ics`) are public on the demo stacks. Approve, edit and reject need a demo access code, which goes in the submission form's testing instructions, as the rules allow for credentials. The code works only on the demo stacks, is exchanged once at a login form for a session cookie under the rules in section 5.4, and only ever drives demo data.
- The URLs must stay live and free to use until the Judging Period ends on 29 Jan 2027. If your AWS account is on the Free plan, it closes 6 months after opening or when credits run out, so its opening date matters (question 3).

### 11.4 What needs your go or your login

| Step | What I prepare | What you do |
|---|---|---|
| Create and push the public GitHub repo | Everything committed locally; the exact `gh repo create` command, checked with `gh repo create --help` at that time (`gh` is logged in as `himanshu748`) | Say go |
| Install the AWS SAM CLI | The install command from AWS docs | Say OK |
| AWS login and deploy | Validated templates and the exact login and deploy commands | Log in, say go |
| First deploy right after 29 Nov (question 14) | The three stacks from section 11.2, validated offline, and a checklist for the first live take of the video footage | Log in and say go on 30 Nov, so Phase 6 is left for re-recording only |
| GitHub sandbox repo, fine-grained token, webhook | Exact steps and the minimum token permissions (to confirm in GitHub docs) | Create them; keep the token out of the repo |
| Gemini or Groq keys (optional) | Where to put them (environment variables only) | Create keys if you want them |
| Video, blog post, social post, Devpost form | VIDEO_SHOTLIST.md, BLOG_DRAFT.md, SOCIAL_POST.md, SUBMISSION_CHECKLIST.md | Record, publish, fill in and submit |

## 12. Phases, dates and commits

Dates are in IST. Every task ends with a local commit. Nothing is pushed, deployed, posted or submitted without your go.

| Phase | Dates | Work |
|---|---|---|
| 0. Plan | 15 Nov | This file. **Stop for approval.** |
| 1. Spec | 16 to 18 Nov | `LICENSE`, `.gitignore`, README stub with "Pre-existing work", KIRO_USAGE.md, steering (5 files), hooks together with experiments E1 to E11, agents (validated with `kiro-cli agent validate`), MCP config, all 8 specs, Analyze Requirements. **IDE step:** you run the design phase of `wraith-core` and `notice-ghoul` in the IDE with Correctness, and review the IDE's diff before it is committed (section 10.7). |
| 2. Build | 19 to 29 Nov | `wraith-core` and its PBT (19 to 21), node runtime, file store and approval UI (22 to 23), LLM adapter (23), `wraith` MCP server (24), TODO Afterlife and its hook (24 to 26), Notice Ghoul and the fixture site (26 to 28), aws runtime, DynamoDB store and SAM templates validated offline (28 to 29). |
| 3. Tests | Alongside phase 2; hardening 29 to 30 Nov | Unit tests, PBT, the store contract suite on both stores, Playwright and axe, template validation, core-integrity test. **30 Nov, only on your go and login (question 14):** first deploy of the three stacks and a first take of the live footage. |
| 4. Polish | 30 Nov to 1 Dec | Design pass, accessibility pass, 15-minute guide rehearsal by `app-smith`, `skeleton-warden` review. |
| 5. Docs | 1 to 2 Dec | README, KIRO_USAGE, DEVPOST_STORY, VIDEO_SHOTLIST, BLOG_DRAFT, SOCIAL_POST, SUBMISSION_CHECKLIST, both app READMEs. |
| 6. Your steps | 2 to 4 Dec | Say go for repo creation and push, re-deploy if anything changed (you log in), record or re-record the video, publish the blog and social posts, fill in the Devpost form. Aim: submission-ready by 3 Dec IST. Hard stop: 5 Dec, 03:30 IST. |

**Cut order if behind** (cut first to last):

1. The `wraith-kit` power (stretch).
2. Playwright MCP.
3. The HTML-page source for Notice Ghoul (keep RSS and Atom).
4. The third LLM provider.

**Never cut:** both apps, the approval UI, idempotency, retries and claim leases, the audit log, the "confirm deadline" path in Notice Ghoul, the local run, validated SAM templates, PBT for idempotency and rule ordering, the core-integrity test, the hooks, the agents, the MCP server, and every deliverable.

## 13. Deliverables

- **README.md:** what it is, who it is for, how to run locally and on AWS, how to run the tests, working app URL placeholders for both apps (`<todo-afterlife-function-url>`, `<notice-ghoul-function-url>`), and "Pre-existing work".
- **`apps/todo-afterlife/README.md` and `apps/notice-ghoul/README.md`:** each app's own setup and run instructions.
- **KIRO_USAGE.md:** answers every write-up question from the rules (section 10.9).
- **DEVPOST_STORY.md:** an honest story; demo data labelled as demo data; no invented users or stats.
- **VIDEO_SHOTLIST.md:** under 3:00, real footage, no copyrighted music; shows the same skeleton serving two audiences, with a real approval step in each app (a TODO rewrite or issue, and a "confirm deadline"). Hook shots use agent edits, because manual saves do not fire file triggers.
- **BLOG_DRAFT.md:** states it was written for the Kiroween 2026 hackathon.
- **SOCIAL_POST.md:** starts with `#KiroweenHackathon26`. Your favourite thing about Kiro is left as a clearly marked TODO for you. Social Blitz is judged on "original thoughts versus AI writing" (section 2), so the file says at the top that the whole post is a draft for you to rewrite in your own words before posting.
- **SUBMISSION_CHECKLIST.md:** Skeleton Crew; Best Student Project (Skeleton Crew) with the details to provide; Best Demo; Bonus Blog; Social Blitz; Kiro credits; URLs kept live until 29 Jan 2027; and each rules item from section 2.
- **LICENSE:** an OSI license (question 2).
- **docs/make-your-own-app-in-15-min.md**, plus `architecture.md`, `run-local.md`, `deploy-aws.md` and `experiments.md`.

## 14. Guardrails

These restate your hard rules as commitments.

- **Public repo and license.** The repo becomes public on GitHub only on your go, with an OSI license that GitHub shows in the About section.
- **`/.kiro` at the root.** Specs, hooks, steering, agents and MCP settings are committed at the repo root. `.kiro` never appears in `.gitignore`, and the commit guard checks it.
- **Brand-new code only.** Every template, library and tool is listed in README "Pre-existing work", and the commit guard checks dependencies against that list.
- **Free tiers only.** Any runtime LLM is a free tier (Gemini free, Groq free) or local (Ollama), behind one adapter, with the `none` fallback as the default so judges can always test it.
- **No publishing.** Nothing is published, deployed to production, posted or submitted. Free hosting happens only when you say go. If a login is needed, I stop and give you the exact command.
- **No fabrication.** No invented users, stats or testimonials. Demo data is labelled as demo data everywhere.
- **No guessing.** Every API is confirmed in official docs, through MCP docs servers where available. Anything not yet confirmed stays marked "to confirm".
- **Order of work.** PLAN.md, then stop for approval. Then spec, implementation, tests, polish, docs. A commit after each task. Never submit.
- **Skeleton purity.** No forked core code in the apps; section 8's test proves it.

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Shared workspace: other sessions have overwritten the root PLAN.md before | Wraith Kit lives in its own repo (section 3) |
| Hooks may not fire through T3 Code ACP | E1; fall back to interactive `kiro-cli` or the IDE |
| Commit guard bypassed by terminal commits | Optional git pre-commit script; KIRO_USAGE.md says so |
| Agent commit commands that commit unscanned content (`git commit -a`, pathspecs, `git add` chained before the commit) | Commit detection blocks those forms and asks the agent to stage first (section 10.4); commands hidden in scripts or aliases stay a documented limit |
| Guard slower than the hook timeout | Fast test mode, explicit timeouts, E5 |
| Guard blocks Phase 1 commits, or passes checks whose tools do not exist yet | Each check reports "skipped" until the task that adds its tool makes it required (section 10.4) |
| Advisory TODO hook crashes and blocks every agent commit | It fails open: internal errors exit 0 with a warning; bounded lock wait (section 6) |
| `doc-sync` may not fire if `PostTaskExec` does not fire through T3 Code | E6; manual steering slash command as fallback |
| `doc-sync` edits land in the next task's commit | Commit after doc-sync, or doc-sync makes its own docs-only commit (section 10.4, E6) |
| Hook process and local server writing the same file store | Lock file with exclusive create, stale-lock timeout and atomic rename; P1 tests interleaved intake from two store handles |
| The Kiro agent edits the local store or uses the UI behind the human gate | `store-guard` blocks agent write tools under `.wraith/`; the login link stays out of stdout; the remaining shell access is stated as a limit (section 5.4) |
| An action stuck in `executing` after a crash or Lambda timeout | Claim lease that expires to `retry-wait` on the next tick, with `lookup` before the retry; P2 covers it |
| GitHub's 10-second reply window, with no automatic redelivery | `accept` replies after verify, dedupe and store; the diff fetch and the advisor run after the reply; README explains manual redelivery |
| Concurrent audit appends fork the chain | Conditional append on `seq` (DynamoDB) and the store lock (file store); P6 with interleaved appends |
| Someone with store access rewrites the audit log | HMAC chain with the key kept outside the store; the README states who can still rewrite it (section 5.3) |
| DynamoDB conditional writes behave differently from the file store | Store contract suite run against both stores (section 9.3) |
| AWS Free plan closes before 29 Jan 2027, or credits run out | Check the account (question 3); no paid features; if no AWS option can stay live, pick another free host with you |
| A flood of requests against the public Function URLs uses up credits | Reserved concurrency cap and a Budgets alert (both to confirm); take the demo stacks down first; the local run stays available |
| A service needed for the hosted demo is not covered by the Free plan | Confirm coverage in the spec phase; documented free alternative (section 11.2) |
| Public Function URLs | HMAC check for webhooks, session rules on AWS as well as locally, a demo access code that works only on the demo stacks, and no GitHub token in any public stack (section 11.2) |
| GitHub issue creation after an unknown outcome could duplicate | Hidden idempotency marker; `lookup` lists issues by the `wraith-kit` label before any retry (endpoint to confirm); search lag on the fallback path documented |
| First real deploy fails close to the deadline | Ask for a first deploy on 30 Nov (question 14), leaving Phase 6 for re-recording |
| A wrong date reaches a student's calendar | Only deterministic, unambiguous dates go straight to the digest and `.ics`; LLM-sourced, ambiguous, year-uncertain and disputed dates need a "confirm deadline" approval; NG-P4 tests it |
| Gemini free-tier data use | Default `none`; disclosure in README and UI |
| Free model IDs and limits change | Model is configuration; the fallback always works |
| Scraping real college sites | User-configured sources only, polite polling, robots.txt respected |
| DD/MM versus MM/DD ambiguity, and dates with no year | Per-source locale, an ambiguity flag, year inference from the publish date, and a "confirm deadline" approval for every flagged date |
| A corrected notice leaves a stale calendar entry | Event key includes a content hash; `.ics` UIDs come from the deadline record, so a moved date updates the same entry |
| `.ics` compatibility, or hostile notice text in the `.ics` or digest | Independent parser in tests with hostile strings (NG-P3); RFC 5545 escaping and folding; escaping `html` template; a manual import test in one calendar app |
| Overlap with Deadline Graveyard (student deadlines and `.ics`) | "Substantially different" rule; no shared code; question 7 |
| Third-party trademarks in the video (GitHub UI, calendar apps) | Keep them incidental, no logos in thumbnails or title cards; question 13 |
| 19 days left and several Kiroween plans in this workspace | Cut order in section 12 |
| Kiro CLI version mismatch between the binary and the ACP session | E11 |
| Devpost blocks automated fetches (403) | Rules read via `curl`; re-read before submission |

## 16. Pre-existing work (planned)

Every item and version gets confirmed at install time and listed in README "Pre-existing work":

- TypeScript and Node.js built-ins.
- Vitest, fast-check (plus its Vitest integration if used), tsx, esbuild.
- ESLint with typescript-eslint.
- Playwright and `@axe-core/playwright`.
- The MCP TypeScript SDK and its schema library dependency.
- AWS SDK for JavaScript v3 DynamoDB and SSM clients (aws runtime only).
- An RSS/Atom XML parser and an HTML parser for Notice Ghoul (chosen in the spec phase).
- `ical.js` (dev only, tests).
- DynamoDB Local (dev only, run in Docker for the store contract suite; image and license to confirm), unless you approve the "Local AWS Emulator" power instead.
- Tools: AWS SAM CLI, cfn-lint, uv and the AWS Documentation MCP server, and any other docs MCP server you approve.
- Optional: Ollama and the chosen local model (model license to confirm).

No templates, fonts or icon packs. The repo started empty, so no T3 Code placeholder files are included.

## 17. Open questions for you

1. **Repo location:** OK with `/Users/himanshujha/.t3/projects/kiro/wraith-kit/` as its own git repo, published later as `wraith-kit`? Please add it as its own T3 Code project so Kiro sessions start there and load `.kiro/`.
2. **License:** MIT or Apache-2.0?
3. **AWS:** is your account on the legacy free tier or a Free plan account (which closes 6 months after opening)? When was it opened? Preferred region? How do you sign in (SSO profile or console sign-in)? OK to install the AWS SAM CLI?
4. **Hosted demo:** OK with three stacks (two public demo stacks with no GitHub token, and a private real TODO Afterlife stack for your footage, section 11.2)? OK that judges see read-only pages without a code and use a demo access code from the submission form to approve or reject, with every judge click dry-run? Or should judge approvals create real issues in a sandbox repo you own?
5. **GitHub sandbox repo** for TODO Afterlife: what name? You will also need a fine-grained token; I will give exact steps when needed.
6. **LLM:** default `none`, plus Gemini free, Groq free and Ollama (`qwen3:4b-instruct` is installed). Do you have Gemini and Groq keys? Any provider you want dropped?
7. **Overlap with Deadline Graveyard:** are you submitting both? If yes, Notice Ghoul stays focused on notice ingestion, dedupe and the digest, or we pick a different student app.
8. **Best Student:** solo or team? Are LinkedIn, student email, year, degree and school ready for every member?
9. **Kiro credits:** still received and redeemed?
10. **Clarification request:** should I draft a written request to Devpost about "2 separate repo folders"? You would send it.
11. **Naming and theme:** keep "Limbo" as the approval queue name, spectral green for TODO Afterlife and candle amber for Notice Ghoul, or change them?
12. **Real notice sources:** any real college notice pages or RSS feeds you want configured locally (never committed)?
13. **Video:** OK to show GitHub and a calendar app on screen incidentally?
14. **Early first deploy:** will you log in and say go for a first AWS deploy on 30 Nov, right after the templates are validated, so the live footage is not left to the last three days? (This only schedules the request; nothing is deployed without your go.)
15. **15-minute guide:** will you time one run of the guide yourself? If not, the README reports only the agent's time, labelled as agent time, and says no human run was timed.
