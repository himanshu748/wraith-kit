# Requirements: notice-ghoul

**Implementation update, 17 Nov 2026:** design.md and tasks.md now exist after the user's instruction to build. See [verification](../../../docs/verification.md) for actual local results and remaining external/Kiro evidence. Original phase-status notes below are retained as history.


## Introduction

Notice Ghoul helps students find deadlines buried in notice pages and feeds. It ingests notices, extracts dates, reconciles duplicates, asks about uncertain values and produces a digest and calendar file. It does not provide general calendar planning or send notifications. PLAN.md sections 7, 8 and 9.2 define this scope.

**Status.** Requirements authored by Codex through T3 Code on 17 Nov 2026 from the Kiro-authored plan. No app is implemented. The author runs this spec's design and Correctness step in Kiro IDE by 26 Nov. Persistence, provenance and versioned confirmation belong to `wraith-core`; the UI and LLM adapter are shared skeleton entries.

## Glossary

- **Notice identity:** a source and stable item identifier or link; a text correction changes its version, not its identity.
- **Deadline label:** the phrase identifying a deadline within a notice, such as fee payment.
- **Certain:** parsed deterministically without unresolved ambiguity, uncertainty or disagreement, or explicitly confirmed by a person.
- **Disagreement:** matching normalised titles from different sources with different dates.
- **Output set:** confirmed or certain deadlines allowed into the digest and calendar.
- **Fixture institution:** the fictional Hollowmere Institute of Technology, labelled demo data.

## Requirements

### Requirement 1: Configured, bounded polling

**User story:** As a student, I want to choose notice sources and poll them respectfully, so that the app does not scrape arbitrary colleges.

#### Acceptance criteria

1. THE app SHALL provide RSS 2.0, Atom and HTML notice-page sources, with configurable HTML item, title, link and date selectors.
2. THE app SHALL load real sources only from a gitignored user configuration and ship a secret-free `config.example.json`.
3. THE poller SHALL support conditional GET using ETag and last-modified validators, retaining the previous records on a not-modified response.
4. THE poller SHALL enforce a configured minimum interval, timeout and response size cap and send an identifying User-Agent.
5. THE HTML poller SHALL respect robots.txt and report a disallowed source without fetching its notice pages.
6. IF a source times out, fails or returns malformed data, THEN THE app SHALL record a source error and retain previous deadlines without presenting the poll as successful.
7. THE poller SHALL fetch only configured allowed destinations and validate redirects before following them.

### Requirement 2: Fictional demo sources

**User story:** As a judge, I want a repeatable fictional notice board, so that I can test ingestion without accessing real student data.

#### Acceptance criteria

1. THE fixture site SHALL include an HTML board, an RSS feed and a second department page repeating notices in another format.
2. THE fixtures SHALL include a corrected notice, a date without a year and an ambiguous `05/12` date.
3. THE fixture site SHALL visibly label every page `Fictional institution, demo data` and label feed content as demo data.
4. THE app SHALL offer a local fixture-site command and serve the fixture site in the hosted demo.
5. WHILE demo mode is enabled, THE app SHALL poll only the fixture sources and propagate demo labels to events, records, actions and outputs.

### Requirement 3: Stable event and record identities

**User story:** As a student, I want corrections to update existing deadlines, so that a changed date does not create a second calendar entry.

#### Acceptance criteria

1. THE event key SHALL include source, item identity and a hash of normalised notice text.
2. WHEN identical content is polled again, THE app SHALL emit the same event key and produce no duplicate actions.
3. WHEN a notice's content changes, THE app SHALL emit a new event version while retaining the notice identity.
4. THE deadline record key SHALL use notice identity and deadline label, excluding the date value.
5. WHEN a corrected notice changes a date, THE rules SHALL update that deadline record through the core instead of appending a duplicate.
6. THE app SHALL preserve source links, evidence quotes, publication date when available and the locale and timezone used to parse each deadline.

### Requirement 4: Deterministic dates and human edits

**User story:** As a student, I want explainable parsing and the same validation for corrections, so that a typed date behaves like an extracted one.

#### Acceptance criteria

