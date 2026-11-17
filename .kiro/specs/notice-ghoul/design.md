# Design: notice-ghoul

Authored by Codex on 17 Nov 2026 after the author requested implementation. This is not a Kiro IDE Correctness run. The application uses the shared skeleton package and no copied engine.

## 1. Source boundaries

Cheerio load parses in-memory HTML with CSS selectors or XML RSS/Atom; it never fetches linked resources. Polling has a 10-second abort, 1 MB body cap, 100-item cap, identifying User-Agent and a minimum 60-second interval. Validators commit through the source result only after engine ingestion. HTML sources check robots.txt before fetching. Same-origin redirects and public-address checks bound destinations; DNS validation is not a network sandbox.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

## 2. Honest fixtures

Static HTML board, department repetition, corrected notice, RSS and Atom fixtures carry DEMO markers and fictional-institution labels. Interactive demo Events use dates relative to startup for an inspectable current journey. Static fixtures are fixed at November 2026 and are not presented as live-college evidence. The standalone fixture-server command serves current-date pages and robots.txt on loopback; an actual HTTP polling test checks parse, validators, 304, failures and robots. A fixture-page response alone does not establish polling.

_Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5_

## 3. Identity and evidence

Event keys include source, item identity and normalised title/text content. Deadline records use source, item identity, deadline phrase and occurrence ordinal, excluding the date. Corrected dates therefore update a record. Quotes, URL, source, publication time, timezone and candidate values are retained as data. Duplicate-source merging is an output projection rather than deletion of evidence records.

_Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

## 4. Date parser

Support ISO, numeric day/month, named month, ordinal day and optional HH:MM with AM/PM. Absent dateOrder uses DMY as the first candidate while retaining a second valid MDY candidate. Missing years infer the first valid date on or after publication, with missing publication or more than 183 days marked uncertain. Time conversion uses Intl.DateTimeFormat and rejects nonexistent wall times. Manual edits reuse the parser; ambiguous edits require ISO or named-month input.

_Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

## 5. Symmetric reconciliation

The extraction rule performs a narrow includeUnconfirmed query for matching normalised titles from other sources. Differing values flag both existing and proposed records. Existing peer metadata updates omit value, preserving its provenance and version. Confirmed values remain visible. Once a disagreement has requested human review, both records retain that flag through later matching corrections until explicitly confirmed. Confirming a second conflicting source does not retire the first; users decide which to reject. Processing order and repeated events are tested against the same record projection.

_Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

## 6. Verified extract advice

Advice is skipped for a single unambiguous deterministic deadline. Otherwise it returns {value,quote} proposals; the core calls verify and accepts only quotes in the source for which the deterministic parser reproduces the same date. Accepted extracted values restrict the record-producing parser results and are labelled by core provenance. No provider call is needed by default.

_Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

## 7. Core confirmation

Record upserts attach confirmation reasons/candidates for ambiguous, uncertain and conflicting values. The core supplies confirm-record actions, handles version invalidation and protects human edits. parseValue checks edited dates server-side. Rejected and unconfirmed LLM values stay out of aggregate state by default; remaining uncertainty flags are filtered by the app.

_Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

## 8. Digest projection

Only confirmed or unambiguously deterministic future deadlines enter the output set. HTML uses the core html tag and Markdown escapes metacharacters. Groups are non-overlapping 48-hour, current-week and later buckets; current week boundaries use UTC and this limitation is documented. A daily key plus input-set hash makes updates idempotent. No posting integration exists.

_Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

## 9. Calendar representation

Calendar output uses the same eligible set, SHA-256 UIDs derived from normalized title, deadline label and ordinal, independent of date and duplicate-source ordering, record version SEQUENCE and generated DTSTAMP. All-day values use DATE; timed values use UTC DATE-TIME. Text is escaped, CRLF-delimited and folded at 75 UTF-8 octets without splitting characters. Independent ical.js tests check parsed fields and moved-date UID stability. When multiple contradictory dates are explicitly confirmed, per-record variant UIDs distinguish them; entering that conflict state may leave an older imported entry in an append-only client. Snapshot removal is not a cancellation notification to a subscribed calendar.

_Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

## 10. Safety and validation

Only HTTP(S) or known fixture-relative links render. Unknown notice content is escaped. Tests cover deterministic dates, evidence rejection, real core confirmation, reversed source order, replay, hostile calendar content through an independent parser, feed parsing and robots matching. No real college, live LLM or AWS deployment has been validated by these tests.

_Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5_

## Primary documentation checked

- [Cheerio parsing configuration](https://cheerio.js.org/docs/advanced/configuring-cheerio), retrieved through Context7 from the official repository on 17 Nov 2026; load(xml, {xml:true}) and CSS selector APIs. Runtime cheerio 1.2.0, MIT.
- [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545), text escaping, content-line folding, UID, DTSTART and SEQUENCE; [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309), robots matching.
- [ical.js usage](https://github.com/kewisch/ical.js), independent dev-only calendar parser 2.2.1, MPL-2.0. The older API-page URLs returned 404; the upstream repository and installed declarations were used.

## Correctness properties

NG-P1 compares record projections under repeated and reversed inputs. NG-P2 generates supported dates. NG-P3 parses generated calendars through ical.js, including hostile titles and UTF-8 folding. NG-P4 rejects invented quotes/values and exercises actual core confirmation before output inclusion. These tests use fixture data, not a live provider or institution.
