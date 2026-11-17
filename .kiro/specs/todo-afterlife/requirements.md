# Requirements: todo-afterlife

## Introduction

TODO Afterlife turns vague code comments into reviewable tasks. It is built only from Wraith Kit extension points: a GitHub push source and a local staged-diff source, deterministic rules, an optional reword advisor, and approved patch or issue actions. No app-specific pipeline is forked from the skeleton.

**Status.** Requirements authored on 17 Nov 2026 by Codex through T3 Code, continuing the Kiro-authored plan. No application code or live GitHub integration exists yet. Design and tasks follow the `wraith-core` design, reserved for the Kiro IDE step. Sources: PLAN.md sections 6, 8, 9.2 and 17.1. Core persistence, leases, approvals and audit belong to `wraith-core`; sessions belong to `approval-ui`.

## Glossary

- **Delivery:** one authenticated push notification, identified by `X-GitHub-Delivery`.
- **Occurrence:** one TODO, FIXME, HACK or XXX comment on an added or changed diff line.
- **Tracked issues:** open repository issues with the `wraith-kit` label, normalised into a record before TODO events run.
- **Rewrite:** a downloadable patch, never an automatic commit or push.
- **Sandbox:** the one configured repository permitted for issue creation, default `himanshu748/wraith-kit-sandbox`.
- **Owner:** a configured GitHub login, otherwise an available push-author login; never an invented identity.

## Requirements

### Requirement 1: Authenticated, durable push intake

**User story:** As a repository owner, I want authenticated push intake with durable acknowledgement, so that forged or repeated webhooks cannot produce work.

#### Acceptance criteria

1. WHEN a webhook arrives, THE source SHALL verify `X-Hub-Signature-256` against the raw body and configured secret before parsing JSON.
2. IF the signature is missing or invalid, THEN THE source SHALL reject the request without persisting an event or calling GitHub.
3. THE source SHALL check the event type and process only supported push deliveries.
4. THE source SHALL deduplicate accepted deliveries using `X-GitHub-Delivery` within the app namespace.
5. WHEN a supported delivery has been persisted by the core, THE source SHALL return HTTP 202 before any outbound API call.
6. IF the delivery cannot be persisted, THEN THE source SHALL return a failure instead of acknowledging work it could lose.

### Requirement 2: Bounded expansion and complete context

**User story:** As a developer, I want TODO findings based on actual patches and current tracked issues, so that a file list is not mistaken for a diff.

#### Acceptance criteria

1. THE source's `expand` extension SHALL fetch patches for the push and the tracked-issue list with bounded requests, timeouts and pagination.
2. THE expansion SHALL emit a `tracked-issues` event before the occurrence events, keyed by a hash of the normalised issue list.
3. WHEN a tracked-issues event runs, THE app's rule SHALL upsert its list through the core's record interface.
4. IF a patch is missing, truncated or outside a documented provider limit, THEN THE expansion SHALL record an incomplete-scan reason instead of reporting that the file contains no TODOs.
5. WHERE demo mode is enabled, THE source SHALL use recorded fixture responses marked as demo data.
6. THE source SHALL scope every request to the configured repository and treat webhook strings as data, never executable commands or arbitrary fetch URLs.

### Requirement 3: Occurrence extraction and identity

**User story:** As a developer, I want each changed comment reviewed once, so that duplicate text in a file is not silently lost.

#### Acceptance criteria

1. THE extractor SHALL recognise TODO, FIXME, HACK and XXX markers in the documented supported comment syntaxes on added or changed lines only.
2. THE extractor SHALL retain the repository, path, new line number, marker, comment text and available nearby code context for each occurrence.
3. THE extractor SHALL emit one Event per occurrence, keyed by repository, path, normalised text and a position component that distinguishes identical text in the same file.
4. WHEN the same patch is replayed, THE extractor SHALL produce the same occurrence keys.
5. THE app SHALL document how its chosen position component behaves when code moves and test that behaviour, including duplicate identical comments.
6. IF a binary or unsupported file has no parseable patch, THEN THE extractor SHALL report that limitation without inventing source lines.

### Requirement 4: Ordered deterministic classification

**User story:** As a developer, I want explainable rules for vague comments, so that I can understand each finding without an LLM.

#### Acceptance criteria

1. THE app SHALL register ordered rules for vague phrase, too short, no owner, no anchor and retire candidate, using the core's deterministic ordering.
2. THE vague-phrase rule SHALL match only text after the marker, ignoring case and whitespace differences; `HACK:` alone SHALL not count as the vague phrase `hack`.
3. THE rules SHALL expose configurable phrase lists, including `fix this`, `later`, `temp`, `cleanup`, `hack` and `???` as default vague phrases.
4. THE owner rule SHALL recognise a documented owner form such as `TODO(@name)` or an `@name` in the comment.
5. THE anchor rule SHALL recognise an issue reference, link, date, trigger phrase or `done when` clause.
6. THE retire rule SHALL flag configured speculative phrases and duplicates of tracked issues, reading the tracked-issue record through `ctx.state` without a network call.
7. THE app SHALL preserve the ordered findings and their reasons in the core's explanation for the action.

### Requirement 5: Three approved outcomes

**User story:** As a developer, I want to choose whether to rewrite, track or retire a comment, so that automation never edits my repository without me.

#### Acceptance criteria

