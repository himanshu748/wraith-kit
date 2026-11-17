# Design: wraith-core

Authored by Codex through T3 Code on 17 Nov 2026 after the author explicitly said to build. This supersedes the reserved IDE pause for implementation; it is not Kiro IDE Correctness evidence. The requirements remain the contract; the decisions and boundaries below make previously open questions concrete.

## Package and capability boundaries

`@wraith-kit/skeleton/core` exports types, `defineApp`, `Engine`, canonical hashing, HTML escaping, audit verification and typed execution errors. It imports only its own files and Node built-ins. The Node and AWS entries implement `Store`; the LLM entry implements `AdvisorClient`. The core never knows app identifiers. Every skeleton source starts with `// WRAITH-SKELETON`.

`defineApp` validates the fixed eight extension points and freezes the app, registries, rule definitions and configuration. Rules are sorted once by numerical priority then code-point identifier ordering. The minimal app requires a source, rule and action kind; omitted safety means approval, omitted advisor means no call, and omitted aggregates means no scheduled work. Theme defaults are set by the core; the shared UI supplies default cards when an app omits its views.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6_

## JSON contracts, snapshots and transactions

`types.ts` fixes the public contracts. JSON contains only finite JSON values; canonical hashing sorts object keys and preserves array order. Every generated ID includes the app namespace. Event IDs include the supplied idempotency key; regular action IDs include the event key, kind and target. Caller-supplied extraction or provenance fields are discarded at intake.

A `Snapshot` contains maps of deliveries, events, records, actions and schedules, an audit array and optional opaque `meta`. The core preserves metadata used by runtime quotas. `Store.read()` returns a copy; `compareAndSwap(revision, next)` atomically publishes revision + 1 or returns false. A single global revision checks **all** record metadata changes, not just value versions. This is stronger than per-record conditions but intentionally serializes writers for the small demo. Store errors throw; a false CAS means retry against fresh state. Twenty conflicts exhaust the bound and return an explicit error. Each successful core state mutation appends its HMAC audit entries before the same CAS.

Rules get deep-frozen copies through `ctx.state` and a fixed clock value. There is no store, executor or HTTP capability in that context. Source expansion and execution have bounded HTTP/abort capabilities but cannot write records. A simulation runs deterministic rules against a read-only snapshot, with no adapter call, store write or executor.

The default event output cap is forty direct upserts plus actions. After confirmation generation and superseding, a second check counts changed entities, new audit rows and the transaction head and refuses more than ninety-five items. An over-cap event is stored with a diagnostic and **no** partial output, so a delivery does not retry that oversized event forever. The AWS store additionally checks its actual chunk transaction limits.

_Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 25.1, 25.2, 25.3, 25.4, 25.5, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_

## Intake, polling and aggregation

`accept(sourceId, raw)` passes raw headers/body/path to the app verifier. It stores an accepted Delivery and audit atomically; a duplicate returns that same Delivery without expansion. The HTTP caller may then acknowledge it. A CLI source expands before returning. A webhook without `expand` uses the delivery payload as one event.

`tick()` expands accepted deliveries in order. Every event commits against fresh state; a delivery is marked expanded only after all events succeed. An expansion failure leaves it accepted with an error. Polls pass the last committed conditional-fetch validators, save new validators only after every event commits, and retain old validators on failure. Poll default interval is sixty seconds; source authors can set it explicitly. Aggregate default interval is one second; the aggregate returns zero or one candidate with a stable input-set/period key. Identical keys create no second action. Schedule writes and aggregate proposals are atomic.

A tick finishes by recovering expired leases and attempting ready approved actions. Concurrency can repeat fetches or computations, but CAS prevents duplicate committed events/actions. Applications must not perform write effects in accept/expand/rules/aggregates. Input lacking an event key is explicitly audited and dropped.

`resetDemo(actor)` is explicit, never automatically scheduled by the core. It removes only demo-labelled entities for this app, keeps real entities, quotas and the entire audit prefix, and appends a reset receipt. It refuses executing demo actions and unknown outcomes. It cannot undo a real issue created from demo data. The runtime leaves automatic reset disabled; the UI must warn before an owner chooses reset. This is a deliberate safety restriction on requirement 21.5 until a bounded automatic-reset policy is separately enabled.

_Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 20.1, 20.2, 20.3, 20.4, 20.5, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

## Records, provenance and confirmation

