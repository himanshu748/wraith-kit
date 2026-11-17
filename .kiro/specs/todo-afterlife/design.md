# Design: todo-afterlife

Authored by Codex on 17 Nov 2026 after the author requested implementation. This is not a Kiro IDE Correctness run. The application uses the shared skeleton package and no copied engine.

## 1. Signed intake

The GitHub source validates a bounded raw body against X-Hub-Signature-256 with timingSafeEqual before parsing. It accepts only push deliveries for the configured repository and requires the delivery header. Core accept persists before the HTTP route replies; expansion is separate.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

## 2. GitHub expansion

Fetch labelled open issues before comparing before...after commits. The shared source emits tracked-issues first. GitHub compare returns at most 300 changed files; reaching the bound and every missing patch generate scan-status events. New/deleted branches have no supported baseline and generate an explicit incomplete result. List operations stop at ten 100-item pages and fail instead of silently truncating.

_Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

## 3. Comment identity

Scan added unified-diff lines after documented comment introducers. Identity is SHA-256 of repository, path, normalised comment text and ordinal among identical comments in that file. Line movement preserves keys; insertion of an identical occurrence may shift ordinals. This is a text scanner, not an AST parser; comment-like strings need review.

_Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## 4. Pure ordered rules

Five independent classifiers run in ascending priority: vague phrase, short, owner, anchor, retirement. Marker text is removed before classification. A final rule proposes outcomes, reads tracked issues through state, and reports when issue context is unavailable. Defaults are 18 body characters and the phrase list in comments.ts.

_Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

## 5. Approved patch and issue outcomes

Rewrite and retirement return downloadable unified patches containing the original line, never mutate a checkout. The README requires git apply --check to reject stale context before applying. Open-issue exposes the repository, complete title/body and dry-run state in its preview. A successful issue produces a follow-up patch containing its number.

_Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

## 6. Fallback and wording advice

Deterministic wording includes source context and an acceptance condition. Configured owner takes precedence; webhook sender login is the available fallback. CLI cannot borrow a webhook identity. Unknown ownership is labelled incomplete. Optional reword output only updates displayed suggestion text through the core; it does not mutate action targets or payloads. CLI advice is always skipped.

_Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

## 7. Live issue boundary

Token plus explicit liveIssues enables writes. The runtime injects a durable compare-and-swap daily quota callback; without it a write fails closed. Default cap is 20 per UTC day. Every create first looks for its idempotency marker in all labelled issues, including closed ones. Network/5xx write failures are marked unknown-outcome; retry lookup refuses blind creation when absent. This is bounded recovery, not an exactly-once guarantee against GitHub.

_Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

## 8. Local pre-commit entry

precommit.ts reads git diff --cached with a time and size bound, disables network and advice, and ingests into the same FileStore using the separate audit key. It never ticks executors. Failure prints a warning and exits zero. Only an opt-in completed vague scan returns 2. The optional ordinary Git hook does not overwrite existing hooks. The root Kiro hook wrapper is integrated separately.

_Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

## 9. Evidence and packaging

The app package references the skeleton workspace public export. Tests run real Engine ingestion and decisions with MemoryStore and fake HTTP, including generated diff/classifier/rewrite properties. Live GitHub creation and cloud deployment are deliberately unverified. The app README documents setup, expected local results and the parser limitations.

_Validates: Requirements 9.1, 9.2, 9.3, 9.4_

## Primary documentation checked

- [GitHub webhook signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [compare commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits), and [issues](https://docs.github.com/en/rest/issues/issues#create-an-issue), read 17 Nov 2026. API version 2026-03-10, Contents read for compare and Issues write for creation.
- Node crypto and fetch use the shared runtime APIs. No GitHub SDK or external template is used.

## Correctness properties

TA-P1 validates added-line extraction; TA-P2 case/whitespace and marker exclusion; TA-P3 complete/incomplete-owner fallback. These run in app.test.ts with fast-check. Unit and integration cases exercise signatures, missing patches, replay and approval, lookup, quota refusal and bounded pagination.
