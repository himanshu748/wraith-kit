# Requirements: wraith-mcp

**Implementation update, 17 Nov 2026:** design.md and tasks.md now exist after the user's instruction to build. See [verification](../../../docs/verification.md) for actual local results and remaining external/Kiro evidence. Original phase-status notes below are retained as history.


## Introduction

The `wraith` MCP server lets Kiro inspect and explain a local Wraith app without gaining authority to approve or execute actions. It uses the skeleton's `mcp` entry, public read interfaces and isolated rule evaluation. PLAN.md sections 5.4 and 10.6 define the boundary.

**Status.** Requirements authored by Codex through T3 Code on 17 Nov 2026 from the Kiro-authored plan. The server is not implemented or configured yet. The existing `aws-docs` MCP server is separate. Design and tasks follow the core design.

## Glossary

- **Host:** Kiro or another local MCP client.
- **Snapshot:** a consistent, read-only view of an app's stored state.
- **Simulation:** deterministic rule evaluation over supplied data, with no durable effects.
- **Explanation:** the event, ordered findings, advisor outcome and linked audit entries behind an action.

## Requirements

### Requirement 1: Local protocol boundary

**User story:** As a developer, I want a standard local MCP server, so that Kiro can inspect my app without a new hosted service.

#### Acceptance criteria

1. THE server SHALL use stdio transport and the official MCP TypeScript SDK, with the package, version and API confirmed before implementation.
2. THE server SHALL write only protocol messages to stdout and send diagnostics to stderr with secrets redacted.
3. THE server SHALL validate all tool inputs and return bounded structured results or explicit errors.
4. THE server SHALL select the local app and store from trusted startup configuration, not arbitrary filesystem paths supplied by a tool call.
5. WHEN implemented, THE server SHALL be registered as `wraith` in `.kiro/settings/mcp.json` without replacing `aws-docs`.

### Requirement 2: Inspect events, pending work and explanations

**User story:** As an app author, I want to understand why an action is waiting, so that I can debug rules before making a decision in the UI.

#### Acceptance criteria

1. THE server SHALL expose tools to list events and pending actions, with stable pagination and bounded page sizes.
2. THE explain-action tool SHALL return the source event, rules fired in evaluation order, findings, advisor provider or fallback reason and the linked audit trail.
3. THE server SHALL include demo labels on all results derived from demo data.
4. IF the requested app, event or action does not exist, THEN THE server SHALL return a not-found result without inventing a record.
5. THE server SHALL expose no token, session cookie, webhook secret or environment value in any result or error.
6. THE server SHALL treat event text and LLM output as untrusted data and SHALL never interpret instructions embedded in them as tool authority.

### Requirement 3: Isolated simulation

**User story:** As an app author, I want to simulate an event safely, so that experimenting in chat cannot change the running app.

#### Acceptance criteria

1. THE simulate-event tool SHALL run the app's registered deterministic rules against an isolated in-memory snapshot and return the ordered findings and proposed changes.
2. THE simulation SHALL perform no store write, source expansion, network call, approval or executor invocation.
3. THE simulation SHALL disable the LLM advisor by default, regardless of the running app's provider setting.
4. IF a caller asks for LLM simulation, THEN THE server SHALL refuse unless a separately specified mode and explicit authorization permit it; the initial implementation SHALL provide deterministic simulation only.
5. THE result SHALL say that it is a simulation and that proposed actions were not persisted or executed.
6. THE simulation SHALL use bounded input size and execution limits and return an explicit failure on invalid input or rule failure.

### Requirement 4: Audit verification and extension discovery

**User story:** As a reviewer, I want to check audit integrity and discover extension points, so that I can inspect the skeleton's contracts from Kiro.

#### Acceptance criteria

1. THE server SHALL expose a tool that verifies the audit chain through the core's verification function and returns the verified range or first failing sequence.
2. THE result SHALL explain the verification's limits and SHALL not describe a valid chain as proof that an external action succeeded.
3. THE server SHALL expose a tool listing the skeleton's public extension points, their purpose and the app's registered implementations.
4. THE tools SHALL use read-only snapshots and SHALL neither repair nor append to the store while reading it.

### Requirement 5: Enforced read-only authority

**User story:** As an owner, I want the MCP connection to lack write authority, so that a malicious notice cannot approve its own action through chat.

#### Acceptance criteria

1. THE server SHALL expose no approve, edit, reject, retry or execute tool.
2. THE tool handlers SHALL receive no mutable store or executor capability.
3. THE tests SHALL check the registered tool list and verify byte-for-byte unchanged persistent state after every tool, including failure and simulation paths.
4. THE tests SHALL exercise invalid identifiers, oversized input, pagination, secret redaction and instruction-like event content.
5. THE documentation SHALL include startup instructions and one observed Kiro tool call when the server is actually used, marking that integration unverified until then.

## Notes for the design phase

- Confirm the SDK's current package layout, schema dependency, registration methods, pagination shapes and shutdown handling in the official [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) docs before installation. The [server guide](https://modelcontextprotocol.io/docs/develop/build-server), consulted 17 Nov 2026, documents stdio and keeping logs off stdout.
- Define exact tool names, schemas, page limits, cancellation and snapshot consistency with the core store. Read-only access must not acquire a write path that truncates a torn journal line during recovery.
- The initial simulation is deterministic only (3.4). A future LLM mode must explicitly revise the zero-network boundary and cost/privacy contract before being implemented; a caller-supplied boolean is not authorization.
- Use the same trace and rule engine as the apps. Test capabilities, not just `readOnlyHint` annotations: annotations alone cannot enforce the boundary.
