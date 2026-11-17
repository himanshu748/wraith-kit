# Notice Ghoul

Find deadlines in college notice pages and feeds, reconcile repeated notices, and confirm unclear dates before they enter a digest or calendar. Nothing is emailed, messaged or posted. This app uses the same Wraith Kit engine as TODO Afterlife.

## Run the local demo

From the repository root:

```sh
npm install
npm run dev:notices
```

Open the one-time sign-in link launched by the server at `http://127.0.0.1:4318`. If it does not open automatically, use the private link file named in the terminal. The demo institution is fictional and every event is labelled DEMO.

1. Read the upcoming deadline digest at `/digest`.
2. Open the fee-payment confirmation in the queue. The numeric date has two possible readings; choose a candidate or type an ISO date such as `2026-12-05`.
3. Compare the two scholarship notices. Both sides are flagged when the sources disagree, regardless of ingestion order.
4. Approve a date, then refresh the digest after the next aggregate tick (up to one minute). Download `/deadlines.ics` or `/digest.md`.
5. Replay demo input and check that existing events are deduplicated:

```sh
npm run demo:notices
npx vitest run apps/notice-ghoul/test
```

The generated interactive demo dates are relative to startup. The source links open `/fixtures/demo.html` and `/fixtures/department-demo.html`, fictional pages with the same current dates. Static parser fixtures in `fixtures/site/` deliberately use November/December 2026 and are labelled fictional. They are served at `/fixtures/index.html`, `/fixtures/department.html`, `/fixtures/corrected.html`, `/fixtures/feed.xml` and `/fixtures/atom.xml`. No real college is contacted by the default demo. The static fixtures and dynamic replay demonstrate different boundaries: serving a fixture page alone is not evidence of polling it.

## Exercise the real local polling path

Start the fictional HTTP server in one terminal; its clock stays fixed until restarted:

```sh
npx tsx apps/notice-ghoul/src/fixture-server.ts
```

In a second terminal, run Notice Ghoul against the two loopback pages:

```sh
WRAITH_DATA_DIR=.wraith/notice-poll-demo WRAITH_NOTICE_CONFIG=apps/notice-ghoul/fixtures/config.json npm run dev:notices
```

This path makes real local HTTP requests, checks robots.txt and parses the HTML before proposing confirmations. No event replay is seeded when a config file is supplied. The server contacts no external service. Stop both with Ctrl+C. Set `WRAITH_DEMO_DATE=2026-11-17T10:00:00Z` on the fixture server only when reproducing the frozen test examples; for an interactive demo, omit it so deadlines remain upcoming.

## Configure your own sources

Copy `config.example.json` to the gitignored `apps/notice-ghoul/config.json`, replace the reserved example URL with a public notice page you are allowed to poll, and start:

```sh
WRAITH_NOTICE_CONFIG=apps/notice-ghoul/config.json npm run dev:notices
```

Each source has an id, URL, `format` (`html`, `rss`, `atom`), timezone and minimum polling interval. HTML sources also accept CSS selectors for item, title, link, date and body. Set `dateOrder` to `DMY` or `MDY` only when the source's convention is known; otherwise numeric dates with two valid readings are flagged. The default timezone is Asia/Kolkata.

Polling uses conditional GET, a ten-second request limit, a 1 MB response limit, at most 100 notices per response and a minimum one-minute interval. It identifies itself as Wraith-Kit. HTML polling checks robots.txt; failed robots retrieval fails closed except for a missing file. Redirects must remain on the configured origin. Private-network destinations are rejected except for explicitly labelled loopback demo sources. DNS checks do not establish a network sandbox; use a trusted source and a restricted network environment for hostile inputs.

Malformed or failed sources retain previously stored deadlines. The tick reports a source error instead of erasing them. Webhook/source content is untrusted and never treated as an instruction. XML entity/DTD input is rejected. No credentials belong in a source URL or committed config.

## Date and confirmation behaviour

Supported formats include ISO `2026-12-05`, `05/12/2026`, `5 December 2026`, `December 5, 2026`, ordinal dates and optional `17:00` or `5:00 PM` times. IANA timezone conversion handles timed entries; nonexistent DST wall times are rejected. Date-only deadlines remain all-day calendar entries. Natural-language phrases such as “next Friday” are not supported.

For a missing year, the first matching date on or after publication is used. A missing publication date or a date inferred more than 183 days later requires confirmation. Invalid dates such as 31 February are never normalised into another day. An edit must parse to one unambiguous value; ISO dates are recommended.

Same-title, same-date notices share one output item and retain their source links. Same-title, different-date notices are flagged on both records. Confirmed dates remain visible; confirming a second contradictory date currently preserves the first, so a person may need to reject the unwanted record. Once two sources have disagreed, both records retain the review flag even if a later correction makes them agree. Confirm the corrected record explicitly; correction does not silently dismiss an earlier request for review. Human-entered values cannot be overwritten by a later poll. The source identity and deadline label determine a record's identity; changing its date updates the record. Merged output identity uses normalized title, deadline label and within-notice ordinal, excluding the date and source ordering. Adding or losing a duplicate source does not change that normal merged UID. If a person confirms multiple contradictory dates, those distinct outputs use per-record variant UIDs; this transition can leave an old entry in a calendar client that treats downloads as append-only imports.

The optional extract advisor can locate a date only when its quote is present and the deterministic parser reproduces it. Accepted LLM dates still require confirmation. The default provider is `none`, so no model call is needed for this flow.

## Outputs and limits

The HTML and Markdown digest group eligible deadlines into 48 hours, this week and later. Current grouping uses UTC boundaries for the week; each timed deadline still carries its source timezone. Past deadlines are hidden, never deleted. Unconfirmed ambiguity, uncertainty, disagreement and LLM values are excluded. Both outputs use the same eligible set. Rejected dates stay in audit history.

The calendar uses stable logical-deadline UIDs (per-record variants for confirmed conflicts), record versions as SEQUENCE, escaped text and UTF-8-aware 75-octet folding. Removing an item from the downloadable snapshot does not issue a cancellation event to a subscribed calendar; clients differ in how they refresh snapshots. Calendar import is a user action, not an integration that posts to your calendar account.

## Verification and AWS

Property and regression tests cover dates, UTF-8 and hostile calendar text through the independent ical.js parser, disagreement under reversed source order, replay, confirmation, HTML/Markdown escaping, feeds and robots rules. Source HTTP calls are tested against a local HTTP fixture server and controlled responses; no real college or live LLM has been validated in this build.

See the root README and `docs/deploy-aws.md` for AWS packaging, secrets and cost prerequisites. Local startup creates no cloud resources. The AWS entry uses these same extension modules.
