# Design: wraith-mcp

A local stdio server exposes six inspection tools using the official MCP SDK 1.32.2 and Zod 4.6.7. It is implemented and exercised by Codex on 17 Nov 2026. An actual Kiro-hosted call remains an explicit integration gate; the protocol integration test uses the official MCP client in a separate process.

## Protocol and inspection

scripts/mcp.ts selects one app at startup and serves protocol-only stdout. The registered wraith entry preserves aws-docs in .kiro/settings/mcp.json. list_events and list_pending_actions sort by stable ID, accept after and limit1..50(default 20), and return next cursors. explain_action returns the stored event, ordered trace, suggestion/fallback and linked audit. JSON results are capped 100,000 characters, and credential-shaped object keys are redacted. Content remains untrusted data and is never interpreted as a tool command.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

## Isolated simulation

simulate_event accepts a bounded 32 KiB validated EventInput and calls Engine.simulate against a cloned snapshot. The core exposes no HTTP/advisor/executor capability to evaluation, no writes occur and the result says persisted:false. Rules are synchronous trusted app code: a malicious infinite loop inside an installed rule cannot be preempted within this process. Untrusted source data is bounded, but hostile app code requires OS process isolation. LLM simulation is not an option.

_Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## Audit, extension discovery and authority

verify_audit returns validity, first failure or verified sequence and HMAC limitations. list_extension_points names app sources/rules/actions/records/aggregates/advisor/views/theme. Handlers receive only snapshot, simulate and verifyAudit methods, never decide or tick. No approval or write tool exists. The stdio integration test lists tools, invokes all six and rejects an invented approve_action, then compares journal bytes and logical state. This is stronger than readOnlyHint alone, but is not a Kiro-host smoke test. Start Kiro in this repo root when that separate validation is available.

_Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

## Primary references and evidence

- [Official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) server/client registration and Stdio transports, verified through Context7 and installed SDK declarations.
- [MCP server guide](https://modelcontextprotocol.io/docs/develop/build-server), including protocol-only stdout.

See [verification](../../../docs/verification.md) and the source/test files for measured results.

## Remaining limits

An observed Kiro-hosted tool call remains unverified. Installed custom-agent configuration and an SDK client test must not be represented as a successful Kiro IDE/CLI session.
