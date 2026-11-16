# Requirements: runtimes

## Introduction

`runtimes` covers the two ways to run a Wraith Kit app: locally with Node (the skeleton's `node` entry: an HTTP server, a JSON-lines file store and an interval scheduler) and on the AWS free tier (the `aws` entry: a Lambda Function URL handler, a scheduled tick handler and a DynamoDB store, deployed with one SAM template per app). Both runtimes give the core the same store behaviour, and one store contract suite checks both.

**Status.** Requirements written on 16 Nov 2026 in Kiro CLI (driven by T3 Code), by hand in the format Kiro documents for feature specs ([Feature Specs](https://kiro.dev/docs/specs/feature-specs), EARS acceptance criteria). design.md and tasks.md are written in the CLI after `wraith-core`'s design exists, so that the store interface matches it (PLAN.md section 12). Nothing here is deployed: a deploy happens only on the author's go.

**In scope.** The `node` and `aws` entries; the file store (lock, log, torn-line rule, snapshot); the DynamoDB store (transactions, conditional puts, merged item changes); where aggregate output lives; the local server's address and one-time login link; where the audit key and other secrets live; the local run commands; the two SAM templates and their stacks (`todo-afterlife` and `notice-ghoul-demo`); the asynchronous self-invocation with the tick as backstop; the per-stack daily request cap; the Budgets alert and the Free plan coverage check; the Lambda bundle check.

**Out of scope.** Pipeline behaviour (`wraith-core`); session cookies, CSRF and screens (`approval-ui`, which uses the login link and secrets this spec places); LLM providers (`llm-adapter`); the daily issue cap, the sandbox repo token and the webhook signature check (`todo-afterlife`); the fixture site's content (`notice-ghoul`); the MCP server (`wraith-mcp`).

**Sources in PLAN.md.** Section 5.1 (runtime entry points table, where aggregate output lives), 5.3 (file store and DynamoDB store, audit key placement), 5.4 (local server binding, one-time login link, AWS secrets), 8 item 4 (the Lambda bundle check), 9.3 (the store contract suite) and 11 (local run, AWS free tier, hosted demo, steps that need the author's go). Section 17.1 records the author's answers that shape it: two stacks, real issues on `todo-afterlife`, the required per-stack daily request cap, Region us-east-1 by default.

**Dependencies.** `wraith-core` (the store behaviour in wraith-core 25.1 to 25.4, the tick in wraith-core 21.1 to 21.6, and the audit chain in wraith-core 22.1 to 22.11). `approval-ui` and `llm-adapter` run inside these runtimes.

## Glossary

- **Node runtime:** the skeleton's `node` entry: a `node:http` server, the file store and an interval scheduler.
- **AWS runtime:** the skeleton's `aws` entry: a Lambda Function URL handler, a scheduled tick handler and the DynamoDB store.
- **File store:** the local store: a JSON-lines log, a lock file and an optional snapshot file under `.wraith/`.
- **Log:** the file store's append-only JSON-lines file; one line holds one store write.
- **Torn line:** a last line of the log that a crash left incomplete.
- **Snapshot file:** a cache of the state the log describes, rebuilt from the log when needed.
- **Stale-lock timeout:** the age after which a lock file left by a dead process may be taken over.
- **DynamoDB store:** the AWS store: one DynamoDB table per stack, written with transactions and conditional writes.
- **Store write:** one atomic write of one or more items (`wraith-core` glossary).
- **Store contract suite:** `tests/store-contract.test.ts`, one test suite run against both stores.
- **SAM templates:** `apps/todo-afterlife/template.yaml` and `apps/notice-ghoul/template.yaml`, one per app.
- **Stack:** one deployed SAM template: `todo-afterlife` or `notice-ghoul-demo`.
- **Tick:** the scheduled run that drives background work (`wraith-core` Requirement 21).
- **Daily request cap:** the most Function URL requests a stack serves in one day before it replies 429.
- **Bundle check:** the check that every skeleton input of a Lambda bundle comes from `/skeleton/src`.
- **Local run docs:** `docs/run-local.md`. **Deploy docs:** `docs/deploy-aws.md`.
- **Runtimes tooling:** the scripts, hooks and tests this spec adds.
- **Author:** the person who owns this repo and the AWS account; nothing is deployed without the author's go.

## Requirements

### Requirement 1: Runtime entry points

**User story:** As an app author, I want the local and AWS runtimes as separate package entries, so that the core stays small and an app loads only the runtime it uses.

#### Acceptance criteria

1. THE Node runtime SHALL be exported as the skeleton package's `node` entry, separate from the `core` entry.
2. THE AWS runtime SHALL be exported as the skeleton package's `aws` entry, separate from the `core` entry.
3. THE Node runtime SHALL provide a `node:http` server, the file store and an interval scheduler that runs the tick.
4. THE AWS runtime SHALL provide a Lambda Function URL handler, a scheduled tick handler and the DynamoDB store.
5. THE Node runtime and the AWS runtime SHALL leave every pipeline decision (dedupe, rules, approval, state changes) to the Wraith core.
6. THE AWS runtime SHALL keep its npm dependencies (the AWS SDK for JavaScript v3 clients) inside the `aws` entry, so that `core` and `node` do not load them.

### Requirement 2: One store contract for both stores

**User story:** As a skeleton maintainer, I want one contract suite to run against both stores, so that an app behaves the same locally and on AWS.

#### Acceptance criteria

1. THE file store and the DynamoDB store SHALL each provide the store behaviour in wraith-core 25.1 to 25.4: an all-or-nothing write of several items, a conditional insert, a conditional update and a report of which item's condition failed.
2. THE store contract suite SHALL run the same cases against the file store and the DynamoDB store: P1, P2 and P6, the lease-expiry case, the combined state-plus-audit write, and the one-write-per-event case with a crash at any point.
3. WHEN the store contract suite runs against the DynamoDB store, THE store contract suite SHALL use a real DynamoDB-compatible server (DynamoDB Local in Docker, or an approved alternative) and never a mocked client.
4. THE store contract suite SHALL include intake and audit appends interleaved from two store handles on one file store.

### Requirement 3: File store locking

**User story:** As a developer running the local server and the TODO Afterlife hook side by side, I want the file store safe for several processes on one machine, so that two processes never corrupt or fork the store.

#### Acceptance criteria

1. THE file store SHALL take a lock before every store write by creating a lock file with exclusive create (the Node.js `fs` `wx` flag).
2. IF the lock file exists and is older than the stale-lock timeout, THEN THE file store SHALL treat the lock as stale and take it over.
3. IF the lock cannot be taken within the caller's bounded wait, THEN THE file store SHALL write nothing and report a lock timeout to the caller.
4. WHEN a store write ends, with success or with an error, THE file store SHALL release the lock.
5. THE file store SHALL check every condition of a store write while it holds the lock, against the log as it stands at that moment.
6. THE file store SHALL support several processes on one machine that use the same `.wraith/` folder.

### Requirement 4: File store log and snapshot

**User story:** As a developer, I want the local log to survive a crash in the middle of a write, so that no later entry is lost and the audit chain still verifies.

#### Acceptance criteria

1. THE file store SHALL append each store write to the log as one JSON line while it holds the lock.
2. WHEN the file store reads the log, THE file store SHALL ignore a torn last line.
3. WHEN a writer holds the lock and the log ends with a torn line, THE file store SHALL truncate the log to the end of the last complete line before it appends.
4. THE file store SHALL treat the snapshot file only as a cache that it can rebuild from the log.
5. IF the snapshot file is missing, unreadable or behind the log, THEN THE file store SHALL rebuild the state from the log.
6. THE file store SHALL replace the snapshot file only by writing a new file and renaming it over the old one.
7. THE file store SHALL keep its log, lock file and snapshot file under a `.wraith/` folder, which `.gitignore` covers.
8. THE local run docs SHALL state that using the file store from several machines (for example over a network share) is unsupported.

### Requirement 5: DynamoDB store

**User story:** As the author running the hosted demo, I want the DynamoDB store to make each state change and its audit entry one transaction, so that the hosted stacks keep the same guarantees as the local run.

#### Acceptance criteria

1. THE DynamoDB store SHALL write every state change together with its audit entry in one `TransactWriteItems` call.
2. THE DynamoDB store SHALL write each event's store write (wraith-core 7.1) in one `TransactWriteItems` call.
3. THE DynamoDB store SHALL make a conditional insert a put with an `attribute_not_exists` condition on the item's key.
4. THE DynamoDB store SHALL make a conditional update an update with a condition on the expected status, version or attempt count.
5. THE DynamoDB store SHALL merge all changes to one item within one store write into one operation, because one transaction cannot target the same item with more than one operation.
6. THE DynamoDB store SHALL write audit entry `seq` N+1 with a conditional put that fails if entry N+1 already exists.
7. WHEN a transaction is cancelled, THE DynamoDB store SHALL report to the core which item's condition failed, taken from the cancellation reasons.
8. IF a transaction fails for lack of capacity, THEN THE DynamoDB store SHALL report a retryable failure to the core.
9. WHERE an aggregate output is larger than the DynamoDB item size limit, THE DynamoDB store SHALL split it across several items.

### Requirement 6: Where aggregate output lives

**User story:** As a student using Notice Ghoul, I want the digest and calendar file available locally and on the hosted demo, so that I can open them from either place.

#### Acceptance criteria

1. THE Node runtime SHALL write aggregate output as files under `.wraith/out/` and serve them from the local server.
2. THE AWS runtime SHALL store aggregate output as DynamoDB items and render it on request at fixed paths of the app's Function URL that the app declares.

### Requirement 7: Local server address and one-time login link

**User story:** As a developer, I want the local approval UI reachable only from my machine and its login link kept out of terminal output, so that the Kiro agent that starts the server never sees the link in its context.

#### Acceptance criteria

1. THE Node runtime SHALL bind its HTTP server to 127.0.0.1 only.
2. WHEN the local server starts, THE Node runtime SHALL create a one-time login link that carries a random token.
3. THE Node runtime SHALL write the one-time login link to a file outside the repo that only the owner can read and write.
4. WHEN the login link file has been written, THE Node runtime SHALL open the link in the default browser.
5. THE Node runtime SHALL never print the login link or its token to stdout or stderr.
6. IF the default browser cannot be opened, THEN THE Node runtime SHALL print only the path of the login link file.
7. WHEN the token of a one-time login link has been exchanged for a session, THE Node runtime SHALL refuse that token on any later use.

### Requirement 8: Audit key and other secrets

**User story:** As a reviewer, I want the audit key and the stack secrets kept outside the store and the repo, so that someone who can write the store still cannot rewrite the audit chain without the key.

#### Acceptance criteria

1. THE Node runtime SHALL read the audit key from a file outside the repo and outside `.wraith/` (proposed: a file in the user's config folder) that only the owner can read and write.
2. WHEN no local audit key file exists, THE Node runtime SHALL create one with a random key and owner-only permissions.
3. IF the local audit key file can be read by other users, THEN THE Node runtime SHALL refuse to start and name the file.
4. THE AWS runtime SHALL read the audit key from SSM Parameter Store, or from a Lambda environment variable where SSM is not usable on the account's plan.
5. THE AWS runtime SHALL read each stack's admin token and demo access code from SSM Parameter Store, or, where SSM is not usable, compare them with a hash held in a DynamoDB item.
6. THE Node runtime and the AWS runtime SHALL never write a secret to the store, an audit entry, a log or a file in the repo.

### Requirement 9: Local run

**User story:** As a judge or a new developer, I want to run each app with one command, demo data and no account, so that I can try both apps without signing up for anything.

#### Acceptance criteria

1. WHEN a person runs an app's local command after `npm install`, THE Node runtime SHALL start the server, the scheduler and the approval UI with the file store and the app's demo data.
2. THE Node runtime SHALL need no cloud account, no API key and no tunnel for the local run, with the LLM provider `none` by default.
3. WHEN the local server has replied to an accepted delivery, THE Node runtime SHALL start its `expand` in the same process.
4. THE Node runtime SHALL provide a replay command that sends signed fixture webhook deliveries to the local server, so that a webhook app needs no public URL.
5. THE Node runtime SHALL provide a command that serves an app's fixture site folder over HTTP on 127.0.0.1.
6. THE local run docs and each app's README SHALL give the exact command for each of these steps.

### Requirement 10: Two stacks from two SAM templates

**User story:** As the author, I want each app deployable as its own small stack inside the AWS free tier, so that judges get working URLs without charges beyond the free allowance.

#### Acceptance criteria

1. THE SAM templates SHALL be one template per app, kept in that app's folder.
2. THE SAM templates SHALL deploy as exactly two stacks, named `todo-afterlife` and `notice-ghoul-demo`.
3. THE deploy docs SHALL use Region us-east-1 for both stacks unless the author chooses another Region.
4. THE SAM templates SHALL give each stack one Lambda function (arm64 proposed; Node.js runtime version to confirm), bundled with esbuild.
5. THE SAM templates SHALL give each function one Function URL with auth type `NONE`, and no API Gateway.
6. THE SAM templates SHALL give each stack one DynamoDB table in the Standard table class, in provisioned capacity mode, with a TTL attribute.
7. THE SAM templates SHALL keep the provisioned capacity of both stacks' tables, indexes included, within 25 RCU and 25 WCU in total (proposed: 5 RCU and 5 WCU per table).
8. THE SAM templates SHALL give each stack one EventBridge Scheduler schedule that runs the tick (proposed rate: every 5 minutes).
9. THE SAM templates SHALL set a short CloudWatch Logs retention for each function.
10. THE SAM templates SHALL configure no Provisioned Concurrency.
11. WHERE the account allows reserved concurrency, THE SAM templates SHALL give each function a small reserved concurrency limit.
12. THE SAM templates SHALL contain no secret value.
13. THE SAM templates SHALL set `WRAITH_LLM_PROVIDER` to `none` on a stack unless the author has said go for Modal on that stack.
14. THE SAM templates SHALL validate with no errors under `cfn-lint`, or `sam validate --lint` once the AWS SAM CLI is installed, run offline.

### Requirement 11: Expand and tick on AWS

**User story:** As the author, I want the webhook reply to stay fast on Lambda while the tick backs up every asynchronous step, so that no accepted delivery is lost when an invocation is throttled.

#### Acceptance criteria

1. WHEN the Function URL handler has stored a new Delivery, THE AWS runtime SHALL start an asynchronous invocation of the same function to expand it, and SHALL then reply.
2. IF the asynchronous invocation fails or is throttled, THEN THE AWS runtime SHALL still reply that the delivery was accepted and leave the Delivery for the tick to expand.
3. WHEN the EventBridge Scheduler schedule invokes the function, THE AWS runtime SHALL run the core's tick.

### Requirement 12: Per-stack daily request cap

**User story:** As the author, I want each public stack to stop serving after a daily number of requests, so that a flood of traffic cannot use up the free allowance or the credits.

#### Acceptance criteria

1. THE AWS runtime SHALL count every request to a stack's Function URL in a per-stack daily counter held in that stack's DynamoDB table.
2. WHEN a request arrives after the counter has reached the stack's daily request cap (proposed: 10,000 requests per stack per day), THE AWS runtime SHALL reply 429 before any other work on that request.
3. THE AWS runtime SHALL apply the daily request cap on both stacks.
4. WHEN a new day starts, THE AWS runtime SHALL count that stack's requests from zero.

### Requirement 13: Budgets alert and Free plan coverage

**User story:** As the author on a Free plan account, I want a warning before charges and a check that every service the stacks use is covered, so that the demo never needs a paid feature.

#### Acceptance criteria

1. WHERE AWS Budgets alerts are available on the account's plan, THE deploy docs SHALL give the steps for a Budgets alert at a low amount that emails the author.
2. THE deploy docs SHALL tell the author that when the Budgets alert fires, the `notice-ghoul-demo` stack is the first to take down and the local run stays available.
3. THE deploy docs SHALL record, for Lambda Function URLs, DynamoDB, EventBridge Scheduler, SSM Parameter Store and CloudWatch Logs, whether each is usable on the Free plan, as confirmed through the `aws-docs` MCP server, with the page cited.
4. IF a service the stacks use is not usable on the Free plan, THEN THE deploy docs SHALL name the documented free alternative the stacks use instead, and never a paid feature.

### Requirement 14: Deploy only on the author's go

**User story:** As the author, I want every deploy to be a command I run or approve, so that nothing reaches my AWS account without my say.

#### Acceptance criteria

1. THE runtimes tooling SHALL never run a deploy, create a stack or call an AWS API with the author's account.
2. THE deploy docs SHALL give the exact deploy commands (`sam deploy --guided`), to be run only on the author's go.
3. THE deploy docs SHALL give the exact AWS SAM CLI install command from AWS docs, to be run only with the author's OK.

### Requirement 15: Lambda bundle check

**User story:** As a reviewer of the Skeleton Crew claim, I want proof that each Lambda bundle uses the skeleton's own sources, so that a deployed app cannot run a copied or patched core.

#### Acceptance criteria

1. WHEN a Lambda bundle is built, THE bundle check SHALL list every skeleton input of that bundle (for example from an esbuild metafile).
2. IF a skeleton input of a bundle is not a file under `/skeleton/src`, THEN THE bundle check SHALL fail and name that input.
3. THE bundle check SHALL run together with the core-integrity test in `npm test`.

## Notes for the design phase

### Open design questions that PLAN.md leaves to this spec

1. **Lock file mechanism and stale-lock timeout.** PLAN.md 5.3: "The file store uses a lock file created with exclusive create (Node `fs` `wx` flag) with a stale-lock timeout, plus atomic rename for snapshot writes. The exact mechanism is set in the `runtimes` spec." To settle: how a lock's age is measured (file time or a time and process id written into the lock file); what stops two processes that both see a stale lock from both taking it over; the timeout value, which must be longer than any store write but must not hold the lock across an `execute` call; and how it relates to the TODO Afterlife hook's bounded lock wait (proposed 5 s, PLAN.md section 6). Criteria: 3.1 to 3.4.
2. **Snapshot format.** PLAN.md 5.3: "Any snapshot file is only a cache rebuilt from that log (format set in the `runtimes` spec)." To settle: the format, and how "behind the log" (4.5) is detected, for example by storing the log offset or the last `seq` in the snapshot. Criteria: 4.4 to 4.6.
3. **Login link mechanism.** PLAN.md 5.4: "exact mechanism set in the `runtimes` spec". To settle: the file's location, how the browser is opened on each operating system, and the token's lifetime. Criteria: 7.2 to 7.7.
4. **Counter sizing against table capacity.** PLAN.md 11.2: "Each counted request is one more write, so the spec sizes the counter against the table's capacity." To settle: the cost of one counter update, how the counter shares the proposed 5 WCU per table with transactions (about 4 WCUs for a state change with its audit entry, PLAN.md 5.3), what the stack replies when a counter update is throttled (reply 429 and fail closed, or serve and fail open), and which time zone starts a new day (12.4). Criteria: 10.7, 12.1 to 12.4.
5. **Daily request cap.** The plan reviews' list of remaining issues (task `task-wraith-kit-plan`, in task notes kept outside this repo) asked for "a per-stack daily request cap if the AWS Budgets alert is unavailable (runtimes)". Since the author's answer on 16 Nov 2026 (PLAN.md 17.1, answer 4), the cap is required on both stacks whether or not the Budgets alert is available. Criteria: 12.2, 12.3, 13.1.
6. **"Unchanged since the snapshot" and the 100-item limit.** Shared with `wraith-core` (its Notes, items 2 and 3): "how 'unchanged since the snapshot' is checked for one-write-per-event and a cap keeping one event's write under the 100-item TransactWriteItems limit (wraith-core/runtimes)". The DynamoDB store must express that check as a condition. Criteria: 2.1, 5.2, 5.4.
7. **The store contract suite on DynamoDB.** P1, P2 and P6 run against both stores (PLAN.md 9.3). DynamoDB Local runs in Docker (Docker is installed); its image, license, and support for conditional writes and `TransactWriteItems` are to confirm in AWS docs. The "Local AWS Emulator" power replaces it only if the author approves it (PLAN.md 10.7). Criteria: 2.2, 2.3.

### Other questions found while writing these requirements

- Where `.wraith/` lives when both apps run locally, and how the TODO Afterlife hook finds the same store as the local server.
- What happens to an existing local audit chain when the key file is lost and 8.2 creates a new key (the old chain no longer verifies).
- Which items carry the TTL attribute (10.6), for example counter items and expired sessions, and never audit entries.
- The CloudWatch Logs retention value (10.9) and the reserved concurrency limit (10.11), if the account allows it.
- How the asynchronous self-invocation is told apart from a Function URL request, so that it is not counted (12.1) and cannot loop.
- Cut 3 in PLAN.md section 12 drops the asynchronous self-invocation; the fallback is tick-only `expand`, with the reply unchanged and work starting up to one tick later. Criterion 11.2 already covers that path.

### Properties from PLAN.md section 9.1 and the criteria they check

| Property | Criteria |
|---|---|
| P1 Idempotent and complete intake | 2.1, 2.2, 2.4, 3.1 to 3.6, 4.1 to 4.3, 5.1 to 5.3, 5.5, 5.7, 11.1, 11.2 |
| P2 Idempotent execution | 2.1, 2.2, 5.4, 5.7 |
| P6 Audit chain | 2.2, 2.4, 4.1 to 4.3, 5.6 |

The other criteria get unit, integration or template tests: `cfn-lint` for 10.1 to 10.14, the bundle check for 15.1 to 15.3, and tests of the login link and key files for 7.1 to 8.3.

### Docs still to confirm (cite in design.md)

- AWS, through the `aws-docs` MCP server: `TransactWriteItems` limits (quoted in PLAN.md 5.3 from [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), read 16 Nov 2026) and its cancellation reasons; `attribute_not_exists` condition syntax; the item size limit; TTL; Lambda Node.js runtime versions and arm64; Function URL auth type `NONE` and Function URL pricing; the asynchronous invocation type and the IAM permission to invoke the function itself; EventBridge Scheduler in SAM; SSM Parameter Store standard parameters (free tier, and how Lambda reads them); CloudWatch Logs retention values; reserved concurrency on a new account; whether the DynamoDB free allowance counts per account or per Region; AWS Budgets pricing and Free plan coverage; the AWS SAM CLI install command; DynamoDB Local image and license.
- Node.js: the `fs` `wx` flag, `fs.rename` replacing a file on the same file system, file modes for owner-only files, and `fs.truncate`.
- esbuild: the metafile format (15.1).
- How to open the default browser from Node on macOS, Linux and Windows (7.4).
- Kiro: Analyze Requirements (`/spec analyze_requirements runtimes`, per [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements)) has not been run on this file yet; it needs a Kiro session started in `wraith-kit/`.
