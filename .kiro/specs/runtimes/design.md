# Design: runtimes

The Node and Lambda runtimes share a pure Request/Response handler, Engine and Store contract. This design was authored by Codex on 17 Nov 2026 after implementation approval. It deliberately chooses a single global revision for a small app, trading write throughput for a simple, testable atomic boundary. It is not a claim of cloud deployment or of completing Kiro IDE workflows.

## Stores and atomicity

The FileStore appends full JSON snapshots to journal.jsonl under an exclusive, owner-tagged process lock. Only complete lines are replayed; a writer truncates a torn tail under the lock. Snapshot.json is dispensable, atomically renamed cache. Recovery only takes a demonstrably dead same-host lock and refuses ambiguous ownership. A recovery lock orphan requires manual inspection. Network shares and multiple machines are unsupported.

The DynamoStore conditions a HEAD revision and writes state chunks plus new audit entries in one TransactWrite. State chunks use 180,000 raw bytes per item, keeping base64 and attributes below 400 KiB. The active state limit is 1.5 MB; transactions fail before writing if they exceed 100 operations. Audit items are immutable conditional puts; old surplus state chunks are ignored. Strong reads compare HEAD before and after reading chunks/audit and retry on change. The API reports global revision contention, not individual domain conditions: conditions have already been evaluated by the Engine against that exact revision. This is a conscious simplification of requirements 2.1/5.4/5.7. Capacity failures propagate and remain retryable by the next runtime tick.

The shared contract suite runs FileStore and real DynamoDB Local, not an SDK mock. It exercises generated duplicate intake/rule order, forced concurrent CAS loss, audit appends, lease takeover and a late result. File-specific tests cover torn writes, locking and cache recovery. A journal replays all history; there is no compactor and this is a small-demo store, not a large workload database.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

## Local journey and private state

Each app owns .wraith/<app>/ by default; generated artifacts are materialized below its out/ directory and served from the same durable action result. Local HTTP binds 127.0.0.1 and rejects untrusted Host headers. A random one-time login URL goes to an owner-only config file outside the repo, then the default browser opens it. WRAITH_OPEN_BROWSER=0 keeps automated tests headless. The URL/token is never printed. HMAC audit/session/webhook keys live in an owner-only user config directory; an insecure existing key file is rejected.

A signed, expiring HttpOnly SameSite=Strict cookie uses a server-side hashed session registry, allowing logout revocation. Every POST form checks a session-bound CSRF value and Origin. Referrer-Policy strict-origin prevents private URL paths/queries from being forwarded and preserves same-origin browser form Origin headers. Hosted cookies add Secure. Access-code attempts have a durable 60/hour cap. Local private views require sign-in. Hosted anonymous and demo-code sessions see only demo actions; real actions require the admin role. External-effect metadata comes from the registered executor, never from a generated suggestion.

The Node scheduler coalesces overlapping ticks. Webhooks persist acceptance before asynchronous expansion; failures remain stored for a later tick. Default demo replay directly ingests deterministic fixture events. Signed --webhook replay exercises actual GitHub expansion and therefore needs configured GitHub read access. A separate Notice fixture server permits actual HTTP polling without an external site.

_Validates: Requirements 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

## AWS packaging and operational limits

Both app templates use Node 22 arm64 Lambda Function URLs, provisioned DynamoDB 5 RCU/5 WCU per table, Scheduler every 5 minutes, seven-day logs, optional reserved concurrency default 2 and SSM SecureString secret lookup. Each bundle is built from shared source and checked through esbuild metafiles. The handler converts Function URL payload 2.0/cookies, and a task=tick Lambda event uses the scheduler path. Webhook acceptance attempts an asynchronous self-invoke and leaves failed scheduling to the next tick.

Every public request reserves an atomic UTC-day counter before serving; default 10,000 per stack. Excess requests receive429. Counter errors fail closed. This cap does not prevent Lambda invocations or counter operations from being metered; it cannot promise a zero bill on a paid account. Free-plan eligibility, remaining allowance, region and reserved-concurrency limits must be checked by the owner before deployment. No account API or deployment is run by this build. See docs/aws-deployment.md for exact conditional commands and account gates. Templates pass offline cfn-lint; local DynamoDB success is not hosted AWS validation.

_Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12, 10.13, 10.14, 11.1, 11.2, 11.3, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.3, 15.1, 15.2, 15.3_

## Primary references and evidence

- [Node filesystem](https://nodejs.org/api/fs.html), [HTTP](https://nodejs.org/api/http.html), [crypto](https://nodejs.org/api/crypto.html).
- [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), read through the pinned aws-docs MCP server on 17 Nov 2026; [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html).
- [Function URL payload 2.0](https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html), [SAM FunctionUrlConfig](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-functionurlconfig.html), [Scheduler CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-scheduler-schedule.html).
- [esbuild metafiles](https://esbuild.github.io/api/#metafile), [AWS account plans](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html).

See [verification](../../../docs/verification.md) and the source/test files for measured results.

## Remaining limits

Cloud deployment, account-specific free allowance and live webhook expansion remain unverified and require separate authorization. An automatic demo reset is deliberately disabled; explicit Engine.resetDemo preserves real records and the audit chain.