Records use `hash(app, type, key)`. `version` starts at one and increments only on a value change. Global snapshot revision protects metadata-only changes. Rules merge their changes per record before writing. Context-only updates preserve provenance, confirmation and value version. A human value is never overwritten by a rule: a different proposed value creates a confirmation instead.

The default state view hides rejected values and unconfirmed LLM values. `includeUnconfirmed` is explicit, and a predicate can narrow it before provenance tracking. Returning any unconfirmed LLM record marks the whole evaluation. Accepted extraction also marks it. New values become LLM-sourced, every proposed action becomes `llmSourced`, and the core generates a pending confirmation for each newly hidden value. Where multiple sources contribute, the lexically first complete `llm:provider/model` attribution is retained; this is deterministic and conservative, not a claim that only that model contributed. The audit and input records retain other source attribution. Demo marks propagate through event and state reads.

Confirmation IDs include record identity, current value version and proposed value. A rule's and core's identical request collapse to one action. A new record version or different confirmation supersedes pending older requests atomically. Approval checks the stored record version. Candidate selection accepts only an index into stored candidates; editing runs the record type's `parseValue` on the server. Invalid choices change nothing. Human approval, a pick or an edit makes the value human-sourced and confirmed, so later polling cannot replace a person's choice. Rejection preserves a previously human-confirmed value when the rejected request was a proposed replacement. A context-only correction does not reopen a completed confirmation.

_Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13, 14.1, 14.2, 14.3, 14.4, 14.5, 24.1, 24.2, 24.3, 24.4_

## Optional advice and untrusted output

The runtime injects `AdvisorClient.complete(prompt, parse)`. No client or `advisorOff` results in deterministic fallback; provider failures also fall back. The adapter owns timeout, free-only caps and transport. Core audit entries hold provider, model, prompt hash and fallback reason, never the prompt or credentials.

Extract output is an array of `{value, quote}`. The app's deterministic verifier must reproduce each value from its quote and event. Rejected evidence gets an audit entry. Accepted provider data enters `event.extracted` with provider/model; deterministic fallback values carry `deterministic: true` and do not receive an LLM mark. Extraction is reused across CAS retries.

Reword output is exactly one `{index, text}` per proposed action in the same order. Additional keys, count changes or nonmatching indices reject the whole result. Only the display suggestion changes; payload, kind, target and safety remain the deterministic proposal. Reworded safe actions remain safe because the executable effect is unchanged. A changed rule result invalidates cached rewording and is recomputed; this can require a new provider call when inputs actually change. Invalid reword output leaves deterministic wording in place. Raw provider output may be retained in the suggestion for inspection; the adapter must remove secrets from its reply and diagnostics.

`html` uses a private WeakMap brand so only values created by that tagged template bypass escaping. Arrays recurse; nested templates compose. Plain objects with a crafted `toString()` are escaped. It escapes &, <, >, double quotes and apostrophes. URL scheme validation belongs to the UI/app; HTML escaping alone cannot make a `javascript:` URL safe.

_Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 23.1, 23.2, 23.3_

## Approval, execution and recovery

Approval is the default. A safe kind needs a nonempty explanation; LLM-tainted output always remains proposed. Decisions only apply to proposed actions, except explicit retry of dead actions. Built-in confirmation completes within the same conditional state write and records approved, executing and succeeded entries.

An action kind may declare `effect: 'external'` so runtime authorization can distinguish a live write from local patches or dry-run output. This metadata does not grant approval or alter the core state machine.

Execution claims an action by CAS, increments its allowance attempt and lifetime attempt counters, and sets a lease. Timeout defaults to thirty seconds; lease margin is five seconds. The executor receives an AbortSignal and deterministic idempotency key. Results publish only while the same lifetime attempt still owns the executing action. Late completions receive diagnostic audit entries without changing state. An expired final attempt becomes dead with an unknown outcome, requiring review.

Unknown-outcome retries run `lookup` first when supplied. A found result completes without execute; failed lookup withholds execute. With no lookup, the audit explicitly says it is unavailable. An action author must implement cooperative cancellation and external idempotency or uncertainty handling: an AbortSignal cannot forcibly stop arbitrary app code, and a lookup's negative result is not universal proof that a delayed remote request cannot still apply. Live issue code must hold an uncertain outcome rather than blindly retry if its provider cannot resolve that uncertainty.