1. THE rules SHALL detect deadline phrases including `last date`, `deadline`, `due`, `submit by`, `register by` and `closes on`.
2. THE parser SHALL support documented numeric and named-month formats and optional times, using each source's locale and timezone, defaulting to DD/MM and Asia/Kolkata.
3. IF a numeric date has unresolved DD/MM versus MM/DD meaning, THEN THE parser SHALL retain both valid candidates and mark the deadline ambiguous.
4. WHEN a date lacks a year and the notice has a publication date, THE parser SHALL infer the first matching date on or after that publication date.
5. IF a yearless notice has no publication date or its inferred date exceeds the configured inference distance, THEN THE parser SHALL retain an uncertain deadline for confirmation rather than silently discard it.
6. THE deadline record type SHALL declare `parseValue` using the same deterministic parser and normal form as source extraction.
7. IF a typed value is invalid, THEN THE confirmation flow SHALL return a field error and change no record.
8. THE rules SHALL assign supported category tags from exam, fee, scholarship, assignment and event without inventing source facts.
9. WHEN a certain deadline is past, THE app SHALL hide it from current outputs without deleting its record or audit history.

### Requirement 5: Cross-source reconciliation

**User story:** As a student, I want duplicate notices merged and conflicting dates exposed, so that the first source fetched does not silently win.

#### Acceptance criteria

1. WHEN different sources have matching normalised titles and dates, THE app SHALL merge their output representation and retain all source evidence.
2. WHEN normalised titles match but dates differ, THE rule SHALL flag both records `sources disagree` regardless of processing order.
3. THE disagreement query SHALL use `includeUnconfirmed` only for deadline records matching the current normalised title.
4. WHEN the core marks an evaluation because that query returned unconfirmed LLM data, THE app SHALL preserve the core's provenance and confirmation requirements on every new date it proposes.
5. WHEN a flag is added to an existing record, THE app SHALL retain its date value and `sourcedBy`, including a human-edited value.
6. WHEN disagreement is found, THE app SHALL remove unconfirmed conflicting dates from outputs and propose confirmation for each such date.
7. WHERE a conflicting date was already human-confirmed, THE app SHALL keep it in outputs and display it alongside the other date's confirmation request.
8. THE app SHALL produce the same reconciliation result and flags for any permutation or repetition of the same input notices.

### Requirement 6: Evidence-bound optional extraction

**User story:** As a student, I want AI to locate dates but never invent them, so that every suggestion can be checked against the notice.

#### Acceptance criteria

1. THE app SHALL use the shared adapter's `extract` advisor mode and skip advice when deterministic parsing already found one unambiguous date.
2. THE advisor schema SHALL require a proposed date and evidence quote.
3. THE verifier SHALL accept a proposal only if its whitespace-normalised quote occurs in the notice and parsing the quote alone with the source context reproduces the proposed date.
4. IF either verification fails, THEN THE app SHALL reject the proposal and retain an audit reason.
5. WHEN a proposal is accepted, THE date SHALL pass through the same rules as a deterministic date and remain LLM-sourced pending confirmation.
6. IF the adapter is off or fails, THEN THE app SHALL continue using deterministic extraction and expose its uncertainty without synthesising a successful provider result.

### Requirement 7: Versioned deadline confirmation

**User story:** As a student, I want to confirm, correct or reject uncertain dates, so that only values I trust appear in my calendar.

#### Acceptance criteria

1. THE app SHALL use the core's `confirm-record` action for ambiguous, uncertain, conflicting and unconfirmed LLM-sourced dates.
2. THE action SHALL display the quote, all stored candidate dates and the reason for confirmation.
3. WHEN both the rule and core request confirmation for the same record version and value, THE app SHALL retain only one request.
4. THE app SHALL support approving the proposal, selecting a stored candidate, editing through `parseValue` and rejecting with a reason.
5. WHEN a notice correction changes a proposed date, THE app SHALL supersede the old pending request and ask again only when the new date still needs confirmation.
6. WHEN a text correction leaves the date unchanged, THE app SHALL create no new confirmation request for that date.
7. THE app SHALL exclude rejected dates from outputs and preserve human-entered values against subsequent polls through the core's version rules.

