# Requirements: wraith-core

## Introduction

`wraith-core` is the pure pipeline of the Wraith Kit skeleton: `skeleton/src/core`, exported as the skeleton package's `core` entry. It turns an incoming webhook, poll or local command into Events, runs deterministic rules, optionally asks an advisor (an LLM behind the `llm-adapter` spec), and ends with proposed Actions that wait for a person unless their kind is declared safe and they carry no unconfirmed LLM-sourced data. It keeps an audit log written with every state change, and it makes intake and execution idempotent.

**Status.** Requirements written on 16 Nov 2026 in Kiro CLI (driven by T3 Code), by hand in the format Kiro documents for feature specs ([Feature Specs](https://kiro.dev/docs/specs/feature-specs), EARS acceptance criteria). The design phase is the author's Kiro IDE step with Correctness, due 12:00 IST on 18 Nov 2026, with the CLI fallback in PLAN.md section 10.7. No design.md or tasks.md exists yet.

**In scope.** The eight extension points and `defineApp` validation; the minimal app path and its defaults; intake (`accept`, `expand`, pollers, the `cli` source) and two-level dedupe; one store write per event; the rules engine and the read-only state snapshot; the advisor gate (`extract` and `reword` modes); records, values, versions and LLM provenance; the built-in `confirm-record` action kind; approval by default; the action state machine and the executor (claim lease, execute timeout, `lookup`, backoff, dead-letter); aggregates; the tick; the keyed audit chain and `wraith audit verify`; the escaping `html` template; DEMO marks; the store behaviour the core needs; the core line budget and the rule that the core knows nothing about the apps.

**Out of scope.** Store implementations, the HTTP server, Lambda handlers and scheduler drivers (`runtimes`); LLM providers, prompts on the wire and call caps (`llm-adapter`); screens, sessions and keyboard use (`approval-ui`); the MCP server (`wraith-mcp`); webhook signature checks, TODO rules and GitHub calls (`todo-afterlife`); notice parsing, Markdown and `.ics` escaping (`notice-ghoul`); the `new-app` scaffold and the 15-minute guide (`app-authoring`). All names here (`defineApp`, `ctx.state`, `ctx.clock`, `ctx.http`, `includeUnconfirmed`, `wraith audit verify`) are design intent; final names, signatures and config syntax are set in design (PLAN.md section 5).

**Sources in PLAN.md.** Section 5.1 (pipeline, extension points, minimal app, who writes records, rules for record changes, lean budget), 5.2 (data model and action states), 5.3 (idempotency, retries and audit), 5.4 (the core's safety rules), 8 items 5 and 6 (frozen objects, the core knows nothing about the apps) and 9.1 (properties P1 to P7). The invariants in `.kiro/steering/wraith-domain.md` restate the same rules.

**Dependencies.** This spec depends on no other spec. The core calls the LLM through an interface that the `llm-adapter` spec implements and the runtime passes in, so the core itself has no dependency. `runtimes`, `llm-adapter`, `approval-ui`, `wraith-mcp`, `todo-afterlife`, `notice-ghoul` and `app-authoring` depend on this spec.

## Glossary

- **Wraith core:** the code under `skeleton/src/core`; the system these requirements describe.
- **App:** what `defineApp` returns: an app id plus the extension points the app passed in.
- **Extension point:** one of the eight fields an app passes to `defineApp`: `sources`, `rules`, `advisor`, `actions`, `aggregates`, `views`, `theme`, `records`.
- **Source:** a webhook route (`accept` and an optional `expand`), a poller (a schedule and an `expand`), or a `cli` source (`accept` and `expand` run in one local process).
- **Delivery:** one request accepted by a webhook route or one input accepted by a `cli` source: delivery key, app id, source, received time, raw payload and status (`accepted` or `expanded`).
- **Event:** one normalised input: id, app id, source, kind, occurred and received times, subject, app-typed data, idempotency key and demo flag.
- **Idempotency key:** a deterministic key, never random and never taken from the clock. A delivery key dedupes deliveries, an event key dedupes events and an action key dedupes actions.
- **Rule:** an app rule with an id, a priority, a description and a pure `evaluate(event, ctx)` that returns findings, candidate actions, record upserts and optionally stop.
- **Finding:** a rule's observation: rule id, severity, message and evidence.
- **Record:** keyed app data that `ctx.state` reads: app id, type, key, `value`, `data`, `sourcedBy`, `confirmation`, `version` and updated time.
- **Value:** the part of a record a person confirms (for a deadline, its date and time). **Data:** the rest of the record (quotes, links, flags).
- **sourcedBy:** the provenance of a record's value only: `rules`, `llm:<provider>/<model>` or `human`.
- **Snapshot (`ctx.state`):** a read-only view of the app's records and actions, taken before an evaluation.
- **Default view:** the records a `ctx.state` query returns when it passes no include option.
- **Marked evaluation:** a rule evaluation or aggregate run that the core has marked as using LLM-sourced data (Requirement 12).
- **Advisor:** an app's optional LLM helper: a prompt builder, an output schema and a deterministic fallback, in one of two **advisor modes**: `extract` (proposes data with an evidence quote, before the rules) or `reword` (rewrites the wording of proposed actions, after the rules).
- **Suggestion:** the wording attached to an action: `by` (`rules` or `llm:<provider>/<model>`), the text and, for an LLM suggestion, the raw output kept for audit.
- **Action:** a proposed effect: id, idempotency key, kind, safety, `llmSourced`, status, attempts, lease, next attempt time, payload, preview, decision and result.
- **Safe kind:** an action kind declared `safety: "safe"` with a written reason.
- **confirm-record:** the built-in action kind that confirms, corrects or rejects a record value.
- **Aggregate:** an app's scheduled job that reads `ctx.state` and proposes at most one action per run.
- **Store:** the storage a runtime provides to the core (`runtimes` spec). **Store write:** one atomic write of one or more items.
- **AuditEntry:** one entry in the audit chain: `seq`, time, type, references, data, `prevHash` and `hash`.
- **Audit key:** the secret key of the HMAC over the audit chain, kept outside the store.
- **Tick:** the scheduled run that drives all background work.
- **Lease:** the time until which a claimed action belongs to the attempt that claimed it (`leaseUntil`).
- **Runtime:** the Node runtime or the AWS runtime (`runtimes` spec), which calls the core.
- **Demo flag:** the mark on demo data, shown as a visible DEMO label.

## Requirements

### Requirement 1: Define an app from extension points only

**User story:** As an app author, I want to define an app by passing extension points to one function, so that I never need to change or copy the core.

#### Acceptance criteria

1. THE Wraith core SHALL provide a `defineApp` function that takes an app id and the extension points `sources`, `rules`, `advisor`, `actions`, `aggregates`, `views`, `theme` and `records`.
2. IF `defineApp` receives a field that is neither the app id nor one of the eight extension points, THEN THE Wraith core SHALL reject the definition with an error that names the field.
3. IF two rules of one app have the same id, THEN THE Wraith core SHALL reject the definition with an error that names the duplicate id.
4. IF an action kind declares `safety: "safe"` without a non-empty written reason, THEN THE Wraith core SHALL reject the definition with an error that names the kind.
5. IF an app declares its own action kind named `confirm-record`, THEN THE Wraith core SHALL reject the definition, because that name belongs to the built-in kind.
6. IF an advisor in `extract` mode has no `verify` function, THEN THE Wraith core SHALL reject the definition with an error that names the missing function.
7. IF an app definition has no source, no rule or no action kind, THEN THE Wraith core SHALL reject the definition with an error that names what is missing.
8. WHEN `defineApp` accepts a definition, THE Wraith core SHALL return a frozen app object whose rule, source, action-kind, aggregate and record-type registries are frozen too.
9. IF code tries to add, change or delete a property of a frozen app object or registry, THEN THE Wraith core SHALL leave the object unchanged.

### Requirement 2: The minimal app and its defaults

**User story:** As a first-time app author, I want one source, one rule and one action kind to be enough, so that I can build a working agent quickly.

#### Acceptance criteria

1. WHEN an app defines one source, one rule and one action kind and no other extension point, THE Wraith core SHALL accept it and run the full pipeline for it.
2. WHERE an app has no advisor, THE Wraith core SHALL run neither advisor stage and SHALL make no LLM call for that app.
3. WHERE an app has no aggregates, THE Wraith core SHALL run no scheduled aggregate for it.
4. WHERE an app has no views, THE Wraith core SHALL supply the skeleton's default event and action card views for it.
5. WHERE an app has no theme, THE Wraith core SHALL use the app id as the app's name and the skeleton's base accent colour and icon.
6. WHERE an action kind declares no safety, THE Wraith core SHALL treat the kind as needing approval.
7. WHERE an action kind declares no retry policy, THE Wraith core SHALL apply the core retry policy (Requirement 19).

### Requirement 3: Accept webhook deliveries fast

**User story:** As the operator of a webhook-driven app, I want each delivery verified, deduplicated, stored and answered before any slow work, so that the sender's reply window is met and no delivery is lost.

#### Acceptance criteria

1. WHEN a request arrives on a webhook route, THE Wraith core SHALL pass the route path and the raw request to the route's `accept` before the core parses the request body.
2. THE Wraith core SHALL call `accept` without `ctx.http`, so that `accept` makes no outbound call through the core.
3. WHEN `accept` returns a delivery key that is not stored yet, THE Wraith core SHALL store a Delivery with status `accepted`, and its audit entry, in one store write before it replies that the delivery was accepted.
4. WHEN `accept` returns a delivery key that is already stored, THE Wraith core SHALL store nothing, start no `expand`, and reply as it does for a newly accepted delivery.
5. IF `accept` rejects the request, THEN THE Wraith core SHALL store no Delivery and reply with a rejection.
6. IF the store write for a new Delivery fails, THEN THE Wraith core SHALL reply with an error and not with an acceptance, so that the sender can deliver again.

### Requirement 4: Expand deliveries and polls into events

**User story:** As an app author, I want slow work such as fetching to run after the reply and to be redone after any failure, so that every accepted delivery and every poll becomes its events exactly once.

#### Acceptance criteria

1. WHEN a stored Delivery has status `accepted`, THE Wraith core SHALL run the route's `expand` with `ctx.http`, separately from the reply to the request.
2. WHERE a webhook route has no `expand`, THE Wraith core SHALL turn the accepted payload into one Event whose idempotency key is the delivery key.
3. WHEN one `expand` call returns several events, THE Wraith core SHALL evaluate them in the order returned, each against a fresh `ctx.state` snapshot taken after the previous event's store write.
4. THE Wraith core SHALL keep a Delivery in status `accepted` until every event from its `expand` has been written.
5. WHEN every event from a Delivery's `expand` has been written, THE Wraith core SHALL set the Delivery to `expanded`, with its audit entry, in one store write.
6. IF `expand` throws, or one of its events' store writes fails, THEN THE Wraith core SHALL leave the Delivery in status `accepted`, so that the next tick expands it again.
7. WHEN a poller is due on a tick, THE Wraith core SHALL run the poller's `expand` with `ctx.http` and the conditional-GET validators saved from its last fully stored fetch.
8. THE Wraith core SHALL save a poller's conditional-GET validators from a fetch only after every event from that fetch has been written, so that a failed write fetches the same items again.
9. WHEN a `cli` source receives input, THE Wraith core SHALL run its `accept` and `expand` in the same process and return only after the events from that input have been written.
10. IF an event returned by `expand` has no idempotency key, THEN THE Wraith core SHALL drop that event and write an audit entry that names the source.

### Requirement 5: Deterministic keys and two-level dedupe

**User story:** As an app author, I want the same delivery, event or action to be stored once however often it arrives, so that the same event twice gives one action.

#### Acceptance criteria

1. THE Wraith core SHALL derive every key it creates from the input's identity, and from a content hash where the content can change, and never from random values or the clock.
2. THE Wraith core SHALL derive an action's idempotency key from the event key, the action kind and the action's target.
3. WHEN an event's key is already stored, THE Wraith core SHALL skip the event before the `extract` advisor runs, so that no LLM call is repeated for it.
4. WHEN two writers store events with the same key at the same time, THE Wraith core SHALL let exactly one of the writes store it, through the condition that the event key is not stored yet.
5. WHEN a proposed action's key is already stored, THE Wraith core SHALL store no second action with that key.

### Requirement 6: Rules run in a fixed order on a read-only snapshot

**User story:** As an app author, I want rules to run in a fixed order on a read-only view of state, so that the same event, snapshot and clock always give the same findings and actions.

#### Acceptance criteria

1. THE Wraith core SHALL evaluate an app's rules for an event in ascending order of (priority, id), whatever order they were registered in.
2. WHEN a rule returns stop, THE Wraith core SHALL run no later rule in (priority, id) order for that event.
3. THE Wraith core SHALL give each rule's `evaluate` the event and a context with `ctx.clock` and `ctx.state`, and no `ctx.http`, store handle or other way to do I/O.
4. THE Wraith core SHALL take one `ctx.state` snapshot of the app's records and actions before an event's evaluation and give the same snapshot to every rule for that event.
5. IF a rule tries to change `ctx.state`, THEN THE Wraith core SHALL leave the snapshot unchanged.
6. THE Wraith core SHALL store with each proposed action an explanation: the event, every rule that ran in evaluation order with its findings, whether a rule returned stop, and whether the wording came from the rules, from an LLM (with provider and model) or from a fallback (with its reason).
7. THE Wraith core SHALL accept a rule's upsert of any record of the evaluating app, whether or not the record is tied to the event, and SHALL store every upsert under the evaluating app's id.
8. IF a rule proposes an action of a kind that the app does not declare and that is not `confirm-record`, THEN THE Wraith core SHALL propose no action for it and write an audit entry that names the rule and the kind.

### Requirement 7: One store write per event

**User story:** As an operator, I want an event and everything it produced to be stored together or not at all, so that a crash can never leave a stored event without its actions.

#### Acceptance criteria

1. WHEN the rules and any `reword` advisor have run for an event, THE Wraith core SHALL write in one store write the event, its record changes, the `confirm-record` actions it supersedes, the actions it proposes, and an audit entry for each of these.
2. THE Wraith core SHALL make the event's part of that write conditional on the event key not being stored yet.
3. THE Wraith core SHALL make each record change in that write conditional on the record being unchanged since the snapshot the rules read.
4. THE Wraith core SHALL merge all changes that one event makes to one record into one operation of the write.
5. IF the write fails because the event is already stored, THEN THE Wraith core SHALL drop that event's outputs, because an earlier write stored them.
6. IF the write fails because a record changed since the snapshot, THEN THE Wraith core SHALL run the rules again on a fresh snapshot, reusing the `extract` data it already accepted for that event and making no new `extract` call.
7. IF the write fails for another reason, or the process stops before the write completes, THEN THE Wraith core SHALL leave none of that event's outputs in the store, so that a later tick, redelivery or re-poll redoes the work.
8. THE Wraith core SHALL limit the items in one event's store write with a per-event output cap that keeps the write under 100 items.
9. IF an event's outputs would exceed the per-event output cap, THEN THE Wraith core SHALL store no partial set of those outputs and SHALL write an audit entry that names the event and the number of outputs.

### Requirement 8: The advisor in extract mode

**User story:** As an app author, I want an LLM to propose data only with evidence that my deterministic code can reproduce, so that the LLM proposes, the rules verify and a person confirms.

#### Acceptance criteria

1. WHERE the app's advisor is in `extract` mode, THE Wraith core SHALL run it before the rules, only for events whose key is not stored yet.
2. WHEN the advisor's prompt builder returns nothing for an event, THE Wraith core SHALL make no LLM call for that event.
3. WHEN the `extract` advisor returns a proposal, THE Wraith core SHALL accept it only if the app's `verify`, run on the proposal's evidence quote and the event, reproduces a value equal to the proposed value.
4. IF `verify` does not reproduce the proposed value, THEN THE Wraith core SHALL drop the proposal and write an audit entry that records the rejection.
5. WHEN a proposal is accepted, THE Wraith core SHALL attach its value to the event as extracted data labelled with the provider and model that produced it.
6. WHEN the LLM call for an `extract` advisor falls back, THE Wraith core SHALL use the advisor's deterministic fallback output and SHALL not treat that output as LLM-sourced.

### Requirement 9: The advisor in reword mode

**User story:** As an app owner, I want the LLM limited to rewording the actions the rules proposed, so that AI can edit the words and never the decision.

#### Acceptance criteria

1. WHERE the app's advisor is in `reword` mode, THE Wraith core SHALL run it after the rules, only on the actions the rules proposed for that event.
2. THE Wraith core SHALL accept from a `reword` result only changes to the wording of the proposed actions.
3. IF a `reword` result adds or removes an action, or changes an action's kind, target or safety, THEN THE Wraith core SHALL discard the whole result, use the advisor's deterministic fallback wording and write an audit entry that records the reason.
4. WHEN the LLM call for a `reword` advisor falls back, THE Wraith core SHALL use the advisor's deterministic fallback wording.
5. THE Wraith core SHALL attach to each proposed action a Suggestion whose `by` is `rules` or `llm:<provider>/<model>`, with its text and, for an LLM suggestion, the raw output kept for audit.

### Requirement 10: Who writes records, values and versions

**User story:** As a user, I want records to change only through rules and through my own confirmations, so that no other code can quietly change my data.

#### Acceptance criteria

1. THE Wraith core SHALL change records only through rule upserts in an event's store write and through the execution of `confirm-record` actions.
2. THE Wraith core SHALL give `expand`, the advisor, app `execute` functions and aggregates no way to write records.
3. WHEN a rule upsert in an unmarked evaluation sets or changes a record's value, THE Wraith core SHALL set the record's `sourcedBy` to `rules`.
4. THE Wraith core SHALL write a record's `sourcedBy` only together with a new value.
5. WHEN an upsert changes a record's `data` but not its `value`, THE Wraith core SHALL keep the record's `sourcedBy`, `version` and `confirmation` unchanged.
6. WHEN a rule upsert changes a record's `value`, THE Wraith core SHALL increase the record's `version` by one and set its `confirmation` to `none`.
7. WHILE a record's value has `sourcedBy: human`, THE Wraith core SHALL keep that value and its `sourcedBy` through every later evaluation, marked or not, until a person approves a new value.
8. IF a rule upsert produces a value that differs from a stored value whose `sourcedBy` is `human`, THEN THE Wraith core SHALL propose a `confirm-record` action that shows both values.

### Requirement 11: The default view of state

**User story:** As an app author, I want `ctx.state` to hide rejected records and unconfirmed LLM-sourced records unless I ask for them, so that my rules and aggregates do not use them by accident.

#### Acceptance criteria

1. THE Wraith core SHALL leave out of every `ctx.state` query that passes no include option, for rules and aggregates alike, the records whose `confirmation` is `rejected`.
2. THE Wraith core SHALL leave out of every `ctx.state` query that passes no include option, for rules and aggregates alike, the records whose value is LLM-sourced with `confirmation` `none`.
3. WHEN a `ctx.state` query passes the include option (proposed name: `includeUnconfirmed`), THE Wraith core SHALL also return the records the default view leaves out.

### Requirement 12: The core tracks LLM provenance

**User story:** As a user, I want the core, not the app, to track which values and actions came from an LLM, so that no LLM-sourced value is used or hidden without a request for my confirmation.

#### Acceptance criteria

1. WHEN a rule evaluates an event that carries accepted `extract` data, THE Wraith core SHALL mark that evaluation.
2. WHEN a `ctx.state` query made during a rule's evaluation returns a record whose value is LLM-sourced with `confirmation` `none`, THE Wraith core SHALL mark that evaluation.
3. WHEN a `ctx.state` query made during an aggregate run returns a record whose value is LLM-sourced with `confirmation` `none`, THE Wraith core SHALL mark that aggregate run.
4. THE Wraith core SHALL set `llmSourced: true` on every action proposed by a marked evaluation or a marked aggregate run.
5. THE Wraith core SHALL set `sourcedBy: llm:<provider>/<model>` on every record value that a marked evaluation sets or changes.
6. WHEN a mark comes from accepted `extract` data, THE Wraith core SHALL use the provider and model of that data in the mark.
7. WHEN a mark comes from a `ctx.state` query, THE Wraith core SHALL use a provider and model taken from the LLM-sourced records the query returned.
8. WHEN the Wraith core marks a new value LLM-sourced, THE Wraith core SHALL propose a `confirm-record` action for that value in the same store write.
9. THE Wraith core SHALL keep, for every record whose value is LLM-sourced with `confirmation` `none`, a pending `confirm-record` action for its current version and value.
10. THE Wraith core SHALL set `llmSourced` and LLM `sourcedBy` values itself and SHALL ignore any such value that app code returns.

### Requirement 13: The built-in confirm-record action

**User story:** As a user, I want one standard way to confirm, correct or reject a record value, so that values that need a person change only when I say so.

#### Acceptance criteria

1. THE Wraith core SHALL provide a built-in action kind `confirm-record` that always needs approval and that the core executes itself.
2. THE Wraith core SHALL derive a `confirm-record` action's key from the record key, the record version and the proposed value, so that a rule's proposal and the core's proposal for the same value are one action.
3. WHEN a person approves a `confirm-record` action, THE Wraith core SHALL write the proposed value to the record and set its `confirmation` to `confirmed`, in a write conditional on the record version stored in the action.
4. WHEN a person submits an edited value for a `confirm-record` action, THE Wraith core SHALL check it on the server with the record type's `parseValue` before writing anything.
5. IF `parseValue` returns an error for an edited value, THEN THE Wraith core SHALL return that error as a form error and change no record and no action.
6. WHEN `parseValue` accepts an edited value, THE Wraith core SHALL write the normal form that `parseValue` returned, with `sourcedBy: human` and `confirmation` `confirmed`, in the same version-conditional write as an approval.
7. IF an edited value is submitted for a record type that has no `parseValue`, THEN THE Wraith core SHALL refuse it and change nothing.
8. WHEN a person picks a listed candidate, THE Wraith core SHALL take the candidate's value from the stored action by the position sent, and write it with `sourcedBy: human` and `confirmation` `confirmed` in the same version-conditional write.
9. IF a pick sends a position that is not in the stored action's candidate list, THEN THE Wraith core SHALL change nothing and return an error.
10. WHEN a person rejects a `confirm-record` action that does not propose replacing a value whose `sourcedBy` is `human`, THE Wraith core SHALL set the record's `confirmation` to `rejected`.
11. WHEN a person rejects a `confirm-record` action that proposes replacing a value whose `sourcedBy` is `human`, THE Wraith core SHALL leave that value, its `sourcedBy` and its `confirmation` as they were.
12. WHEN an approval, edit or pick writes a value that differs from the record's current value, THE Wraith core SHALL increase the record's `version` by one.
13. IF the record's version differs from the version stored in the action when an approval, edit or pick is written, THEN THE Wraith core SHALL change no record and report that the action was superseded.

### Requirement 14: Stale confirmations are superseded

**User story:** As a user, I want pending confirmations for old values to be retired when the value changes, so that I never approve a value that is no longer current.

#### Acceptance criteria

1. WHEN a record's version changes, THE Wraith core SHALL move every pending (`proposed` or `approved`) `confirm-record` action for an older version of that record to `superseded`, with an audit entry, in the same store write as the change.
2. WHEN a new `confirm-record` action is proposed for a record, THE Wraith core SHALL move every pending older `confirm-record` action for that record to `superseded`, with an audit entry, in the same store write.
3. WHEN a newer `confirm-record` action replaces a pending one, THE Wraith core SHALL store on the superseded action a reference to the newer action.
4. WHEN a record's value changes, THE Wraith core SHALL propose a new `confirm-record` action for it only if a rule proposes one or Requirement 12 requires one.
5. THE Wraith core SHALL never execute an action in status `superseded`.

### Requirement 15: Approval by default

**User story:** As a user, I want every action to wait for me unless its kind is declared safe with a reason and it carries no unconfirmed LLM data, so that the agent proposes and I decide.

#### Acceptance criteria

1. WHEN an action of a kind that is not declared safe is proposed, THE Wraith core SHALL store it in status `proposed` until a person decides.
2. WHEN an action of a safe kind is proposed with `llmSourced: false`, THE Wraith core SHALL move it to `auto-approved` with an audit entry that records the kind's reason.
3. IF an action carries `llmSourced: true`, THEN THE Wraith core SHALL keep it in status `proposed` until a person decides, whatever its kind declares.
4. THE Wraith core SHALL move an action to `executing` only if an `approved` or `auto-approved` audit entry for that action has been written before.
5. WHEN a person approves or rejects an action, THE Wraith core SHALL record who decided and when, on the action and in its audit entry.
6. WHEN a person rejects an action, THE Wraith core SHALL record the reason given in the audit entry.
7. THE Wraith core SHALL never let LLM output, a `reword` result or app code set an action's safety or clear its `llmSourced` flag.

### Requirement 16: Action states

**User story:** As an operator, I want actions to move only along defined states, so that a finished action never runs again by accident.

#### Acceptance criteria

1. THE Wraith core SHALL allow only these action transitions: `proposed` to `approved`, `rejected` or `auto-approved`; `approved` or `auto-approved` to `executing`; `executing` to `succeeded`, `retry-wait` or `dead`; `retry-wait` to `executing`; `dead` to `approved`; and, for `confirm-record` only, `proposed` or `approved` to `superseded`.
2. IF a transition outside that list is requested, THEN THE Wraith core SHALL refuse it and change nothing.
3. THE Wraith core SHALL treat `rejected`, `succeeded`, `dead` and `superseded` as terminal, with no transition out of them except a manual retry from `dead`.
4. WHEN a person retries a `dead` action, THE Wraith core SHALL move it to `approved` with an audit entry that records who retried it.

### Requirement 17: Execute under a claim lease and a timeout

**User story:** As an operator, I want each attempt claimed, time-limited and recorded only while it still holds its claim, so that crashes and slow calls never cause a double effect or a lost result.

#### Acceptance criteria

1. WHEN an action is `approved` or `auto-approved`, or is in `retry-wait` with its `nextAttemptAt` passed, THE Wraith core SHALL claim it with a conditional change to `executing` that sets `leaseUntil` and increases `attempts` by one.
2. IF two executors try to claim the same action, THEN THE Wraith core SHALL let exactly one claim succeed.
3. THE Wraith core SHALL run every `execute` call under the core execute timeout (proposed: 30 s) and pass it the action's idempotency key and an abort signal that fires when the timeout is reached.
4. THE Wraith core SHALL set `leaseUntil` to the claim time plus the execute timeout plus a margin, so that every attempt has ended or been aborted before its lease runs out.
5. THE Wraith core SHALL record an attempt's result only if the action is still `executing` with the same `attempts` value as that attempt's claim.
6. IF a result arrives after its claim is no longer current, THEN THE Wraith core SHALL leave the action unchanged and keep the result only as an audit entry.
7. WHEN a tick finds an action in `executing` whose lease has expired and whose attempts are below the maximum, THE Wraith core SHALL move it to `retry-wait` with an audit entry.
8. THE Wraith core SHALL give `execute` a context with no way to write records or change action states.

### Requirement 18: Look up unknown outcomes before a retry

**User story:** As an app author, I want the core to check for an earlier effect before retrying after an unknown outcome, so that a timeout never creates a duplicate.

#### Acceptance criteria

1. WHEN an action's previous attempt ended in a timeout or an expired lease and its kind has `lookup`, THE Wraith core SHALL run `lookup` before it calls `execute` again.
2. WHEN `lookup` finds the earlier effect, THE Wraith core SHALL move the action to `succeeded` with the effect it found and SHALL not call `execute` again.
3. WHEN `lookup` finds no earlier effect, THE Wraith core SHALL call `execute` in that attempt.
4. IF `lookup` fails, THEN THE Wraith core SHALL not call `execute` in that attempt and SHALL handle the attempt as a failed attempt with a retryable error.
5. WHERE an action kind has no `lookup`, THE Wraith core SHALL retry without a lookup and record in the attempt's audit entry that no lookup ran.

### Requirement 19: Retries, backoff and dead-letter

**User story:** As an operator, I want failed attempts retried with bounded, jittered delays and finally set aside, so that an outage neither hammers a service nor loses an action.

#### Acceptance criteria

1. IF an attempt fails with a retryable error (a network error, an HTTP 5xx status or an HTTP 429 status) and the action's attempts are below the maximum, THEN THE Wraith core SHALL move the action to `retry-wait` and set its `nextAttemptAt`.
2. THE Wraith core SHALL choose each retry delay by exponential backoff with full jitter, between 0 and the retry policy's cap.
3. WHEN a failed attempt carries a `Retry-After` value, THE Wraith core SHALL set `nextAttemptAt` no earlier than the time that `Retry-After` gives.
4. THE Wraith core SHALL never start more attempts for an action than its retry policy's maximum (proposed for the core retry policy: 5).
5. IF an attempt fails with an error that is not retryable, or the failed attempt was the last one allowed, THEN THE Wraith core SHALL move the action to `dead` with an audit entry.
6. IF a lease expires on an attempt that was the last one allowed, THEN THE Wraith core SHALL move the action to `dead` with an audit entry.

### Requirement 20: Aggregates

**User story:** As an app author, I want scheduled jobs that read state and propose at most one action per period or per distinct input set, so that a re-run never proposes the same output twice.

#### Acceptance criteria

1. WHEN an aggregate's schedule is due on a tick, evaluated in the app's timezone, THE Wraith core SHALL run the aggregate with a read-only `ctx.state` and `ctx.clock`.
2. THE Wraith core SHALL accept at most one proposed action from one aggregate run.
3. IF an aggregate run returns more than one action, THEN THE Wraith core SHALL propose none of them and write an audit entry that names the aggregate.
4. THE Wraith core SHALL derive an aggregate action's key from the app id, the aggregate id and either the period or a hash of the input set.
5. WHEN an aggregate run proposes an action whose key is already stored, THE Wraith core SHALL propose nothing new.

### Requirement 21: The tick

**User story:** As an operator, I want one scheduled tick to drive all background work and to back up every faster trigger, so that no work waits forever when a trigger fails.

#### Acceptance criteria

1. WHEN a tick runs, THE Wraith core SHALL expand every Delivery that is still in status `accepted`.
2. WHEN a tick runs, THE Wraith core SHALL claim the `approved` and `auto-approved` actions that no attempt has claimed, and the `retry-wait` actions whose `nextAttemptAt` has passed.
3. WHEN a tick runs, THE Wraith core SHALL handle every claim lease that has expired (Requirements 17 and 19).
4. WHEN a tick runs, THE Wraith core SHALL run the aggregates and pollers that are due.
5. WHERE demo mode is on, WHEN the demo reset is due on a tick, THE Wraith core SHALL restore the app's demo data and write an audit entry for the reset.
6. WHEN a tick and another trigger handle the same delivery or action at the same time, THE Wraith core SHALL end with the same stored result as if only one of them had handled it.

### Requirement 22: The keyed audit chain

**User story:** As a reviewer, I want every step written to a keyed hash chain together with the change it records, and a command that verifies the chain, so that a change by anyone without the audit key is detected.

#### Acceptance criteria

1. THE Wraith core SHALL write an audit entry for every state change, every LLM call and every advisor fallback.
2. THE Wraith core SHALL write every state change (an action transition, a Delivery status change, a record change, a proposal) and its audit entry in one store write.
3. THE Wraith core SHALL give the audit entries of one store write consecutive `seq` numbers that follow the head of the chain.
4. WHEN a store write is rejected because another writer took the `seq` number it used, THE Wraith core SHALL read the head of the chain again and retry the write with the next `seq`.
5. THE Wraith core SHALL compute each entry's `hash` as an HMAC-SHA-256 over the entry and its `prevHash`, keyed with the audit key.
6. THE Wraith core SHALL take the audit key from the runtime and never write it to the store, an audit entry or a log.
7. IF no audit key is available, THEN THE Wraith core SHALL refuse to write and report that the audit key is missing.
8. THE Wraith core SHALL record in each LLM audit entry the provider, the model, a hash of the prompt and any fallback reason, and never a key or token.
9. WHEN `wraith audit verify` runs with the audit key on a chain that nobody changed, THE Wraith core SHALL report that the chain verifies.
10. IF any audit entry was edited, deleted or reordered by someone without the audit key, THEN THE Wraith core SHALL make `wraith audit verify` fail and name the first `seq` that does not verify.
11. THE Wraith core SHALL make `wraith audit verify` state, with every result, that a pass shows only that nobody without the audit key changed the chain, and that anyone who can read the key can still rewrite it.

### Requirement 23: Untrusted text and the html template

**User story:** As a user, I want event text and LLM output treated as untrusted wherever the skeleton renders HTML, so that a hostile TODO comment or notice cannot inject markup.

#### Acceptance criteria

1. THE Wraith core SHALL provide an `html` tagged template that escapes every interpolated value for HTML text and attribute contexts.
2. THE Wraith core SHALL insert a value into an `html` template without escaping only when that value was itself produced by the `html` template.
3. THE Wraith core SHALL render event text, record data and LLM output in its default views only through the `html` template.

### Requirement 24: Demo data is marked

**User story:** As a judge or visitor, I want everything that comes from demo data to be marked, so that I never mistake demo data for real data.

#### Acceptance criteria

1. WHEN an event carries the demo flag, THE Wraith core SHALL mark every action proposed from that event as demo.
2. WHEN an event that carries the demo flag sets or changes a record, THE Wraith core SHALL mark that record as demo.
3. WHEN an aggregate run reads a demo record or a demo action, THE Wraith core SHALL mark the action it proposes as demo.
4. THE Wraith core SHALL show a visible DEMO label on every demo event, demo record and demo action in its default views.

### Requirement 25: The store behaviour the core needs

**User story:** As a runtime author, I want the core's needs from a store stated as behaviour, so that any store that provides that behaviour can run both apps.

#### Acceptance criteria

1. THE Wraith core SHALL make every change through a store write that stores all of its items or none of them.
2. THE Wraith core SHALL require from the store a conditional insert that fails when an item with the same key is already stored.
3. THE Wraith core SHALL require from the store a conditional update that fails when the item's current status, version or attempt count differs from the one the core expects.
4. THE Wraith core SHALL require from the store, for a rejected write, a report of which item's condition failed.
5. THE Wraith core SHALL contain the store interface and no store implementation.

### Requirement 26: A lean core that knows nothing about the apps

**User story:** As a developer reading the skeleton, I want a small, dependency-free core with no app-specific code, so that it stays clear and both apps provably share it.

#### Acceptance criteria

1. THE Wraith core SHALL have zero runtime npm dependencies and import only Node.js built-ins and its own files.
2. THE Wraith core SHALL stay within its non-blank line budget for `skeleton/src/core` (proposed: 1,800 non-blank lines), as counted by the budget script.
3. WHEN the budget script runs, THE Wraith core's budget script SHALL print the number of non-blank lines under `skeleton/src/core` and exit with a failure when it exceeds the budget.
4. THE Wraith core SHALL contain no app id or app folder name (`todo-afterlife`, `notice-ghoul`) anywhere under `skeleton/src`.
5. THE Wraith core SHALL be reachable by apps only through the entries in the skeleton package's `exports`.
6. THE Wraith core SHALL carry the skeleton's marker banner at the top of every source file under `skeleton/src`.

### Requirement 27: The data model

**User story:** As an app author or runtime author, I want one fixed shape for deliveries, events, records, findings, actions and audit entries, so that every app, runtime and screen reads the same fields.

#### Acceptance criteria

1. THE Wraith core SHALL store each Delivery with its delivery key, app id, source, received time, raw payload and status (`accepted` or `expanded`).
2. THE Wraith core SHALL store each Event with its id, app id, source, kind, occurred time, received time, subject, app-typed data, idempotency key and demo flag.
3. THE Wraith core SHALL store each Record with its app id, type, key, `value`, `data`, `sourcedBy`, `confirmation` (`none`, `confirmed` or `rejected`), `version` and updated time.
4. THE Wraith core SHALL store each Finding with its rule id, severity, message and evidence.
5. THE Wraith core SHALL store each Action with its id, idempotency key, kind, safety, `llmSourced`, status, `attempts`, `leaseUntil`, `nextAttemptAt`, payload, preview, `decidedBy`, `decidedAt` and result.
6. THE Wraith core SHALL store each AuditEntry with its `seq`, time, type, references, data, `prevHash` and `hash`.

## Notes for the design phase

### Open design questions that PLAN.md leaves to this spec

1. **Which provider and model a mark from a query carries.** PLAN.md 5.1: "**Spec-phase requirement:** the `wraith-core` spec sets which provider and model a mark carries when it came from a query rather than from the event (proposed: those of the LLM-sourced records the query returned)." The design also has to say what happens when the query returned records from more than one provider or model. Criteria: 12.5, 12.7.
2. **How "unchanged since the snapshot" is checked.** PLAN.md 5.3: "**Spec-phase requirement:** the `wraith-core` spec sets how "unchanged since the snapshot" is checked, a cap on the outputs of one event that keeps its write under 100 items, and what happens to an event over the cap." The plan reviews' list of remaining issues (task `task-wraith-kit-plan`, in task notes kept outside this repo) lists it as: "how 'unchanged since the snapshot' is checked for one-write-per-event and a cap keeping one event's write under the 100-item TransactWriteItems limit (wraith-core/runtimes)". Candidates to compare: the record's `version` (which changes only with the value), or a separate revision counter that changes with any write to the record. Criteria: 7.3, 7.6, 25.3.
3. **The per-event output cap and what happens over it.** Same PLAN.md 5.3 quote. AWS says `TransactWriteItems` "groups up to 100 write actions in a single all-or-nothing operation" ([DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), quoted in PLAN.md 5.3, read 16 Nov 2026). The cap value is not set yet. Choices to compare for an event over the cap: store the event with no outputs and an audit entry, or treat the event as failed and leave its Delivery `accepted`, which would retry forever. Criteria: 7.8, 7.9.
4. **The `value` and `version` fields and the conditional-write details.** PLAN.md 5.1: "**Spec-phase requirement:** the `wraith-core` spec sets the `value` and `version` fields and the conditional-write details, and P5 covers approving a superseded action." Criteria: 10.4 to 10.6, 13.3, 13.6, 13.8, 13.12, 13.13, 14.1.

### Other questions found while writing these requirements

- **`Retry-After` above the backoff cap.** P7 says delays stay within [0, cap] and `Retry-After` is honoured (criteria 19.2 and 19.3). The design must say which wins when `Retry-After` is longer than the cap (for example: honour it and count it outside the jitter bound, or treat it as a failed attempt).
- **Manual retry and the attempt count.** Does a retry from `dead` (16.4) reset `attempts`, or add a fresh allowance? P7 says attempts never exceed the maximum.
- **An expired lease on the last attempt.** 19.6 moves the action to `dead` without a `lookup`, although the effect may have happened. Should a final lookup-only attempt run first?
- **Errors thrown by app code.** What the core does when `expand` (4.6 covers the Delivery), a rule, `verify`, an aggregate or a view throws.
- **`reword` after a record conflict.** 7.6 reuses accepted `extract` data. Does a re-run of the rules call the `reword` advisor again (a new LLM call) or reuse its last result?
- **A reworded action of a safe kind.** PLAN.md 5.1 says `reword` "cannot ... change safety", and the mark (Requirement 12) comes only from `extract` data and queries. So a safe kind with LLM-reworded text would still auto-approve. Confirm this is intended, or mark reworded actions `llmSourced`.
- **The include option and rejected records.** 11.3 returns rejected records too. Does a rejected LLM-sourced record returned by a query mark the evaluation (12.2 marks only confirmation `none`)?
- **The `seq` race.** A bound on the retries in 22.4.
- **Demo marks.** PLAN.md 5.2 lists the demo flag on `Event` only (27.2); 24.1 to 24.3 need it on `Action` and `Record` too, and the superseding reference in 14.3 is a field PLAN.md 5.2 does not list either. What the demo reset (21.5) does to the audit chain (the chain cannot lose entries without failing `wraith audit verify`).
- **Replies.** The status codes for an accepted, duplicate and rejected delivery (TODO Afterlife replies 202, PLAN.md section 6).
- **Values not set yet:** the lease margin (17.4), the backoff base and cap (19.2), the per-event output cap (7.8), and the budget script's name and output format (26.3). The execute timeout (30 s), the maximum attempts (5) and the line budget (1,800 non-blank lines) are proposed values from PLAN.md.
- **Package name and export paths.** `.kiro/steering/structure.md` says they are set in this spec (26.5).
- **The `html` template.** The exact characters it escapes, and how a nested template result is marked as already escaped (23.2).

### Properties from PLAN.md section 9.1 and the criteria they check

| Property | Criteria |
|---|---|
| P1 Idempotent and complete intake | 3.3, 3.4, 3.6, 4.2 to 4.9, 5.1 to 5.5, 7.1, 7.2, 7.5 to 7.7, 8.1, 21.1, 21.6, 25.1, 25.2 |
| P2 Idempotent execution | 17.1 to 17.7, 18.1 to 18.4, 21.2, 21.3 |
| P3 Rule ordering | 1.3, 6.1, 6.4, 6.6 |
| P4 Stop semantics | 6.2 |
| P5 Approval gate (model-based) | 9.2, 9.3, 10.1 to 10.8, 11.1 to 11.3, 12.1 to 12.10, 13.1 to 13.13, 14.1 to 14.5, 15.1 to 15.4, 15.7, 16.1 to 16.4, 22.2 |
| P6 Audit chain | 22.3 to 22.5, 22.9, 22.10 |
| P7 Retry bounds | 19.2 to 19.4 |

P1, P2 and P6 also run in the store contract suite against both stores (`runtimes` spec). Criteria that no property covers (for example 1.2, 1.4 to 1.9, 2.1 to 2.7, 23.1 to 23.3, 26.1 to 26.6, 27.1 to 27.6) get unit tests, and 1.8, 1.9, 26.4 and 26.5 are also checked by `tests/core-integrity.test.ts` (PLAN.md section 8 items 2, 5 and 6).

### Docs still to confirm (cite in design.md)

- Node.js `node:crypto`: `createHmac('sha256', key)` for the chain, `createHash` for keys and the prompt hash, `timingSafeEqual` for comparisons.
- Node.js `AbortController` and `AbortSignal.timeout()` for the execute timeout.
- Node.js and TypeScript docs on `package.json` `exports` conditions, so that tests load the TypeScript sources (PLAN.md section 8 item 4).
- fast-check's model-based testing API (commands and model runs) for P5, and whether a Vitest integration package is used (PLAN.md section 9).
- The DynamoDB `TransactWriteItems` cancellation reasons, which 25.4 relies on to tell "event already stored" from "record changed" (`runtimes` spec).
- A citable source for the full-jitter backoff formula, and the `Retry-After` formats (seconds or an HTTP date) in RFC 9110.
- Kiro: [Correctness](https://kiro.dev/docs/specs/correctness) is IDE only, and properties are extracted from EARS requirements in the design phase. Analyze Requirements (`/spec analyze_requirements wraith-core` in the CLI, per [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements)) has not been run on this file yet; it needs a Kiro session started in `wraith-kit/`.
