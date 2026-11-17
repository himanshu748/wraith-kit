# AWS packaging and deployment handoff

Both SAM templates build and pass offline validation. The store contract has run against real DynamoDB Local. Neither app has been deployed to AWS. These instructions are for the owner to use only after explicitly authorizing deployment and verifying account eligibility. The local version remains the no-cost judge path.

## Account and free-usage gate

Use us-east-1 unless the owner chooses another region. AWS distinguishes a Free account plan from individual service free allowances. A Free plan ends after six months or exhausted credits; a Paid plan can incur charges beyond allowances. Check the actual account, remaining credits, expiry and all other workloads first. Do not upgrade plans or add billing to run this project. [AWS account plans](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html).

| Service | Template choice | Published allowance / remaining check |
|---|---|---|
| Lambda + Function URL | Node 22 arm64, 256 MB, 60 s timeout, no provisioned concurrency | Lambda has monthly request/compute allowances; other functions consume the same account allowance. Function URLs still meter Lambda work. [Pricing](https://aws.amazon.com/lambda/pricing/) |
| DynamoDB | Standard, provisioned 5 RCU/5 WCU each, 10/10 total | Published Standard allowance includes 25 RCU/25 WCU and 25 GB. Include all other tables and storage when checking eligibility. [Pricing](https://aws.amazon.com/dynamodb/pricing/) |
| EventBridge Scheduler | One 5-minute schedule per app | Confirm Scheduler allowance and Free-plan access for the account. Two schedules produce 17,280 ticks in a 30-day month. [Pricing](https://aws.amazon.com/eventbridge/pricing/) |
| SSM Parameter Store | Existing standard SecureString parameters, standard throughput | Standard parameters have no additional storage charge; verify SecureString/KMS operations and account access. No custom KMS key is provisioned. [Pricing](https://aws.amazon.com/systems-manager/pricing/) |
| CloudWatch Logs | Seven-day retention | Published free usage is shared across the account. Do not log payloads/tokens. [Pricing](https://aws.amazon.com/cloudwatch/pricing/) |
| SAM packaging | SAM managed deployment artifacts in S3 | Verify S3 free allowance/credit coverage too. SAM creates or uses a deployment bucket. It is not free merely because Lambda is. |

Account-specific Free-plan service availability and remaining allowance are **not verified**. If any component is unavailable under the owner's free plan, use the local runtime; do not substitute a paid service. The pinned AWS Documentation MCP server was actually used to read DynamoDB's transaction contract on 17 Nov 2026. Public pricing/account docs above were checked separately. That does not establish eligibility of a specific account.

The app's 10,000/day public-request cap limits served work, but even rejected requests invoke Lambda and touch the quota counter. It is **not a spending ceiling or denial-of-service cost shield**. Low concurrency and no runtime LLM reduce normal demo use; they do not make public hosting risk-free. If AWS Budgets is available without charges on this plan, create a monthly cost budget with a low owner-selected alert and the owner's email. Do not create it automatically. If an alert fires, take down `notice-ghoul-demo` first and retain the local judge path. Check [Budgets pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/) before enabling features.

## Build and inspect without an AWS account

```sh
npm ci
npm run build
uvx --from cfn-lint cfn-lint apps/todo-afterlife/template.yaml apps/notice-ghoul/template.yaml
npm test
```

Build output is `apps/<app>/dist/aws-entry.js` plus `meta.json`. The integrity suite verifies that bundle inputs resolve to shared skeleton sources. The SDK is bundled; no runtime npm install is needed on Lambda.

To install SAM later on macOS, download the appropriate signed `.pkg` from the [official installation page](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), verify it using the linked integrity instructions, then run the documented command only with the owner's permission:

```sh
sudo installer -pkg /absolute/path/to/aws-sam-cli-macos-arm64.pkg -target /
sam --version
```

Use the x86_64 installer on Intel. SAM was not installed or run during this build. If AWS SSO login is needed, the owner runs `aws sso login --profile <profile>`; no credentials should be pasted into chat or committed.

## Reproduce the local DynamoDB contract

Download and verify the current DynamoDB Local archive using the [official AWS instructions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html), then extract it into a local scratch folder. This build used DynamoDB Local3.3.2 with the installed OpenJDK25 runtime; it did not run Docker or an AWS account.

From the extracted folder, using a supported Java runtime:

```sh
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb -inMemory -port 18765
```

In a repository terminal:

```sh
WRAITH_DYNAMODB_ENDPOINT=http://127.0.0.1:18765 npx vitest run tests/store-contract.test.ts
```

The test refuses non-loopback endpoints, uses dummy local credentials, creates uniquely named temporary tables and removes those tables afterward. Stop the Java process when finished. The in-memory server stores nothing in your AWS account.

## Prepare secrets and live settings

Each stack needs a separate existing standard SSM SecureString parameter, for example `/wraith/todo-afterlife` and `/wraith/notice-ghoul-demo`. Its JSON contains `auditKey` and `sessionKey` (at least 32 random characters), `adminToken` (at least 24) and `demoCode` (at least 12). Generate distinct cryptographically random values outside this repository. Never use the example names as secrets. Optional `webhookSecret` and `githubToken` enable the configured GitHub integration. Do not share the admin token with judges; the demo code grants demo-only approval.

The runtime gets the parameter by name with decryption. IAM limits access to that parameter and its own table. If a customer-managed KMS key is used, its permissions/costs need separate review; the template assumes the AWS-managed standard Parameter Store arrangement.

`WRAITH_LLM_PROVIDER=none` and `AllowLiveIssues=0` are template defaults. Leave both unchanged for the free offline-first demo. Enabling live GitHub writes requires a dedicated sandbox repository, a scoped owner-provided token, explicit live configuration and UI approval. No public issue was created during validation.

## Deploy only after the owner says go

These commands create external infrastructure and upload source bundles. They have **not** been executed.

```sh
sam deploy --guided --template-file apps/todo-afterlife/template.yaml --stack-name todo-afterlife --region us-east-1 --profile <profile>
sam deploy --guided --template-file apps/notice-ghoul/template.yaml --stack-name notice-ghoul-demo --region us-east-1 --profile <profile>
```

For each guided prompt, supply that stack's SSM parameter name beginning with `/`, review IAM capabilities and the proposed changeset, and preserve live issues 0. Reserved concurrency defaults2; new accounts may not permit it. Verify the quota before deployment instead of assuming support. Do not raise the account's spending or concurrency limits automatically.

After deployment, record each `AppUrl` output in the README. Test in a clean browser: public pages show only demo data; a demo code permits fixture replay/approval; an admin token is required for real records. Verify scheduler ticks, Function URL cookie handling, audit persistence and a duplicate delivery on the actual stack. These are hosted verification steps, still pending.

## Recovery and removal

Back up the table and its separate audit key before any destructive action. Audit entries have no TTL; only request counters expire. The state revision plus audit append is atomic; an interrupted delivery remains for a later tick. Unknown external outcomes require lookup/reconciliation, not blind replay. The active snapshot is capped 1.5 MB and the journal approach targets small demo workloads.

If cleanup is authorized, review then run `sam delete --stack-name notice-ghoul-demo --region us-east-1 --profile <profile>` and the equivalent for `todo-afterlife`. Stack deletion removes its table unless retention is added; obtain approval and export needed data first. Existing SSM parameters are external to the stacks and remain until separately removed. Check deployment buckets and logs independently. No cleanup command runs automatically.