### Requirement 8: Digest without posting

**User story:** As a student, I want a readable digest with evidence, so that I can see upcoming work without another messaging service.

#### Acceptance criteria

1. THE daily aggregate SHALL produce HTML and Markdown digests grouped into `due in 48 h`, `this week` and `later` with non-overlapping membership.
2. THE digest SHALL include source links, evidence quotes and demo labels for every applicable item.
3. THE output set SHALL include only certain or confirmed deadlines and exclude unresolved flagged, rejected and unconfirmed LLM-sourced values.
4. THE digest action SHALL declare its safe reason: it writes the requested digest, posts nothing and includes only certain or confirmed dates.
5. THE app SHALL render the digest on request from stored data, including an honest empty state and source-error status.
6. THE app SHALL contain no email, chat or social posting code.

### Requirement 9: Safe calendar generation

**User story:** As a student, I want a calendar file whose entries update reliably, so that corrections and hostile notice text cannot corrupt my calendar.

#### Acceptance criteria

1. THE calendar aggregate SHALL regenerate `deadlines.ics` only when the output set changes and include a canonical set hash in its action key.
2. THE calendar action SHALL declare a safe reason equivalent to the digest's and use exactly the same eligible deadline set.
3. THE calendar writer SHALL derive each UID from stable deadline identity, not the date, preserving it when the date changes.
4. THE writer SHALL apply RFC 5545 text escaping, CRLF content lines and octet-aware line folding without splitting a UTF-8 character.
5. THE writer SHALL prevent notice CR and LF characters from injecting calendar properties.
6. THE calendar tests SHALL round-trip UID, start and summary through an independent parser, including hostile and non-ASCII text and a moved date.
7. THE app SHALL serve a documented calendar URL with the appropriate calendar media type, without posting it to an external service.

### Requirement 10: Safe rendering and reproducible app

**User story:** As a judge or app author, I want trustworthy outputs and a reproducible walkthrough, so that the demo proves the shared skeleton's value.

#### Acceptance criteria

1. THE HTML digest SHALL use the skeleton's escaping `html` template, and THE Markdown digest SHALL escape Markdown and HTML metacharacters in notice data.
2. THE app SHALL reject unsafe source-link schemes when rendering links.
3. THE app SHALL have its own README covering local startup, fixture replay, source configuration, parsing limitations, approval, digest and calendar URLs, tests and AWS prerequisites.
4. THE app SHALL import only skeleton public extension points and pass the shared core-integrity suite.
5. THE app SHALL include property tests NG-P1 through NG-P4 and failure tests for malformed feeds, conditional fetches, source errors and output escaping.

## Notes for the design phase

- Choose exact notice and deadline-label normalisation and merged output identity (3.4, 5.1, 9.3). A disappearing source must not silently change an existing UID. Define how duplicate labelled deadlines in one notice remain distinct.
- Decide whether approving a second conflicting source retires the previously confirmed date. Requirement 5.7 preserves it until that policy is settled; no implicit deletion is specified.
- Define supported date grammar, timezone representation, all-day versus timed values, week boundaries, the inference-distance threshold (proposed six months), handling of missing publication dates and invalid dates such as 31 February. A default locale does not erase unresolved ambiguity.
- Confirm RSS/Atom parser and HTML parser APIs, versions and licenses before installation. Confirm HTTP validators and robots handling in their primary specifications; define bounded redirect and robots-error behaviour. Local fixture origins require an explicit demo allowance without opening arbitrary private-network fetches.
- [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545), consulted 17 Nov 2026, is the calendar contract. Design must specify UID, SEQUENCE, DTSTAMP, DTSTART and cancelled/removed-entry behaviour and cite the relevant sections before code is written.
- Property mapping: NG-P1 to 3.2, 5.1-5.8; NG-P2 to 4.2-4.7; NG-P3 to 9.3-9.6; NG-P4 to 6.3-6.6, 7.1, 8.3 and 5.4. These tests have not run; this file is a requirement, not evidence of success.
