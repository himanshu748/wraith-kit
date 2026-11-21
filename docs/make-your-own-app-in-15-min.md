# Make your own Wraith app in 15 min

Build a small app that turns a study-room request into a reviewed local task. You need a supported Node version (22.13+, 24 or 26), npm, and this repository with `npm install` completed. No account, key, model or external service is needed.

“15 min” is a goal, not a measured promise. **Human timing not measured.** The scaffold, generated core journey and actual local runner sign-in/approval/download have automated smoke coverage. A non-Kiro agent rehearsed the guide end to end on 21 Nov 2026 in 5 min 43 s ([E13](experiments.md#e13-kiro-retry-on-21-nov-a-labelled-wraith-mcp-call-and-the-guide-rehearsal)); a timed Kiro app-smith rehearsal on a clean tree is still pending under the account's monthly usage limit.

## 1. Scaffold and run

From the repository root:

```sh
npm run new-app -- study-helper
npx tsx apps/study-helper/run.ts
```

The scaffold creates `apps/study-helper/` from `skeleton/template/`. Names are lowercase kebab-case; existing destinations and path traversal are refused. It changes no shared source or lockfile. The existing root workspace installation resolves the skeleton package; no second install is required to run this example from the repository.

The server opens a private one-time sign-in link at port 4320. If the browser does not open, read the link file whose path is printed in the terminal. Use `PORT=4321 npx tsx apps/study-helper/run.ts` if the default port is occupied.

The initial request is labelled DEMO:

> Replace the printer paper before the study group meets.

The queue shows one proposed task. Open it, inspect the preview, and approve it. The completed action links to a text download, also saved under `.wraith/study-helper/out/tasks/`. Nothing is sent anywhere. Stop the server with Ctrl+C. Restarting replays the same demo id and does not create a second action.

## 2. Follow the three extension points

Open `apps/study-helper/src/index.ts`. It imports `defineApp`, `hash` and a type from the public `@wraith-kit/skeleton/core` entry.

The **source** accepts JSON such as `{"request":"Replace the printer paper before the study group meets."}`. It validates the request and returns a stable delivery key. Its `expand` function turns that payload into an event with source, kind, subject, data and an idempotency key. The initial demo is ingested directly by `run.ts`; the CLI source is available to your own ingestion command through `engine.accept('request', rawInput)` and then `engine.tick()`.

The **rule** is pure: `evaluate(event, ctx)` returns an action proposal. It does not write a file, fetch a URL or read the system clock. Use `ctx.clock` when a rule needs time, and give each rule an explicit priority; lower numbers run first, with rule id breaking ties. Rules may return `stop: true` to stop later rules.

The **action kind** describes the task and returns its local artifact when executed. Omitting `safety` means it needs approval. The engine controls retries, action identity, approval and audit. The local runtime writes the artifact; the app has no duplicate pipeline.

Change the example request, rule and artifact to fit your audience. Give changed input a new idempotency key when it should be evaluated again. Keep demo data labelled `demo: true`.

## 3. Test the boundaries

```sh
npx vitest run apps/study-helper/test
npx vitest run tests/core-integrity.test.ts
npm test
```

The generated test uses `MemoryStore` and `fakeClock` from `@wraith-kit/skeleton/testing`. It ingests the same event twice, checks for one proposed action and no result before approval, approves it, and verifies a successful artifact with one execution attempt. Add an assertion that rejection also prevents execution when you change the action.

When adding multiple rules, test ordering by defining them in a deliberately shuffled array and checking the recorded trace:

```ts
const action = Object.values((await engine.snapshot()).actions)[0]!;
expect(action.trace.map(step => step.ruleId)).toEqual([
  'check-request', 'propose-task',
]);
```

Use a lower priority for `check-request` than `propose-task`. Add a `stop` case to prove the later proposal is absent for rejected input. The core's property tests already generate permutations to test deterministic ordering; your test should exercise your app's policy.

Integrity tests check all app files for forbidden imports and copied core files. Two separate processes for the supplied apps observe actually loaded source paths and hashes, compare them to current disk bytes, and check frozen registries. Those processes prove the two supplied apps share the source; add a probe for your app if you need equivalent loaded-module evidence. The AWS bundle check independently inspects bundle inputs. None of these checks proves a deployed runtime, a live integration or an external action happened.

## 4. Extend only when the journey needs it

Use the public entries listed in `skeleton/package.json`. App code must not import `skeleton/src`, copy core implementation, patch registries or put app-specific branches into shared source.

- **Sources:** a poller has `intervalMs` and `expand(payload, ctx)`; fetch through `ctx.http`, honour `ctx.signal`, bound responses and return validators. A webhook has `path` and a cheap `accept` that authenticates raw bytes before persisting; defer network work to `expand`.
- **Records:** return typed upserts from rules. Supply `parseValue` to validate human edits. Request confirmation for ambiguous data; human values are protected from silent overwrites.
- **Aggregates:** derive a digest or summary from records and return one action with a stable `key`. An interval is a minimum scheduling interval, not a delivery guarantee.
- **Advisors:** use `reword` for preview wording or `extract` for evidence-backed data. Provide a deterministic fallback and a verifier. LLM extraction requires confirmation; model output cannot grant itself execution authority.
- **Actions:** add `lookup` when an external side effect may succeed before a response is lost. Declare `effect: 'external'` for actual writes to an outside service. Require approval by default. Use `safety: 'safe'` only with a written reason for the kind's bounded, explicitly permitted effect.
- **Views and theme:** use the core `html` tag to escape untrusted values. Add a name, accent and short description. Do not inject arbitrary HTML from event data.

If the contract lacks a capability, propose and test a shared extension in the skeleton. Never hide a copied or patched engine inside the app. Read [the skeleton-authoring steering](../.kiro/steering/skeleton-authoring.md) before continuing.

## Validation and remaining rehearsal

The scaffold test creates a temporary app, runs its module through the real shared engine in a separate Node process, checks replay and approval, and removes only that generated folder. A second subprocess starts the generated local runner, follows its one-time sign-in link, submits a CSRF-protected approval and downloads the real artifact over HTTP. Separate tests prove invalid names, existing destinations and symlinked app roots are refused. This is automated smoke validation, not a timed human run or a Kiro app-smith execution.

A non-Kiro agent rehearsal ran on 21 Nov 2026 ([E13](experiments.md#e13-kiro-retry-on-21-nov-a-labelled-wraith-mcp-call-and-the-guide-rehearsal)): clean tree, `date`-timed 5 min 43 s, scratch app `apps/scratch-study/` removed afterwards and never committed. For the still-planned Kiro rehearsal, start with a clean committed tree, record start and finish times, ask the configured Kiro `app-smith` to follow this guide in `apps/scratch-<name>/`, and report each command's result. Keep agent elapsed time separate from human time. The main session inspects and removes scratch work after the rehearsal; never commit a scratch app. Preserve unrelated changes and review any lockfile edits rather than restoring them blindly.
