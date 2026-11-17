# Design: llm-adapter

One fetch adapter provides none, modal and ollama. none is the default, so both apps complete their local journey with no account. Codex implementation on 17 Nov 2026 follows the Kiro-authored requirements. No model endpoint was created and no paid or live provider call was made.

## Configuration and provider transport

WRAITH_LLM_PROVIDER selects the provider; BASE_URL, MODEL and KEY use the WRAITH_LLM_ prefix. The base URL ends at /v1/; the client appends chat/completions and sends model, messages, max_tokens 700 and temperature 0. Modal requires HTTPS and Bearer authentication. Missing configuration/key returns a named fallback. A 503 reports warming up until later success. Ollama is forbidden on AWS and restricted to loopback HTTP plus WRAITH_OLLAMA_LOCAL_CONFIRMED=1. Model names containing cloud are rejected. Loopback alone cannot attest that an independently configured server does not proxy requests, so the disclosure requires a downloaded local model and cloud disabled. The core's advisorOff prevents the hook from calling the adapter, regardless of environment.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_

## Bounded advice and deterministic fallback

An 8-second AbortSignal deadline covers request and body reads. Input is capped at 32,000 characters, response at 64 KiB, redirects are refused and the configured parser validates decoded message JSON. Schema/provider/network/timeout errors return fallbacks; no response_format extension is assumed.HTTP 429 observes numeric or HTTP-date Retry-After within a process; process restarts lose this cooldown, a documented limit. The durable daily cap still applies across processes.

The adapter returns provider, model, raw content and validated value or fallback reason. The core hashes the exact prompt for audit. The configured credential is removed from returned raw/value material; generic errors never include request headers. The adapter cannot create or approve an action. Core verification and provenance gates control any proposed use of advice.

_Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2_

## Quota, prompt boundary and privacy

Runtime reserves 40 calls per UTC day per app using store CAS metadata before any provider request. Missing quota support fails closed. Calls that time out still consume a slot. Data goes in a wraith-data block with delimiter neutralization and a system warning that source content cannot authorize tools. This marking is defense in depth, not a prompt-injection guarantee; actual authority stays deterministic in the core and approval UI.

Settings queries live adapter status and explains the provider boundary. none sends no model traffic. Modal sends notice text or nearby code to the user-configured endpoint. Its account-specific retention/data-use terms and model license remain to confirm before enabling. No default model, endpoint or zero-cost provider guarantee is invented.

_Validates: Requirements 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 11.4, 11.5_

## Primary references and evidence

- [Modal Dedicated Endpoints](https://modal.com/docs/guide/dedicated-endpoints), [server cold starts](https://modal.com/docs/guide/servers), [budgets](https://modal.com/docs/guide/budgets).
- [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility).
- [Node AbortSignal.timeout](https://nodejs.org/api/globals.html#static-method-abortsignaltimeoutdelay), [RFC9110 Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3).

See [verification](../../../docs/verification.md) and the source/test files for measured results.

## Remaining limits

Live Modal/Ollama response behavior, account terms, model licenses and free allowances remain unverified. The shipped default is none. Local HTTP test doubles establish adapter protocol/failure handling only.
