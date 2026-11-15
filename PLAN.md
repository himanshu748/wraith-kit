# Wraith Kit: Plan

Kiroween 2026 entry. **Category:** Skeleton Crew. **Bonus targets:** Best Student Project (Skeleton Crew), Best Demo, Bonus Blog, Social Blitz.

**Hard deadline:** Fri 4 Dec 2026, 2:00 PM PT (Sat 5 Dec 2026, 03:30 IST). The rules allow no extensions and no late submissions.

## 0. Status and approval gate

- Status: **draft, waiting for your approval.**
- Nothing in this plan has been built, tested or measured. This repo holds only this file. There is no `LICENSE`, `.kiro/`, `package.json`, `README.md`, spec, hook, agent or code yet.
- This plan was written on 15 Nov 2026 through T3 Code driving Kiro CLI over ACP. KIRO_USAGE.md will record that surface from its first commit (section 10.9).
- Work continues with the spec phase (section 12) only after you approve this plan or send changes. Open questions are in section 17.
- Every later task ends with a local commit. Nothing is pushed, deployed, posted or submitted without your explicit go.

## 1. What Wraith Kit is

Wraith Kit is a lean TypeScript skeleton for small event agents that ask before they act. An event arrives (a webhook, or a feed the kit polls) and is normalised into an `Event`. It then passes through deterministic rules, optionally gets wording help from a free-tier or local LLM through one adapter, and ends as a proposed `Action`. Every action waits for a human in a tiny approval web UI unless its kind is explicitly declared safe. Everything is recorded in a hash-chained audit log, with retries and idempotency keys, so a redelivered webhook never produces a second action. It runs locally with Node or on the AWS free tier (Lambda, Function URLs, DynamoDB via SAM). Two very different apps are built on it: TODO Afterlife for developers and Notice Ghoul for students.

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
                doc-sync.json, spec-trace.json
    agents/     skeleton-warden.md, app-smith.md
    settings/   mcp.json
  skeleton/     the template: package.json (exports), src/{core,node,aws,llm,ui,mcp,testing},
                template/ (starter files for app #3), test/
  apps/
    todo-afterlife/   README.md, package.json, src/, fixtures/, template.yaml (SAM), test/
    notice-ghoul/     README.md, package.json, src/, fixtures/site/, template.yaml (SAM), test/
  tests/        core-integrity.test.ts
  docs/         make-your-own-app-in-15-min.md, architecture.md, run-local.md, deploy-aws.md
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
| F1 | Core pipeline and extension-point API (`defineApp`) | **Potential Impact** | A developer gets a working event agent by writing only sources, rules and actions, which is the problem the skeleton exists to solve. |
| F2 | Idempotency keys, dedupe, retries with backoff, dead-letter | **Potential Impact** | Webhooks get redelivered and networks fail; without these an agent creates duplicate issues and nobody would keep using it. |
| F3 | Approval-by-default action safety model (safe kinds must say why) | **Innovation/Idea** | The agent proposes and a human decides, and "safe" is a declared, explained exception rather than the default. |
| F4 | Hash-chained audit log and "explain this action" trace | **Innovation/Idea** | Combines a tamper-evident history with a plain trace of which rules fired and why, inside a small kit. |
| F5 | One LLM adapter (none, Gemini free, Groq free, Ollama) with a deterministic fallback; "AI can edit the words, never the decision"; "the LLM proposes, the rules verify" | **Innovation/Idea** | The LLM is optional and boxed in: it may reword, and any date it extracts must quote evidence the rules can check. |
| F6 | Approval UI (queue, detail, approve, edit, reject, audit view) | **Design** | The approval step is where people meet the product, so it has to be clear and intentional, not a JSON dump. |
| F7 | Shared theme and accessibility (keyboard first, WCAG AA, reduced motion, axe checks) | **Design** | Polish and accessibility make it a complete product; keyboard-first suits a repetitive approve or reject task. |
| F8 | Local Node runtime: one command, file store, demo data, webhook replay | **Potential Impact** | Anyone, judges included, can run both apps with no account, no API key and no tunnel. |
| F9 | AWS free-tier deployment with SAM (Lambda, Function URL, DynamoDB, Scheduler) | **Potential Impact** | Gives a real hosted path that stays inside free-tier limits (limits and coverage to confirm, section 11). |
| F10 | TODO Afterlife app (push webhook, vague-TODO rules, rewrite, issue, retire) | **Potential Impact** | Turns vague TODOs into concrete tasks or tracked issues, or retires them, for developers. |
| F11 | TODO Afterlife local Kiro pre-commit hook | **Technological Implementation** | Uses a Kiro `PreToolUse` hook as part of the product: the same app checks TODOs before the agent commits. |
| F12 | Notice Ghoul app (poll, deadline extraction, dedupe, digest, `.ics`) | **Potential Impact** | Gives students one de-duplicated digest and a calendar file instead of several notice boards to check. |
| F13 | Fictional fixture college site and hosted demo mode | **Presentation** | Gives judges and the video a safe, repeatable end-to-end demo with clearly labelled demo data. |
| F14 | Core-integrity test (both apps import the same unmodified core), run by the commit-guard hook and the skeleton-warden agent | **Technological Implementation** | Proves the Skeleton Crew claim in code, enforced by a Kiro hook and a Kiro agent, instead of asserting it. |
| F15 | "Make your own app in 15 min" guide, `new-app` scaffold, skeleton-authoring steering | **Design** | For a skeleton, the developer experience of building app #3 is the product experience. |
| F16 | `/.kiro` specs (EARS), steering, hooks, custom agents | **Technological Implementation** | This is what judges read in `/.kiro`: several Kiro tools doing real work, with experiments recorded. |
| F17 | `wraith` MCP server plus docs MCP servers | **Technological Implementation** | Kiro can replay fixtures through an app's rules with zero side effects, and confirm APIs in official docs. |
| F18 | Property-based tests (P1 to P7, TA-P1 and TA-P2, NG-P1 to NG-P4) | **Technological Implementation** | Covers the two properties you asked for (idempotency, rule ordering) and links each property to EARS requirement IDs. |
| F19 | README, KIRO_USAGE, DEVPOST_STORY, BLOG_DRAFT, SOCIAL_POST, SUBMISSION_CHECKLIST | **Presentation** | States the problem, the audiences and the build plainly, including what was not done. |
| F20 | Video: one skeleton, two audiences (VIDEO_SHOTLIST.md) | **Presentation** | Shows both apps working end to end on the same core in under 3 minutes. |

Coverage: Potential Impact (F1, F2, F8, F9, F10, F12), Technological Implementation (F11, F14, F16, F17, F18), Design (F6, F7, F15), Innovation/Idea (F3, F4, F5), Presentation (F13, F19, F20).

## 5. Skeleton architecture

All names below are design intent. Final names, signatures and config syntax are set in the `wraith-core` spec after the relevant docs are confirmed.

### 5.1 Pipeline and extension points

Pipeline stages:

```text
Source (webhook route or poller or cli)
  -> Normalise -> Event
  -> Dedupe by idempotency key
  -> Rules (deterministic, ordered)
  -> Advisor (optional LLM, with deterministic fallback)
  -> Proposed Action
  -> Approval (human, unless the action kind is declared safe)
  -> Executor (retries, idempotency)
Audit log entry at every step.
```

An app provides only these extension points, passed to `defineApp({...})`:

1. **`sources`:** webhook routes (path, request verification, normalise to `Event[]`) and pollers (schedule, fetch with conditional GET support, normalise to `Event[]`). A third source type, `cli`, lets a local command feed events; the TODO Afterlife pre-commit hook uses it.
2. **`rules`:** a list of rules, each with `id`, `priority`, `description` and a pure `evaluate(event, ctx)` that returns findings and candidate actions. Rules do no I/O and read time only from `ctx.clock`.
3. **`advisor`** (optional): a prompt builder, an output schema and a deterministic fallback. The advisor may only rewrite the wording of actions the rules already proposed. It cannot add action kinds, change targets or change safety. In short: **AI can edit the words, never the decision.**
4. **`actions`:** action kinds with `describe` (the preview shown in the UI), `execute(payload, ctx)` (which receives the idempotency key), an optional retry policy, and `safety`. Omitted safety means "needs approval". `safety: "safe"` must carry a written `reason`, which the UI and the audit log show.
5. **`views`** (optional): HTML renderers for event and action cards, written with a tiny escaping `html` tagged template that the skeleton provides.
6. **`theme`:** app name, accent colour, icon.

Runtime entry points are separate package exports so the core stays small:

| Entry | Contents |
|---|---|
| `core` | Pure pipeline, zero runtime npm dependencies, Node built-ins only |
| `node` | `node:http` server, JSON-lines file store, interval scheduler |
| `aws` | Lambda Function URL handler, DynamoDB store |
| `llm` | The adapter and its providers |
| `ui` | The approval UI |
| `mcp` | The `wraith` MCP server |
| `testing` | Fakes and fast-check arbitraries for app authors |

**Lean budget.** `skeleton/src/core` stays under a line budget (proposed: 1,200 non-blank lines, counted by a script) and has zero runtime npm dependencies. The README reports both numbers as measured by that script, not as targets.

### 5.2 Data model and action states

- **`Event`:** `id`, `appId`, `source`, `kind`, `occurredAt`, `receivedAt`, `subject` (for example `repo/path:line` or a notice URL), `data` (app-typed JSON), `idempotencyKey` (deterministic, derived from the source identity, never random), `demo` flag.
- **`Finding`:** `ruleId`, `severity`, `message`, `evidence`.
- **`Suggestion`:** `by` (`rules` or `llm:<provider>/<model>`), the text, and the raw output kept for audit.
- **`Action`:** `id`, `idempotencyKey` (a hash of the event key, kind and target), `kind`, `safety`, `status`, `attempts`, `payload`, `preview`, `decidedBy`, `decidedAt`, `result`.
- **`AuditEntry`:** `seq`, `at`, `type`, references, data, `prevHash`, `hash` (a SHA-256 chain). A `wraith audit verify` command checks the chain.

Action states:

```text
proposed -> approved | rejected
proposed -> auto-approved              (safe kinds only)
approved | auto-approved -> executing
executing -> succeeded | retry-wait
retry-wait -> executing ... -> dead    (dead-letter after max attempts)
dead -> approved                       (manual "retry" from the UI, with an audit entry)
```

`rejected`, `succeeded` and `dead` are terminal. The only way out of `dead` is the explicit manual retry above.

### 5.3 Idempotency, retries and audit

- **Event dedupe:** a conditional insert of the event key. On AWS this is a DynamoDB conditional put with `attribute_not_exists` (syntax to confirm in AWS docs).
- **Local file store, safe for several processes on one machine.** The TODO Afterlife Kiro hook runs as a separate process from the local server, so an in-process lock is not enough. The file store uses a lock file created with exclusive create (Node `fs` `wx` flag) with a stale-lock timeout, plus atomic rename for snapshot writes. The exact mechanism is set in the `runtimes` spec. Using the file store from several machines (for example over a network share) stays unsupported, and the docs say so.
- **Action dedupe:** the same event twice yields the same action key, so one action.
- **Execution:** the executor claims an action with a conditional state change from `approved` to `executing`, then records the result. For GitHub issue creation, the issue body carries a hidden marker with the idempotency key. After an unknown outcome (a timeout), the executor looks for an existing issue with that marker before creating another. The lookup method is to confirm in GitHub docs; search indexing may lag, so this is a documented risk (section 15).
- **Retries:** exponential backoff with full jitter, a cap and a maximum number of attempts (proposed: 5), only for retryable errors (network errors, 5xx, 429). `Retry-After` is honoured. After the last attempt the action moves to `dead` and shows in the UI.
- **Audit:** every state transition and every LLM call is an audit entry. LLM entries record provider, model, a prompt hash and any fallback reason, never keys.

### 5.4 Safety and security

- The default for every action kind is "needs approval". Safe kinds must be declared with a reason.
- The LLM never decides safety and never adds actions. Its output is untrusted text and is escaped in the UI. Webhook and notice content goes to the LLM inside clearly delimited data blocks.
- **Webhooks:** verify `X-Hub-Signature-256` with a constant-time compare before parsing the body.
- **Approval UI auth, local:** binds to 127.0.0.1, prints a one-time login link with a random token, sets an HttpOnly SameSite=Strict cookie, requires a CSRF token on every POST, and sends a CSP without inline script.
- **Approval UI auth, AWS:** an admin token stored in SSM Parameter Store (free standard tier and how Lambda reads it: to confirm). If SSM is not usable on your account's plan, the fallback is a DynamoDB item holding a hash of the admin token (section 11.2).
- **Secrets** live only in environment variables or SSM, never in code, logs, audit entries or the repo. The commit guard scans staged changes for token patterns.
- **Hosted demo mode for judges:** the public URL runs with demo data and dry-run executors that show exactly what would happen. Judge clicks never create real GitHub issues. Real execution happens only in a deployment configured with your own token and sandbox repo, and only by the admin. Demo state resets on a schedule. Question 4 asks whether you want judge approvals to create real issues in a sandbox repo instead.

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
  - Action detail: the event, the rules that fired in evaluation order, the suggestion labelled "Rule-based" or "AI-suggested: provider/model", and an exact preview of the effect (for example the issue title and body, or the digest).
  - Approve, edit then approve, reject with a reason.
  - Audit log with a chain-verified badge.
  - Settings: LLM provider status, demo mode.
- Keyboard first (proposed: j and k to move, a to approve, r to reject, visible focus), WCAG AA contrast, `prefers-reduced-motion`, axe checks in Playwright.
- A shared dark theme with one accent per app (proposed: spectral green for TODO Afterlife, candle amber for Notice Ghoul; question 11). System font stack and self-drawn SVG icons, so there is no font or icon licensing.

## 6. App 1: TODO Afterlife (developers)

- **Source:** a GitHub repository webhook on the `push` event. Delivery headers include `X-GitHub-Event`, `X-GitHub-Delivery` ("A globally unique identifier (GUID) to identify the event"), `X-Hub-Signature-256` (HMAC SHA-256 hex digest of the body using the webhook secret) and a `User-Agent` starting with `GitHub-Hookshot/`. Payloads are capped at 25 MB ([Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads), read 15 Nov 2026).
- **Keys:** the event key comes from `X-GitHub-Delivery`. Each TODO found also gets its own key from repo, path and the normalised TODO text, so the same TODO pushed twice (another branch, a force push) yields one action. Whether a redelivery reuses the same `X-GitHub-Delivery` GUID: to confirm ([Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)).
- **Diff:** the push payload lists commits and changed files, but finding TODO lines needs patches. They come from the GitHub REST compare endpoint with a fine-grained token. The exact `push` payload fields, the compare endpoint, the issue creation endpoint and the token permissions: to confirm in GitHub docs at spec time. Demo mode uses recorded fixture responses labelled as demo data.
- **Extraction:** TODO, FIXME, HACK and XXX on added or changed lines only, across common comment syntaxes, with path and line number.
- **Rules** (ordered, with configurable phrase lists): vague phrase ("fix this", "later", "temp", "cleanup", "hack", "???"), too short, no owner, no issue reference or link, no date or trigger, retire candidate ("maybe", "someday", "probably not", or a duplicate of an existing tracked item).
- **Proposals, all needing approval:**
  1. **Rewrite** into a concrete task, delivered on approval as a downloadable patch the developer applies. Nothing is pushed.
  2. **Open a GitHub issue** on approval, with labels `wraith-kit` and `todo-afterlife`.
  3. **Retire** ("lay to rest"): record the reason and offer a deletion patch.
- **Deterministic rewrite fallback:** a template using the file, the nearest function name and the verb in the comment, plus a "done when" line. The LLM rewrite is optional. It sends nearby code lines to the provider only when you have enabled one, and the README says so.
- **Local Kiro hook (`todo-afterlife-precommit`):** a `PreToolUse` hook on the `shell` tool category that acts only on `git commit`. It runs the same TODO Afterlife app with the `cli` source over `git diff --cached`, writes proposals into the local store so they show up in the approval UI, and prints findings and suggested rewrites to stdout. It exits 0 by default, so Kiro sees the findings before the commit runs. Blocking on vague TODOs is opt-in (proposed: `WRAITH_TODO_BLOCK=1`, which makes it exit 2).
- **Terminal-commit bypass:** Kiro hooks only see actions the Kiro agent takes. A `git commit` typed in a terminal skips them. So the app also ships an optional plain git pre-commit script that you install with a documented command. KIRO_USAGE.md and the app README state this limit.
- **Real footage for the video:** a push to a sandbox repo you own, delivered to the deployed Function URL, approved in the UI, creating a real issue in that sandbox repo (questions 4 and 5).
- Its own `apps/todo-afterlife/README.md` covers setup, local run, webhook replay, the pre-commit hook and AWS deploy.

## 7. App 2: Notice Ghoul (students)

- **Sources:** pollers for RSS 2.0 and Atom feeds and for HTML notice pages (per-source CSS selectors for item, title, link and date). Conditional GET (ETag, If-Modified-Since), a minimum poll interval per source, an identifying User-Agent, a timeout and a size cap, and robots.txt respected for HTML sources.
- **Real URLs are user-configured only**, in a config file that is gitignored. The repo ships `config.example.json`. No real college site is polled by the demo.
- **Fixture site created for the demo:** `apps/notice-ghoul/fixtures/site/`, a fictional institution (proposed name: "Hollowmere Institute of Technology") with an HTML notice board, an RSS feed, and a second department page that repeats some notices in another format to exercise dedupe. Every page carries a visible "Fictional institution, demo data" banner. A script serves it locally, and the hosted demo serves it too.
- **Rules:**
  - Deadline phrase detection: "last date", "deadline", "due", "submit by", "register by", "closes on".
  - Deterministic date and time extraction (for example 05/12/2026, 5 Dec 2026, December 5, 2026, 5th December, and times like 5:00 PM) with a per-source locale and timezone. Default DD/MM and Asia/Kolkata, configurable.
  - An ambiguity flag when DD/MM versus MM/DD is unclear.
  - Past deadlines dropped.
  - Category tags: exam, fee, scholarship, assignment, event.
  - Cross-source dedupe on normalised title plus the same date.
- **Advisor (optional):** LLM extraction for messy notices returns a date plus an evidence quote. The deterministic validator accepts it only if the quote appears in the notice text and the date parses. In short: **the LLM proposes, the rules verify.**
- **Actions, both explicitly declared safe with reasons** (they only write files you asked for and post nothing):
  1. A daily digest in HTML and Markdown, grouped "due in 48 h", "this week" and "later", each item with its source link and evidence quote.
  2. `deadlines.ics` regeneration with stable UIDs (RFC 5545 details to confirm in the RFC).
- **Nothing auto-posts anywhere.** The app has no email, chat or social posting code at all.
- **Hosted demo:** a digest page and an `.ics` URL for the fictional fixture institution.
- Its own `apps/notice-ghoul/README.md` covers setup, the fixture site, configuring your own sources, local run and AWS deploy.

## 8. Proving both apps use the same unmodified core

A repo-level test, `tests/core-integrity.test.ts`, runs in `npm test`, in the commit-guard hook and in the skeleton-warden agent's review. It checks six things:

1. **Resolution:** from each app folder, the skeleton package resolves to the same real path inside `/skeleton`.
2. **Public entry points only:** every import of the skeleton in `apps/**` uses an entry listed in the skeleton's `package.json` `exports`. No relative or deep imports into `skeleton/src`.
3. **No forks:** no file under `apps/**` has the same content hash as a core file, and no app file carries the marker banner that every core file has.
4. **Same bytes as on disk:** each app, started in its own process, reports a SHA-256 fingerprint of the core modules it actually loaded. Both fingerprints must equal each other and equal a fingerprint computed from the files in `/skeleton/src/core` on disk.
5. **No monkey-patching:** exported registries and the object `defineApp` returns are frozen, and the test checks it.
6. **The core knows nothing about the apps:** no app id or app folder name (`todo-afterlife`, `notice-ghoul`) appears anywhere under `/skeleton/src`.

Why item 4 compares against the files on disk and not git `HEAD`: during development the staged core always differs from `HEAD`, so a `HEAD` comparison would make the commit guard block every legitimate change to the core. The on-disk comparison still catches an app that loads a copied or patched core.

## 9. Testing strategy and property-based tests

Property-based tests use fast-check with Vitest (the exact integration package is to confirm). Each property is linked to EARS requirement IDs in its spec's design.md.

### 9.1 Core properties

| ID | Property |
|---|---|
| P1 | **Idempotent intake.** For any delivery list with duplicates and redeliveries in any order, including intake interleaved from two store handles on the same local store (as the hook process and the server would do), the store ends with one Event per distinct key and one Action per distinct action key. "Same event twice gives one action." |
| P2 | **Idempotent execution.** For any approved action and any pattern of failures, retries and simulated crashes (including a crash after the side effect), a fake external service records at most one effect per idempotency key. |
| P3 | **Rule ordering.** For any rule set and any permutation of registration order, the evaluation trace, findings and proposed actions are identical, and the trace is sorted by (priority, id). |
| P4 | **Stop semantics.** If a rule returns stop, no later rule in (priority, id) order runs and every earlier one did, whatever the registration order. |
| P5 | **Approval gate** (model-based, using fast-check commands). No action of a non-safe kind reaches `executing` without a prior `approved` audit entry; rejected actions never execute; terminal states stay terminal. |
| P6 | **Audit chain.** Verification passes for any generated chain and fails after any single edit, deletion or reorder. |
| P7 | **Retry bounds.** Attempts never exceed the maximum; delays stay within [0, cap]; `Retry-After` is honoured. |

### 9.2 App properties

| ID | Property |
|---|---|
| TA-P1 | TODO extraction finds exactly the TODO lines inserted into generated diffs, and only on added lines. |
| TA-P2 | The vagueness classifier is deterministic and ignores case and whitespace differences. |
| NG-P1 | Dedupe is idempotent and order-insensitive. |
| NG-P2 | Date extraction round-trips every supported format. |
| NG-P3 | A generated `.ics` file parsed by an independent parser (proposed: `ical.js` as a dev-only dependency) returns the same UID, start and summary. |
| NG-P4 | An LLM-proposed date is accepted only when its evidence quote is present in the notice text. |

### 9.3 Runs and other tests

- Hooks run property tests in a fast mode (fewer runs, set by an environment variable). `npm test` runs the full number of runs.
- Failing seeds are printed in the test output and recorded in KIRO_USAGE.md.
- Unit tests per module.
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
| **Correctness (property-based testing extracted from EARS requirements)** | **Yes (IDE only)** | **No** | You run it in the IDE on `wraith-core` and `notice-ghoul` (section 10.7). Our fast-check tests run under Vitest anywhere; only Kiro's spec-level PBT feature is IDE only | [Correctness](https://kiro.dev/docs/specs/correctness) |
| Markdown Review | Documented as a floating "Review" button in the editor | Not stated | Optional IDE step | [Specs](https://kiro.dev/docs/specs) |
| Workspace steering, global steering, AGENTS.md (also nested in subfolders) | Yes | Yes | 5 workspace steering files; no AGENTS.md | [Steering](https://kiro.dev/docs/steering) |
| Steering inclusion modes (always, fileMatch, manual, auto) | Yes | Full in V3; partial in V1 and V2 | All four modes used (section 10.2) | [Steering](https://kiro.dev/docs/steering) |
| Generate foundation steering via UI | Yes | No | Not needed; steering is hand-written | [Steering](https://kiro.dev/docs/steering) |
| Hooks: event-driven, shell command actions, agent prompt actions | Yes | Yes | 5 hooks in `.kiro/hooks/` (section 10.4) | [Hooks](https://kiro.dev/docs/hooks), [Hook actions](https://kiro.dev/docs/hooks/actions) |
| Triggers Pre Tool Use, Post Tool Use, Agent Stop | Yes | Yes | `commit-guard` and `todo-afterlife-precommit` on `PreToolUse` | [Hook types](https://kiro.dev/docs/hooks/types) |
| Trigger Prompt Submit | Yes, can block | Yes, but **CLI Prompt Submit hooks cannot block** | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| Trigger Session Start | Yes | **V3** | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| Trigger Session End | No | V3 only | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| Pre and Post Compaction | Yes | V3 (3.1.0+) | Not used | [Hook types](https://kiro.dev/docs/hooks/types) |
| File Create, File Save, File Delete | Yes | **V3** ("File and task triggers are available in the IDE and CLI V3") | `tests-on-save` and `spec-trace` on `PostFileSave` | [Hook types](https://kiro.dev/docs/hooks/types) |
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
| `wraith-domain.md` | `fileMatch` with `fileMatchPattern: ["skeleton/src/**", "apps/*/src/**"]` | Invariants: approval by default, deterministic idempotency keys, pure rules, LLM output untrusted, every transition audited, demo data labelled |
| `skeleton-authoring.md` | `auto`, with a `name` and a `description` so Kiro loads it when someone asks to build a new Wraith app; also a slash command | How to make app #3 from extension points only. Links `docs/make-your-own-app-in-15-min.md` with a `#[[file:...]]` reference. Falls back to `manual` if auto inclusion does not trigger in the CLI (E7) |

- Steering is not loaded automatically into custom agents. Each agent lists the steering files it needs in its `resources` (the docs example is `"resources": ["file://.kiro/steering/**/*.md"]`).
- **"Make your own app in 15 min" guide:** `docs/make-your-own-app-in-15-min.md`, backed by `skeleton/template/` and a `new-app` scaffold script. "15 min" is the goal in the title. The `app-smith` agent rehearses the guide on a scratch app, and the time is reported as measured, whatever it turns out to be.

### 10.3 Specs

- One spec per feature area: `wraith-core`, `llm-adapter`, `approval-ui`, `runtimes`, `todo-afterlife`, `notice-ghoul`, `wraith-mcp`, `app-authoring`.
- `requirements.md` in EARS with numbered requirement IDs.
- `design.md` with a "Correctness properties" section that links each property from section 9 to requirement IDs, and cites the official docs pages each design relies on.
- `tasks.md` with each task linked to requirement IDs.
- Created in the CLI with `/spec new <name>` if T3 Code exposes it (E6); otherwise written by hand in the documented format.
- Analyze Requirements runs on each spec in the CLI.

### 10.4 Hooks

Hook files follow the documented schema: `{"version": "v1", "hooks": [{name, description?, trigger, matcher?, action: {type: "command" | "agent", command | prompt}, timeout?, enabled?, confirm?}]}` ([Hooks](https://kiro.dev/docs/hooks)). Facts that shape the design:

- Trigger names are PascalCase. The JSON names used here (`PostFileSave`, `PreToolUse`, `PostTaskExec`) come from the [Hooks](https://kiro.dev/docs/hooks) and [IDE 1.0 hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks) pages.
- `timeout` is in seconds for command actions, default 60, and `0` disables it. It is ignored for agent actions.
- For tool triggers the matcher is a tool selector (tool ID, the categories `read`, `write`, `shell`, `web`, `spec`, `@mcp`, `@powers`, `@builtin`, `@<server>`, `@<server>/<tool>`) or a regex against the tool ID; hook JSON also accepts `*` and `?` wildcards. For file triggers the matcher is a regex against the file path ([Hook types](https://kiro.dev/docs/hooks/types)).
- Command actions run in the project root and receive session context as JSON on STDIN.
- Exit 0 adds stdout to the agent's context. Per the [Hook actions](https://kiro.dev/docs/hooks/actions) page, any other exit sends stderr to the agent and, for Pre Tool Use, blocks the tool call. The [IDE 1.0 hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks) page says exit 2 blocks and other non-zero codes are errors. The guards use exit 2, which satisfies both pages, and E3 tests it.
- Kiro hooks only see actions the Kiro agent takes. A `git commit` typed in a terminal skips every hook below.

| Hook | Trigger | Matcher | Action | Timeout handling | Real work |
|---|---|---|---|---|---|
| `tests-on-save` | `PostFileSave` | A regex on the file path matching `.ts` files under `skeleton/` or `apps/<name>/` (exact regex set after E4) | Command: a script in `scripts/` reads the saved path from STDIN and runs the related Vitest tests with property tests in fast mode | Explicit `timeout` (proposed 60 s). A save cannot be blocked, so a timeout only reports that the run was cut short | Failing tests go straight back to the agent after every save |
| `commit-guard` | `PreToolUse` | `shell` | Command: acts only on `git commit`. Checks: `.gitignore` never mentions `.kiro` and `git check-ignore` does not ignore it; `LICENSE` exists; staged-diff secret scan (GitHub, AWS, Gemini and Groq key patterns, private keys); typecheck; lint; fast tests; the core-integrity test; every dependency in any `package.json` is listed in README "Pre-existing work"; fixture files carry the demo label. Blocks with exit 2 and a reason on stderr | Explicit `timeout` (proposed 180 s) and fast test mode keep it well under the limit. Whether a timeout blocks or allows the commit is E5 | Stops bad agent commits, including ones that would break the hard rules |
| `todo-afterlife-precommit` | `PreToolUse` | `shell` | Command: acts only on `git commit`; runs TODO Afterlife with the `cli` source (section 6). Exit 0 with findings; exit 2 only when `WRAITH_TODO_BLOCK=1` | Explicit `timeout` (proposed 30 s) | The app's own feature, used on this repo |
| `doc-sync` | `PostTaskExec` | none | Agent prompt: update KIRO_USAGE.md and the README sections affected by the finished spec task, recording only what happened, with the commands run and their results | `timeout` does not apply to agent actions. It fires once per finished spec task, not on every save | Keeps KIRO_USAGE.md current as the rules' write-up questions require |
| `spec-trace` | `PostFileSave` | A regex on the file path matching markdown under `.kiro/specs/` | Command: a deterministic script that reports requirement IDs without a design reference or a task, and tasks that point at missing IDs | Explicit `timeout` (proposed 30 s) | Keeps EARS IDs, designs, tasks and tests traceable |

- Two hooks share the `PreToolUse` `shell` trigger. Neither depends on the other's result, and E10 records the order they run in.
- `PostTaskExec` fires after a spec task finishes. If tasks run through T3 Code do not fire it (E6), `doc-sync` falls back to a manual steering file run as a slash command at the end of each task, and KIRO_USAGE.md records that.
- Optional backstop for the terminal-commit bypass: the plain git pre-commit script from section 6, installed only if you choose to.

### 10.5 Custom agents

Agent files are JSON or Markdown in `.kiro/agents/`. Documented fields include `name`, `description`, `tools`, `excludedTools`, `includeMcpJson`, `includePowers`, `resources` (`file://`, `skill://`), `permissions.rules` (`capability`, `match`, `effect`), `prompt`, `model` and `mcpServers` ([Custom agents](https://kiro.dev/docs/custom-agents), [MCP](https://kiro.dev/docs/mcp)). In V3, a sub-agent tool call runs without a prompt only when the parent session's policy also allows it ([CLI V3](https://kiro.dev/docs/cli/v3/)). Every agent file is checked with `kiro-cli agent validate`.

| Agent | Role | Tools and permissions | Loads |
|---|---|---|---|
| `skeleton-warden` | Reviewer | Read and search tools; shell limited by permission rules to the integrity, budget and test scripts | `product.md`, `structure.md`, `wraith-domain.md` |
| `app-smith` | Builder for app #3 | May write only under a new `apps/<name>/` folder and `docs/`; writes to `skeleton/` denied (exact path-matching syntax for permission rules: to confirm) | `skeleton-authoring.md`, `structure.md`, the 15-minute guide |

- `skeleton-warden` checks that apps use only public extension points, that the core budget and zero-dependency rule hold, that there is no forked code, and that specs trace to tests. It writes dated reports to `docs/reviews/`.
- `app-smith` rehearses the 15-minute guide on a scratch app in a temp folder, timed honestly, then the scratch app is deleted. The time is reported as measured.

### 10.6 MCP servers

Configured in `.kiro/settings/mcp.json`.

| Server | What it is | Why it helps |
|---|---|---|
| `wraith` | A custom stdio MCP server built in this repo with the official MCP TypeScript SDK (package and API to confirm). Tools: list events, list pending actions, explain an action (rules fired in order, advisor or fallback, audit trail), simulate an event through an app's rules with zero side effects, verify the audit chain, list extension points | While Kiro writes rules, it can replay fixtures and see exactly which rules fire. It deliberately has no approve or execute tool, so no agent can bypass the human gate |
| `aws-docs` | The [AWS Documentation MCP server](https://github.com/awslabs/mcp/tree/main/src/aws-documentation-mcp-server), run with `uvx awslabs.aws-documentation-mcp-server@latest`. Tools `read_documentation`, `search_documentation`, `read_sections`, `search_table`, `recommend`. Needs uv and Python 3.10+, no AWS credentials (uv and uvx are installed) | Confirms SAM, Lambda, Function URL, DynamoDB, Scheduler and SSM details and the free-tier tables in official docs |
| Context7 (candidate) | A docs MCP server for library docs (Vitest, fast-check, the MCP TypeScript SDK, esbuild). Free usage terms and whether it needs an API key: to confirm before adding | Confirms library APIs instead of guessing |
| Playwright MCP (optional) | Screenshot-based design review of the approval UI. Package and terms to confirm | Lets an agent look at the real UI during the design pass |

Provider docs that no MCP server covers (GitHub REST, Gemini, Groq, Ollama, RFC 5545) are read directly from the official pages and cited in each spec's design.md.

### 10.7 Powers, and steps you run in the Kiro IDE

**Powers.** A power is a directory with a `plugin.json` manifest (with activation keywords), an optional `skills/` folder and an optional `mcp.json`. It follows the Agent Plugins specification and activates by keyword ([Powers](https://kiro.dev/docs/powers)). Candidates seen on the [Kiro powers registry](https://kiro.dev/powers/) on 15 Nov 2026:

- "AWS Core" (AWS MCP Server plus skills for infrastructure, core services, security, observability, databases, SDKs and cost).
- "Local AWS Emulator & Learning Environment" (MiniStack; claims to emulate 60+ AWS services on one port, no account, no Docker).
- "GitWarren" (local code review).

The terms, licenses and credential needs of each are to confirm before install. Nothing is installed without your approval. KIRO_USAGE.md records what each installed power changed, or that none fitted. Stretch goal: author a `wraith-kit` power (manifest, a "new Wraith app" skill, and an `mcp.json` for the `wraith` server) so app #3 authors can add the skeleton know-how to any Kiro session. Creating powers is supported in CLI V3.

**Steps you run in the Kiro IDE** (the CLI cannot do these; I will stop and ask when the work reaches each one):

1. **Spec Correctness (property extraction and PBT generation from EARS)** on `wraith-core` and `notice-ghoul`. IDE only; in the IDE, properties are extracted in the design phase ([Correctness](https://kiro.dev/docs/specs/correctness)). Commit what the IDE writes. KIRO_USAGE.md compares Kiro's extracted properties with the hand-written fast-check properties.
2. **Optional:** Markdown Review on one spec.
3. **If hooks do not fire through T3 Code (E1):** demo the hooks in the IDE or in an interactive `kiro-cli` terminal session.
4. **Screenshots** of the specs, hooks, agents and MCP panels for KIRO_USAGE.md, and IDE footage for the video if useful.

### 10.8 Experiments at the start of the spec phase

The docs leave these unclear for a session driven by T3 Code over ACP. Results, including failures, go into KIRO_USAGE.md and `docs/experiments.md`.

| ID | Question | When | Fallback if it fails |
|---|---|---|---|
| E1 | Do `.kiro/hooks/` hooks fire inside the T3 Code ACP session? (The session must start in `wraith-kit/`.) | First hook task | Demo hooks in an interactive `kiro-cli` session or the IDE; KIRO_USAGE.md says so |
| E2 | What is the shell tool's ID, and which field inside `tool_input` holds the command? | First hook task | The guard scripts check several candidate fields and log the payload shape in a debug mode |
| E3 | Does exit 2 (and other non-zero codes) block the shell call in CLI V3, and where does stderr show? | First hook task | If exit 2 does not block, use the code that does and record the difference between the two docs pages |
| E4 | What is the shape of the `PostFileSave` STDIN payload? Is the file path relative or absolute, and what does the matcher see? Does CLI V3 expand the `{{filePath}}` variable shown on the IDE 1.0 page? | First hook task | Widen the matcher to `\.ts$` and filter in the script, which normalises the path itself |
| E5 | When a `PreToolUse` command times out, is the tool call blocked or allowed? | First hook task | If allowed, move slow checks out of the guard into `npm test` and document it; if blocked, size the timeout so slow runs do not block valid commits |
| E6 | Are `/spec`, `/agent`, `/hooks` and the steering slash commands reachable through T3 Code? Does a spec task run there fire `PostTaskExec`? | First spec task | Run them in interactive `kiro-cli`; write spec files by hand in the documented format; run `doc-sync` as a manual steering slash command |
| E7 | Does `auto` steering inclusion trigger in CLI V3 for `skeleton-authoring.md`? | Steering task | Switch the file to `manual` |
| E8 | Can a custom agent be selected through ACP (`session/set_mode`), and do project agents work as sub-agents? | Agents task | Start the agent in an interactive `kiro-cli chat` session (exact command checked with `kiro-cli chat --help`) |
| E9 | Do hook matchers `@wraith/<tool>` match the internal `mcp_wraith_<tool>` IDs? Only matters if a hook targets `wraith` tools; none of the five planned hooks does yet | MCP task | Use a regex against the internal ID, which the docs also allow |
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

One SAM template per app, in that app's folder:

- One Lambda function (Node.js runtime version to confirm, arm64 proposed), bundled with esbuild.
- A Function URL with auth type NONE, because the app checks the webhook HMAC and the admin token itself (to confirm). No API Gateway.
- One DynamoDB table: Standard class, provisioned mode with small capacity well under 25 RCU and 25 WCU in total across both apps, and a TTL attribute.
- An EventBridge Scheduler schedule for Notice Ghoul polling, the daily digest and the demo reset.
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

- The public URLs run in demo mode: demo data, dry-run executors, scheduled reset (section 5.4). README placeholders: `<todo-afterlife-function-url>` and `<notice-ghoul-function-url>`.
- The URLs must stay live and free to use until the Judging Period ends on 29 Jan 2027. If your AWS account is on the Free plan, it closes 6 months after opening or when credits run out, so its opening date matters (question 3).

### 11.4 What needs your go or your login

| Step | What I prepare | What you do |
|---|---|---|
| Create and push the public GitHub repo | Everything committed locally; the exact `gh repo create` command, checked with `gh repo create --help` at that time (`gh` is logged in as `himanshu748`) | Say go |
| Install the AWS SAM CLI | The install command from AWS docs | Say OK |
| AWS login and deploy | Validated templates and the exact login and deploy commands | Log in, say go |
| GitHub sandbox repo, fine-grained token, webhook | Exact steps and the minimum token permissions (to confirm in GitHub docs) | Create them; keep the token out of the repo |
| Gemini or Groq keys (optional) | Where to put them (environment variables only) | Create keys if you want them |
| Video, blog post, social post, Devpost form | VIDEO_SHOTLIST.md, BLOG_DRAFT.md, SOCIAL_POST.md, SUBMISSION_CHECKLIST.md | Record, publish, fill in and submit |

## 12. Phases, dates and commits

Dates are in IST. Every task ends with a local commit. Nothing is pushed, deployed, posted or submitted.

| Phase | Dates | Work |
|---|---|---|
| 0. Plan | 15 Nov | This file. **Stop for approval.** |
| 1. Spec | 16 to 18 Nov | `LICENSE`, `.gitignore`, README stub with "Pre-existing work", KIRO_USAGE.md, steering (5 files), hooks together with experiments E1 to E11, agents (validated with `kiro-cli agent validate`), MCP config, all 8 specs, Analyze Requirements. **IDE step:** Correctness on `wraith-core`. |
| 2. Build | 19 to 29 Nov | `wraith-core` and its PBT (19 to 21), node runtime, file store and approval UI (22 to 23), LLM adapter (23), `wraith` MCP server (24), TODO Afterlife and its hook (24 to 26), Notice Ghoul and the fixture site (26 to 28), aws runtime, DynamoDB store and SAM templates validated offline (28 to 29). |
| 3. Tests | Alongside phase 2; hardening 29 to 30 Nov | Unit tests, PBT, Playwright and axe, template validation, core-integrity test. |
| 4. Polish | 30 Nov to 1 Dec | Design pass, accessibility pass, 15-minute guide rehearsal by `app-smith`, `skeleton-warden` review. |
| 5. Docs | 1 to 2 Dec | README, KIRO_USAGE, DEVPOST_STORY, VIDEO_SHOTLIST, BLOG_DRAFT, SOCIAL_POST, SUBMISSION_CHECKLIST, both app READMEs. |
| 6. Your steps | 2 to 4 Dec | Say go for repo creation and push and for the AWS deploy (you log in), record the video, publish the blog and social posts, fill in the Devpost form. Aim: submission-ready by 3 Dec IST. Hard stop: 5 Dec, 03:30 IST. |

**Cut order if behind** (cut first to last):

1. The `wraith-kit` power (stretch).
2. Playwright MCP.
3. The HTML-page source for Notice Ghoul (keep RSS and Atom).
4. The third LLM provider.

**Never cut:** both apps, the approval UI, idempotency, retries, the audit log, the local run, validated SAM templates, PBT for idempotency and rule ordering, the core-integrity test, the hooks, the agents, the MCP server, and every deliverable.

## 13. Deliverables

- **README.md:** what it is, who it is for, how to run locally and on AWS, how to run the tests, working app URL placeholders for both apps (`<todo-afterlife-function-url>`, `<notice-ghoul-function-url>`), and "Pre-existing work".
- **`apps/todo-afterlife/README.md` and `apps/notice-ghoul/README.md`:** each app's own setup and run instructions.
- **KIRO_USAGE.md:** answers every write-up question from the rules (section 10.9).
- **DEVPOST_STORY.md:** an honest story; demo data labelled as demo data; no invented users or stats.
- **VIDEO_SHOTLIST.md:** under 3:00, real footage, no copyrighted music; shows the same skeleton serving two audiences.
- **BLOG_DRAFT.md:** states it was written for the Kiroween 2026 hackathon.
- **SOCIAL_POST.md:** starts with `#KiroweenHackathon26`. Your favourite thing about Kiro is left as a TODO for you, written concretely, for example `TODO(@you): write your favourite thing about Kiro and how it changed your approach, before posting`, which TODO Afterlife's rules would accept as specific.
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
| Guard slower than the hook timeout | Fast test mode, explicit timeouts, E5 |
| `doc-sync` may not fire if `PostTaskExec` does not fire through T3 Code | E6; manual steering slash command as fallback |
| Hook process and local server writing the same file store | Lock file with exclusive create, stale-lock timeout and atomic rename; P1 tests interleaved intake from two store handles |
| AWS Free plan closes before 29 Jan 2027, or credits run out | Check the account (question 3); no paid features; if no AWS option can stay live, pick another free host with you |
| A service needed for the hosted demo is not covered by the Free plan | Confirm coverage in the spec phase; documented free alternative (section 11.2) |
| Public Function URLs | HMAC check for webhooks, admin token for the UI, dry-run demo mode for visitors |
| GitHub issue creation after an unknown outcome could duplicate | Hidden idempotency marker plus lookup before retry; documented |
| Gemini free-tier data use | Default `none`; disclosure in README and UI |
| Free model IDs and limits change | Model is configuration; the fallback always works |
| Scraping real college sites | User-configured sources only, polite polling, robots.txt respected |
| DD/MM versus MM/DD ambiguity | Per-source locale and an ambiguity flag |
| `.ics` compatibility | Independent parser in tests; a manual import test in one calendar app |
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
- Tools: AWS SAM CLI, cfn-lint, uv and the AWS Documentation MCP server, and any other docs MCP server you approve.
- Optional: Ollama and the chosen local model (model license to confirm).

No templates, fonts or icon packs. The repo started empty, so no T3 Code placeholder files are included.

## 17. Open questions for you

1. **Repo location:** OK with `/Users/himanshujha/.t3/projects/kiro/wraith-kit/` as its own git repo, published later as `wraith-kit`? Please add it as its own T3 Code project so Kiro sessions start there and load `.kiro/`.
2. **License:** MIT or Apache-2.0?
3. **AWS:** is your account on the legacy free tier or a Free plan account (which closes 6 months after opening)? When was it opened? Preferred region? How do you sign in (SSO profile or console sign-in)? OK to install the AWS SAM CLI?
4. **Hosted demo:** OK that judge clicks on the public URL only dry-run, with real GitHub issues created only from your own deployment and token? Or should judge approvals create real issues in a sandbox repo you own?
5. **GitHub sandbox repo** for TODO Afterlife: what name? You will also need a fine-grained token; I will give exact steps when needed.
6. **LLM:** default `none`, plus Gemini free, Groq free and Ollama (`qwen3:4b-instruct` is installed). Do you have Gemini and Groq keys? Any provider you want dropped?
7. **Overlap with Deadline Graveyard:** are you submitting both? If yes, Notice Ghoul stays focused on notice ingestion, dedupe and the digest, or we pick a different student app.
8. **Best Student:** solo or team? Are LinkedIn, student email, year, degree and school ready for every member?
9. **Kiro credits:** still received and redeemed?
10. **Clarification request:** should I draft a written request to Devpost about "2 separate repo folders"? You would send it.
11. **Naming and theme:** keep "Limbo" as the approval queue name, spectral green for TODO Afterlife and candle amber for Notice Ghoul, or change them?
12. **Real notice sources:** any real college notice pages or RSS feeds you want configured locally (never committed)?
13. **Video:** OK to show GitHub and a calendar app on screen incidentally?
