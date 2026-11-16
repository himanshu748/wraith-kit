# Design: demo-core (test fixture)

## Intake

Normalises events and rejects events without a key.

_Validates: Requirements 1.1, 1.2_

## Audit

Writes one audit entry per transition, in the same store write as the transition.

**Validates: Requirements 2.1 and demo-app 1.1**
