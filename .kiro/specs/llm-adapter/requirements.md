# Requirements: llm-adapter

**Implementation update, 17 Nov 2026:** design.md and tasks.md now exist after the user's instruction to build. See [verification](../../../docs/verification.md) for actual local results and remaining external/Kiro evidence. Original phase-status notes below are retained as history.


## Introduction

`llm-adapter` is the skeleton's `llm` entry: one interface between the Wraith core's advisor gate and an optional LLM. It offers three providers, `none` (the default, which sends nothing), `modal` (a Modal Dedicated Endpoint used within the Starter plan's free monthly credits) and `ollama` (a local model, local mode only), selected by `WRAITH_LLM_PROVIDER`. Both remote providers speak the OpenAI-compatible Chat Completions API, so one client called with `fetch` serves both. Every failure ends in the advisor's deterministic fallback, so judges can always test both apps with no key.

**Status.** Requirements written on 16 Nov 2026 in Kiro CLI (driven by T3 Code), by hand in the format Kiro documents for feature specs ([Feature Specs](https://kiro.dev/docs/specs/feature-specs), EARS acceptance criteria). design.md and tasks.md are written in the CLI after `wraith-core`'s design exists (PLAN.md section 12). No Modal endpoint or proxy token exists yet; creating them is the author's step with the author's Modal account (PLAN.md 11.4).

**In scope.** Provider selection; the `none` provider; the one OpenAI-compatible client; Modal and Ollama specifics; parsing replies against the advisor's schema; fallbacks and their reasons; what the adapter reports for audit; the daily call cap per app; data blocks in prompts; server-only calls; the advisor-off mode used by the TODO Afterlife pre-commit hook; the privacy disclosure.

**Out of scope.** When the advisor runs, `verify`, the LLM provenance mark and approval (`wraith-core` Requirements 8, 9, 12 and 15); writing audit entries (`wraith-core` Requirement 22); the settings screen itself (`approval-ui` Requirement 7); the stacks' environment and secrets (`runtimes` Requirements 8 and 10); each app's prompt builder and schema (`todo-afterlife`, `notice-ghoul`).

**Sources in PLAN.md.** Section 5.1 (advisor modes `reword` and `extract`, the prompt builder may skip, `verify` must reproduce the value from the quote), 5.5 (the LLM adapter, as updated with the author's answers on 16 Nov 2026), 5.4 (data blocks, untrusted output), 6 (the pre-commit hook never calls an LLM; nearby code lines are sent only when a provider is on) and 17.1 answer 5 ("use modal": Gemini and Groq dropped).

**Dependencies.** `wraith-core` (the advisor gate in wraith-core 8.1 to 9.5 and LLM audit entries in wraith-core 22.8). `approval-ui` shows the status and disclosure this spec supplies. `runtimes` sets the environment on each stack (runtimes 10.13).

## Glossary

- **LLM adapter:** the skeleton's `llm` entry; the system these requirements describe.
- **Provider:** one of `none`, `modal` or `ollama`, selected by `WRAITH_LLM_PROVIDER`.
- **Chat Completions client:** the one OpenAI-compatible client, called with `fetch`, that serves `modal` and `ollama`.
- **Base URL, model ID, key:** the configuration of a provider, read from environment variables. For `modal` the key is a Modal proxy token, and the model ID is the endpoint's name.
- **Advisor schema:** the output shape an app's advisor declares: for `reword`, new wording for the proposed actions; for `extract`, proposals that each carry a value and an evidence quote.
- **Fallback:** the result the adapter returns instead of an LLM result, so that the advisor's deterministic fallback runs. **Fallback reason:** why it was returned.
- **Prompt hash:** a hash of the prompt sent, recorded instead of the prompt.
- **Daily call cap:** the most provider calls one app may make in one day.
- **Data block:** a clearly delimited part of a prompt that holds event content (webhook or notice text) and is marked as data.
- **Advisor off:** a run in which the adapter acts as `none` whatever `WRAITH_LLM_PROVIDER` says.
- **Local mode:** running under the Node runtime. **Hosted stack:** `todo-afterlife` or `notice-ghoul-demo` on AWS.
- **Privacy disclosure:** the text, per provider, that says where event content goes.
- **Cold start:** a Modal endpoint with no active containers, which rejects requests with HTTP 503.

## Requirements

### Requirement 1: One interface and provider selection

**User story:** As an app author, I want one LLM interface with the provider chosen by one variable, so that my app works the same with no LLM, with Modal or with Ollama.

#### Acceptance criteria

1. THE LLM adapter SHALL offer one provider interface that the Wraith core's advisor gate calls, whatever provider is active.
2. THE LLM adapter SHALL select the provider from the `WRAITH_LLM_PROVIDER` environment variable, whose allowed values are `none`, `modal` and `ollama`.
3. WHEN `WRAITH_LLM_PROVIDER` is not set, THE LLM adapter SHALL use `none`.
4. IF `WRAITH_LLM_PROVIDER` holds a value other than `none`, `modal` or `ollama`, THEN THE LLM adapter SHALL refuse to start and name the allowed values.
5. WHERE a run is started with the advisor off, as the TODO Afterlife pre-commit hook always is, THE LLM adapter SHALL act as `none` whatever `WRAITH_LLM_PROVIDER` says.
6. THE LLM adapter SHALL return with every result the provider and model that produced it, so that the core can label the result.

### Requirement 2: The none provider

**User story:** As a judge, I want the default provider to send nothing anywhere, so that I can test both apps with no key and no outside service.

#### Acceptance criteria

1. WHILE the provider is `none`, THE LLM adapter SHALL send no network request.
2. WHILE the provider is `none`, THE LLM adapter SHALL return a fallback with the reason "provider none" for every call, so that the advisor's deterministic fallback runs.

### Requirement 3: One OpenAI-compatible client

**User story:** As a maintainer, I want one small client for both remote providers and no vendor SDK, so that adding a provider later is configuration plus a test.

#### Acceptance criteria

1. THE LLM adapter SHALL send every `modal` or `ollama` call as one HTTP POST to the OpenAI-compatible Chat Completions endpoint under the configured base URL, using `fetch`.
2. THE LLM adapter SHALL use no vendor SDK.
3. THE LLM adapter SHALL read the base URL, the model ID and the key from environment variables, whose names are set in design.
4. THE LLM adapter SHALL contain no hard-coded model ID.
5. IF the provider is `modal` and no key is configured, THEN THE LLM adapter SHALL make no call and return a fallback with the reason "missing key".
6. IF the provider is `modal` or `ollama` and its base URL or model ID is not configured, THEN THE LLM adapter SHALL make no call and return a fallback with the reason "missing configuration".
7. THE LLM adapter SHALL make provider calls only from server code, under the Node runtime or in the Lambda function.
8. THE LLM adapter SHALL not be included in any script sent to a browser.

### Requirement 4: The modal provider

**User story:** As the author, I want Modal calls authenticated with a proxy token and cold starts handled, so that a scaled-to-zero endpoint never breaks an app.

#### Acceptance criteria

1. WHILE the provider is `modal`, THE LLM adapter SHALL send the Modal proxy token in an `Authorization: Bearer` header on every call.
2. WHILE the provider is `modal`, THE LLM adapter SHALL send the configured endpoint name as the `model` value of every call.
3. IF a `modal` call returns HTTP 503, THEN THE LLM adapter SHALL return a fallback with the reason "provider warming up".
4. WHEN a `modal` call has fallen back with the reason "provider warming up", THE LLM adapter SHALL report the status "provider warming up" until a later call succeeds.
5. THE LLM adapter SHALL read the Modal proxy token only from the environment of the process, which the runtime fills from its secrets, and never from a file in the repo.

### Requirement 5: The ollama provider

**User story:** As a developer, I want a local model as an option that cannot leave my machine, so that the privacy promise for Ollama holds.

#### Acceptance criteria

1. IF the provider is `ollama` under the AWS runtime, THEN THE LLM adapter SHALL refuse to start and say that Ollama runs in local mode only.
2. IF the provider is `ollama` and the host of its base URL is not a loopback address, THEN THE LLM adapter SHALL refuse to start, so that the data stays on the machine.

### Requirement 6: Replies are parsed and checked against the advisor's schema

**User story:** As an app author, I want every LLM reply checked against my advisor's schema by the adapter itself, so that malformed output never reaches my rules.

#### Acceptance criteria

1. WHEN a provider replies, THE LLM adapter SHALL parse the reply's message content and check it against the advisor's schema.
2. THE LLM adapter SHALL not depend on a JSON output option such as `response_format`.
3. IF the reply does not parse, or does not match the advisor's schema, THEN THE LLM adapter SHALL return a fallback with the reason "parse failure".
4. WHEN the call is for a `reword` advisor, THE LLM adapter SHALL accept only a reply that gives new wording for the proposed actions it was sent.
5. WHEN the call is for an `extract` advisor, THE LLM adapter SHALL accept only proposals that each carry a value and an evidence quote, and leave the check that `verify` reproduces each value to the Wraith core (wraith-core 8.3).
6. THE LLM adapter SHALL return the raw reply together with the parsed result, so that the core keeps it for audit (wraith-core 9.5).

### Requirement 7: Deterministic fallback on every failure

**User story:** As a judge, I want the app to keep working whenever the LLM is slow, rate-limited, cold or misconfigured, so that the demo never depends on an outside service.

#### Acceptance criteria

1. IF a call does not complete within the request timeout, THEN THE LLM adapter SHALL abort it and return a fallback with the reason "timeout".
2. IF a call returns HTTP 429, THEN THE LLM adapter SHALL return a fallback with the reason "rate limited".
3. WHEN a 429 reply carries a `Retry-After` header, THE LLM adapter SHALL make no call to that provider until the time it gives has passed, and SHALL return a fallback with the reason "rate limited" for every call until then.
4. IF a call fails in any other way, such as a network error or another HTTP error status, THEN THE LLM adapter SHALL return a fallback with a reason that names the error kind or the status.
5. THE LLM adapter SHALL report every failed call to the Wraith core as a fallback and never as a thrown error.

### Requirement 8: What the adapter reports for audit

**User story:** As a reviewer, I want every LLM call and every fallback in the audit log without any secret, so that I can see what the AI did without exposing keys.

#### Acceptance criteria

1. THE LLM adapter SHALL report every call and every fallback to the Wraith core with the provider, the model, a prompt hash and, for a fallback, its reason, for the audit entry in wraith-core 22.8.
2. THE LLM adapter SHALL never put a key, a token or an `Authorization` header value in what it reports, in a log or in an error message.

### Requirement 9: Daily call cap per app

**User story:** As the author, I want each app's LLM calls capped per day, so that usage stays inside Modal's free credits.

#### Acceptance criteria

1. THE LLM adapter SHALL count each app's provider calls per day against that app's daily call cap, set in configuration.
2. WHEN an app's calls for the day have reached its daily call cap, THE LLM adapter SHALL make no call and return a fallback with the reason "daily cap reached".
3. WHEN a new day starts, THE LLM adapter SHALL count that app's calls from zero.

### Requirement 10: Event content goes in data blocks

**User story:** As an app owner, I want webhook and notice text sent to the model only as marked data, so that text inside an event cannot pass itself off as instructions.

#### Acceptance criteria

1. THE LLM adapter SHALL place every piece of event content that a prompt builder supplies inside a clearly delimited data block, separate from the instructions.
2. IF event content contains the data block's delimiter, THEN THE LLM adapter SHALL neutralise the delimiter in that content, so that the content cannot end the block.
3. THE LLM adapter SHALL state in the instructions of every prompt that text inside data blocks is data and not instructions.

### Requirement 11: Privacy disclosure

**User story:** As a user of either app, I want to be told where my event content goes for each provider, so that I can choose a provider knowingly.

#### Acceptance criteria

1. THE LLM adapter SHALL supply a privacy disclosure for each provider, for the README and the settings screen (approval-ui 7.2).
2. THE LLM adapter SHALL say in the disclosure for `none` that nothing is sent anywhere.
3. THE LLM adapter SHALL say in the disclosure for `ollama` that the data stays on the machine.
4. THE LLM adapter SHALL quote in the disclosure for `modal` Modal's data-use terms for endpoint traffic once they are confirmed, and SHALL say that they are to confirm until then.
5. THE LLM adapter SHALL include in the disclosure for `modal` and `ollama` the description of the content each app's advisor sends (for TODO Afterlife, nearby code lines), as the app supplies it.

## Notes for the design phase

### Open design questions that PLAN.md leaves to this spec

1. **Environment variable names.** PLAN.md 5.5: "plus base URL, model and key variables (names set in the `llm-adapter` spec)". Criteria: 3.3.
2. **The request timeout value.** PLAN.md names a timeout as a fallback reason ("On a parse failure, timeout, 429, 503 or missing key, the deterministic fallback runs") but sets no value. It has to fit inside the core's work on an event and, on AWS, inside the Lambda function's time limit. Criteria: 7.1.
3. **Where the daily call count is stored.** PLAN.md 5.5: "A daily call cap per app (config) keeps usage inside the free credits." No cap value and no storage are given. To settle: the store (the same file store or DynamoDB table, so that the hook process and the server share one count), which time zone starts a new day, and where the `Retry-After` wait in 7.3 is kept. Criteria: 7.3, 9.1 to 9.3.
4. **Modal's data-use terms and the model's license.** PLAN.md 5.5: "Modal: its data-use terms for endpoint traffic are to confirm in the `llm-adapter` spec. The disclosure quotes them once confirmed." and "The license of the chosen model: to confirm in the `llm-adapter` spec." Proposed default model: `Qwen/Qwen3.5-4B`, "to confirm against the supported-models list when you create the endpoint". Locally, `qwen3:4b-instruct` is installed for Ollama (license to confirm). Criteria: 11.4.
5. **How a cold start is surfaced in the UI.** PLAN.md 5.5: "the adapter treats a 503 as "provider warming up", runs the deterministic fallback, and records that reason in the audit entry." To settle: how the settings screen and the action detail show it (approval-ui 3.4 and 7.1), and whether a 503 also starts a short wait like 7.3. Criteria: 4.3, 4.4.
6. **`response_format`.** PLAN.md 5.5: "whether Modal supports it: to confirm in the `llm-adapter` spec". The adapter must work without it (6.2), so this only decides whether design also sends it.
7. None of the four spec-phase items in the plan reviews' list of remaining issues (task notes kept outside this repo) belongs to this spec.

### Other questions found while writing these requirements

- The hash function for the prompt hash (8.1).
- The delimiter of a data block and how a delimiter inside content is neutralised (10.2).
- Whether Ollama needs a key header at all when called with `fetch` (its docs say the key is "required but ignored", which describes OpenAI client libraries).
- The daily call cap's default value per app. PLAN.md gives none; design proposes one and labels it proposed.
- How the `cli` source tells the adapter that the advisor is off (1.5), so that the hook cannot be switched on by an environment variable.

### Properties

PLAN.md section 9 lists no property for this spec. Candidates for design.md (not in PLAN.md, to be decided there): for any reply body and status, the adapter returns a schema-valid result or a fallback and never throws (6.1, 6.3, 7.1 to 7.5); no reported value, log line or error message contains the configured key (8.2); a data block survives any content, including content that holds the delimiter (10.1, 10.2). The approval gate on LLM-sourced output is P5 in `wraith-core`.

### Facts used here, all from PLAN.md 5.5 (read 16 Nov 2026)

- [Modal Endpoints](https://modal.com/docs/guide/endpoints) and [Dedicated Endpoints](https://modal.com/docs/guide/dedicated-endpoints): `modal endpoint create --name <name> --model Qwen/Qwen3.5-4B` creates a Dedicated Endpoint; the endpoint's name is the `model` value clients send; clients call `<endpoint-url>/v1/chat/completions` with a proxy token sent as `Authorization: Bearer wk-<id>.ws-<secret>`; an endpoint scaled to zero "does not incur compute charges".
- [Modal Servers](https://modal.com/docs/guide/servers): "When a Server has no active containers, requests will be rejected with a 503 Service Unavailable status".
- [Modal pricing](https://modal.com/pricing): Starter plan "$0+ compute / month" with "$30 / month free credits". [Modal budgets](https://modal.com/docs/guide/budgets): a Workspace spend limit is "a monthly cap on net charges (what you pay out of pocket after credits are applied)". The author sets the spend limit (lowest allowed value: to confirm in the dashboard).
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility): base URL `localhost:11434/v1/` over plain HTTP; the API key is "required but ignored".

### Docs still to confirm (cite in design.md)

- Modal: data-use terms for endpoint traffic; whether endpoints support `response_format`; what a 429 from an endpoint looks like and whether it carries `Retry-After`; the supported-models list and the license of the chosen model.
- Ollama: the license of the chosen local model.
- The Chat Completions request and reply fields the client uses (`model`, `messages`, the reply's message content), as Modal and Ollama document them.
- RFC 9110 for the `Retry-After` formats (seconds or an HTTP date).
- Node.js `fetch` with `AbortSignal.timeout()` for the request timeout.
- Kiro: Analyze Requirements (`/spec analyze_requirements llm-adapter`, per [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements)) has not been run on this file yet; it needs a Kiro session started in `wraith-kit/`.