1. THE app SHALL propose rewrite, open-issue and retire action kinds, all requiring approval.
2. WHEN a rewrite is approved, THE executor SHALL offer a downloadable patch and SHALL neither commit nor push it.
3. WHEN an open-issue action succeeds, THE app SHALL offer a follow-up rewrite patch that references the created issue number.
4. WHEN a retire action is approved, THE executor SHALL record the reason and offer a deletion patch without changing the repository.
5. THE action preview SHALL show the exact patch or issue title, body and target repository before approval.
6. IF a source line has changed since the proposal, THEN THE patch flow SHALL report the stale context instead of applying a change to an unrelated line.

### Requirement 6: Honest deterministic rewrites and optional advice

**User story:** As a developer without an LLM key, I want useful rewrites with explicit missing information, so that the app remains testable offline.

#### Acceptance criteria

1. THE fallback SHALL build a rewrite from the file, available function context and comment verb, with a `done when` clause.
2. THE fallback SHALL use the configured owner first and an available push-author GitHub login second for webhook events.
3. WHERE the source is `cli`, THE fallback SHALL use only the configured owner.
4. IF no owner is available, THEN THE fallback SHALL label the rewrite `incomplete: no owner set` and name the configuration key to set.
5. WHEN an owner is known, THE fallback rewrite SHALL pass the app's vagueness rules; when no owner is known, THE rewrite SHALL fail only the no-owner rule.
6. WHERE optional reword advice is enabled, THE app SHALL call only the shared server-side LLM adapter and disclose that nearby code lines may be sent to the selected provider.
7. THE advisor SHALL alter wording only, leaving action identity, repository and approval policy under deterministic control.

### Requirement 7: Recoverable, capped issue creation

**User story:** As the sandbox owner, I want approved issue creation to be bounded and recoverable, so that retries do not flood my repository.

#### Acceptance criteria

1. THE issue executor SHALL use a fine-grained token limited to the configured sandbox and the documented minimum permissions.
2. THE executor SHALL apply labels `wraith-kit` and `todo-afterlife` and include a hidden marker derived from the action idempotency key in each issue body.
3. WHEN retrying an uncertain creation, THE executor SHALL first look up the marker among repository issues selected by label, including closed issues and all necessary pages.
4. IF lookup is incomplete or fails, THEN THE executor SHALL not treat that as proof that no issue exists.
5. WHEN lookup finds the marker, THE executor SHALL reuse the existing issue result and create no second issue.
6. THE executor SHALL enforce a persistent daily issue-creation cap across concurrent attempts, proposed default 20, before making a create request.
7. WHERE an issue is created from demo data, THE executor SHALL prefix its title with `[DEMO]` and include a demo-data line in its body.
8. IF no token is configured, THEN THE executor SHALL run dry-run and show the exact issue it would create without making a write request.
9. WHERE real issue creation is enabled, THE UI SHALL disclose the real public effect and that a demo reset cannot undo it.

### Requirement 8: Local pre-commit feedback

**User story:** As a developer, I want local feedback before committing, so that I can improve comments without network access.

#### Acceptance criteria

1. THE Kiro pre-commit hook SHALL run the same app with its `cli` source over `git diff --cached`, write proposals through the local core store and print findings and rewrites.
2. THE hook SHALL disable advice regardless of `WRAITH_LLM_PROVIDER` and make no network calls.
3. THE hook SHALL use the last stored tracked-issue record for retirement suggestions and state when that context is unavailable.
4. IF the hook encounters an internal error, missing build, missing dependencies or a store lock beyond its bounded wait, THEN THE hook SHALL warn and exit zero.
5. THE hook SHALL block only when `WRAITH_TODO_BLOCK=1`, its scan completed and it found vague TODOs.
6. THE app SHALL provide an optional plain Git pre-commit script and document that terminal commits bypass Kiro hooks.

### Requirement 9: Runnable app and evidence

**User story:** As a judge, I want one app README and labelled fixtures, so that I can inspect the full journey without credentials.

#### Acceptance criteria

1. THE app SHALL have its own README covering local startup, owner configuration, replay, hook installation, dry-run, live permissions and AWS deployment prerequisites.
2. THE app SHALL import only skeleton public extension points and pass the shared core-integrity suite.
3. THE tests SHALL exercise signature rejection, repeated delivery, incomplete patches, stale patches, fallback rewriting, issue lookup after an uncertain result, daily cap concurrency and hook failure paths.
4. THE property tests SHALL cover TA-P1 extraction, TA-P2 classification and TA-P3 rewriting with both source types and absent owners.

## Notes for the design phase

- Choose ordinal-among-identical-comments or nearby-context hashing for 3.3; specify movement semantics and a generated duplicate-comment test (3.5). Do not pretend either is a permanent identity across arbitrary edits.
- GitHub's [signature guide](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) confirms raw-payload HMAC validation and the signature header (read 17 Nov 2026). Its [compare documentation](https://docs.github.com/en/rest/commits/commits#compare-two-commits) is the starting point for expansion. Confirm precise limits, pagination, missing patches, new/deleted branches and force-push handling in design before implementation.
- Confirm push-author field availability and issue list/create fields, label permissions and response shapes in GitHub's official docs. Missing author identity must take the explicit incomplete fallback, not a guessed login.
- Choose minimum comment length, accepted syntaxes, anchor grammar, timeout, lock-wait limit and cap reset timezone. The 20/day cap is proposed, not a measured quota or a provider guarantee.
- A marker lookup cannot by itself prove global exactly-once creation during an in-flight request. Design must coordinate the core lease, timeout and uncertain-outcome state; document the limit if GitHub cannot establish a definitive result. No blind retry after an ambiguous write.
- Property mapping: TA-P1 to 3.1-3.2; TA-P2 to 4.1-4.3; TA-P3 to 6.1-6.5. Property IDs describe future tests, not passing evidence.
