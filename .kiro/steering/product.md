---
inclusion: always
---

# Product: Wraith Kit

Wraith Kit is a lean TypeScript skeleton for small event agents that ask before they act, built for the Kiroween 2026 hackathon in the Skeleton Crew category (bonus target: Best Student Project, Skeleton Crew). PLAN.md is the approved plan and the source of truth; this file is the short version Kiro needs in every session.

## What it does

An event arrives (a webhook, a feed the kit polls, or a local command) and is normalised into an `Event`. Deterministic rules run on it. An LLM can optionally help through one adapter, to reword text or to propose data that deterministic code must verify. The result is a proposed `Action`. Every action waits for a human in a small approval web UI unless its kind is declared safe with a written reason and it carries no unconfirmed LLM-sourced data. An audit log, retries and idempotency keys mean a redelivered webhook never produces a second action. It runs locally with Node or on the AWS free tier (Lambda, Function URLs, DynamoDB, deployed with SAM). See PLAN.md sections 1 and 5.

## Audiences

| Part | Audience | Problem it solves |
|---|---|---|
| The skeleton (`skeleton/`) | Developers who want a useful automation agent without giving an AI unchecked write access to real systems | Wiring intake, dedupe, retries, approval and audit by hand for every small agent |
| TODO Afterlife (`apps/todo-afterlife/`) | Developers | TODO and FIXME comments that rot because nobody turns them into tracked work. A GitHub push webhook finds new or changed TODOs, rules flag vague ones, and the app proposes a concrete rewrite, a GitHub issue (on approval) or retiring it |
| Notice Ghoul (`apps/notice-ghoul/`) | Students | Deadlines buried in college notice boards and RSS feeds. It polls notice pages and feeds, extracts deadlines, de-duplicates them, and produces a daily digest and an `.ics` calendar file. Nothing auto-posts |

When you write user-facing text, name the audience you are writing for. The two apps share nothing except the skeleton, and the video shows that versatility.

## Theme fit (Skeleton Crew)

The rules ask for "a skeleton code template lean enough to be clear but flexible enough to support various use cases" and "two distinct applications from your foundation". Wraith Kit is the skeleton; the two apps are built only from its extension points, and a test proves both import the same unmodified core (PLAN.md section 8). The spooky layer lives in names and the visual theme only (proposed actions wait in "Limbo", retired TODOs are "laid to rest"). Buttons keep plain words: "Approve" and "Reject".

## Honesty rules (apply to code, UI, docs and write-ups)

- Demo data is labelled "DEMO" everywhere: in the UI, in exports, in digests, in `.ics` files, in fixtures and in the video. Issues created from demo data say so.
- AI output is labelled with its provider and model.
- Nothing auto-posts anywhere. Nothing is published, deployed, posted or submitted without the author's explicit go.
- No invented users, statistics, quotes or testimonials, in the product or in any write-up. Report measured numbers only, and say who or what was measured (for example "agent time" versus a human run).
- Anything not done says "not yet"; anything not checked in official docs says "to confirm".

## Judging criteria

The five equally weighted criteria are Potential Impact, Technological Implementation, Design, Innovation/Idea and Presentation. Each feature is mapped to the one criterion it mainly serves in PLAN.md section 4. Read that table before adding or cutting a feature, and keep new work inside a mapped feature.

## Notice Ghoul is not Deadline Graveyard

The author is also submitting Deadline Graveyard (Costume Contest category), a browser-only tracker for deadlines you type in, drawn as a graveyard scene. The rules allow several entries only if each is substantially different (PLAN.md section 2). So Notice Ghoul:

- reads deadlines out of notice boards and feeds, and has no manual entry of deadlines (a person can only correct a date it found, through a "confirm deadline" action);
- has no scene;
- stays focused on notice ingestion, deadline extraction, cross-source dedupe and the digest (the `.ics` file stays because the brief asks for it);
- shares and copies no code with Deadline Graveyard.

Do not add features that blur this line, such as a manual deadline form or a scene view.