Default retries allow five attempts, with full jitter from zero to `min(60s, 1s * 2^(attempt-1))`. Retry-After is an additional lower bound; it can exceed the jitter cap. `ExecutionError` exposes retryable, retryAfterMs and unknownOutcome. Other exceptions are retryable by default. Nonretryable failures and exhausted allowance go dead. Manual retry resets the allowance counter and preserves lifetime attempts and unknown-outcome status, with an audit entry. This resolves the conflict between a bounded allowance and an explicit operator-requested retry.

_Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 16.1, 16.2, 16.3, 16.4, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

## Audit and persistence evidence

HMAC-SHA-256 covers the canonical entry including previous hash and sequence; the key is mandatory and supplied by the runtime, never stored in a snapshot. Verification checks sequence, links and constant-time comparison of fixed-size digests. An optional independently retained `{seq, hash}` head detects tail truncation. Without that checkpoint, a valid prefix is indistinguishable from a shorter original chain: verification says so explicitly rather than claiming that HMAC alone detects deletion of the tail. A key holder can rewrite the chain, and a valid chain does not prove an external effect happened.

The Node FileStore appends full-snapshot JSONL transactions while holding an exclusive `wx` lock. It fsyncs each row before returning. Readers ignore only a non-newline-terminated tail and never repair state. The next writer truncates that tail under lock. Invalid complete rows fail closed. A snapshot cache is written to a new file and atomically renamed, but reads replay the journal, so cache loss/corruption cannot lose committed state. Full-state rows are intentionally simple for small demos; storage grows with both history and state size. Compaction and multi-machine/network filesystems are unsupported.

An old lock is reclaimed only when it names this host and its process is demonstrably dead. A live PID, unknown owner, malformed lock or foreign host is never stolen merely because of age. An exclusive recovery lock serializes stale-lock removers. A crash during recovery can leave `recovery.lock`; bounded waits fail visibly and an owner must inspect/remove that orphan. This conservative limitation avoids deleting a live lock. FileStore tests include concurrent handles and separate real Node processes.

_Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 22.9, 22.10, 22.11_

## Correctness properties and validation

- P1: generated duplicate permutations plus concurrent handles create one complete event/action per identity. File and memory stores run the same CAS and atomic-audit contract cases; the additional shared FileStore/DynamoStore suite exercises persistent generated intake and rule ordering.
- P2: concurrent ticks claim once; timeout lookup reuses a recorded effect; failed lookup withholds a second write; stale attempt completion cannot replace the current result.
- P3/P4: generated registration permutations produce fixed priority/id traces and stop before later rules.
- P5: generated approve/reject/tick command sequences match a small state model; examples cover stale confirmation, invalid edits/picks, human preservation, extract provenance and tainted safe output. This is bounded model testing, not an exhaustive proof.
- P6: generated chains fail after edits, interior removal, reordering and tail deletion against a retained head.
- P7: generated jitter stays bounded; Retry-After is honored separately; concrete attempt exhaustion and manual retry retain the lifetime counter.

Core tests live in `skeleton/test/core.test.ts` and `skeleton/test/store.test.ts`. `tests/store-contract.test.ts` runs the same five contracts against FileStore and the actual SDK talking to DynamoDB Local: duplicate intake and approved execution; generated intake/order/stop cases; forced CAS collision with metadata and audit preservation; persisted lease takeover with lookup and late-result rejection; and stale-CAS atomicity. On 17 Nov 2026 all ten tests passed against DynamoDB Local 3.3.2 at loopback, with twenty generated cases per backend. `WRAITH_PBT_RUNS` overrides that default; each case creates and removes its own journal or table. An unset endpoint skips the DynamoDB suite, never substitutes MemoryStore. This establishes local service behavior, not AWS deployment, IAM behavior, browser flows or live provider execution. Core code is counted by `scripts/core-budget.mjs`; runtime implementations remain outside the zero-dependency core.

## Primary API references

Consulted on 17 Nov 2026: [Node crypto](https://nodejs.org/api/crypto.html) for createHash/createHmac and timingSafeEqual; [Node fs](https://nodejs.org/api/fs.html) for exclusive open, FileHandle.sync/truncate, rename and unlink. AbortController and fetch use the Node runtime globals; no vendor client lives in the core. The installed fast-check API is used through `fc.assert`, `fc.asyncProperty`, arrays, shuffled subarrays and scalar arbitraries, following the existing repository's test integration.
