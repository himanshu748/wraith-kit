# Requirements: demo-core (test fixture with a duplicate ID)

### Requirement 1: Accept events

**User story:** As a developer, I want events normalised, so that rules see one shape.

#### Acceptance criteria

1. WHEN an event arrives THE demo core SHALL normalise it into an Event.
1. WHEN an event repeats THE demo core SHALL ignore it.
