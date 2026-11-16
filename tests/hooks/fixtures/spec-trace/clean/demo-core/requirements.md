# Requirements: demo-core (test fixture)

This file is a test fixture for scripts/hooks/spec-trace.mjs. It is not a real spec.

## Requirements

### Requirement 1: Accept events

**User story:** As a developer, I want events normalised, so that rules see one shape.

#### Acceptance criteria

1. WHEN an event arrives THE demo core SHALL normalise it into an Event.
2. IF the event has no idempotency key
   THEN THE demo core SHALL reject it.

### Requirement 2: Record actions

**User story:** As a reviewer, I want every action recorded, so that I can audit it.

#### Acceptance criteria

1. THE demo core SHALL write one audit entry per transition.
