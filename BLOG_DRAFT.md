# The useful part of an agent is the decision boundary

*This article was written for the Kiroween 2026 hackathon. It is an unpublished draft about Wraith Kit, a Skeleton Crew entry. The implementation described is local; it is not a claim of a deployed service or live-provider execution.*

A TODO that says “fix this later” and a notice announcing a scholarship deadline seem unrelated. One belongs in a developer's editor. The other belongs on a student's calendar. But the automation behind them starts the same way: receive some text, decide whether it matters, and propose a next action.

Wraith Kit is built around that shared path. It is a TypeScript skeleton for small event agents, with two applications made from its extension points. TODO Afterlife finds vague code comments and proposes rewrites, issue drafts or retirement. Notice Ghoul reads notice pages and feeds, extracts deadlines and prepares a digest and calendar file.

The central interaction is deliberately uneventful: a proposal waits in a queue until someone reviews it.

## A proposal is not permission

An event arrives from a webhook, poller or local command. Deterministic rules run in a stable order. Optional AI advice can help reword a proposal or locate a value in a piece of evidence. The result is an action with a preview, a source and a reason.

The human sees those together. For a comment, the preview can be a patch. For a date, it can be the two readings of an ambiguous number. An approval is a state transition the core records, not a special phrase that an LLM is trusted to emit.

Some actions can be declared safe. Producing a local digest is different from creating a public issue. But even a safe action needs review when it carries unconfirmed AI-sourced data. That distinction belongs in the shared engine, because every application author should not have to rediscover it.

## The harder problem is data that moves

It is straightforward to put a warning beside an AI answer. It is harder to preserve that warning after the answer becomes a record and the record feeds an aggregate.

Notice Ghoul makes the problem concrete. A model may find a date in a messy notice. The date must be supported by a quote, and a deterministic parser must reproduce the proposed value from that quote. Acceptance by the verifier still does not make it human-confirmed. The pending value must not quietly appear in a calendar just because the calendar writer is a safe action.

A source correction creates a related problem. A text edit should not generate endless confirmations when the date stayed the same. A changed date should invalidate an old pending decision. A date a person entered should not be overwritten by the next poll. These are record and version rules, not UI decoration.

## What Kiro contributed

Kiro CLI helped produce the plan, repository foundation and initial requirements. The repository keeps that work under `.kiro`: EARS requirements, steering files, hooks and custom-agent configurations. The steering separates product intent, technical constraints, structure and the rules for building another app.

The hooks have specific jobs. A save hook runs related tests. A commit guard checks the staged content, including secrets and whether `.kiro` would be ignored. A store guard protects the local action-store path from direct agent write operations. A hook can have limits: a normal terminal commit does not automatically become a Kiro event, and a configuration file on disk is not evidence that a hook ran. The experiments log records those distinctions.

The build also hit a Kiro usage-limit interruption. Codex through T3 Code continued the requirements and implementation afterward. That is recorded in `KIRO_USAGE.md` rather than presenting every line as Kiro-authored. Kiro IDE Correctness was not used in this continuation, and neither Kiro Web nor Kiro Crew is claimed as used.

This distinction matters for a build story. The useful evidence is what a tool actually did and what changed because of it, not the number of product names that fit into a technology list.

## Reuse has to be inspectable

The two apps live in separate folders, but folder separation alone proves very little. They must import the same skeleton through public exports, and the skeleton must not know their app names.

The integrity checks are intended to make that claim executable: resolve the shared package, reject deep imports and copied source, inspect loaded source hashes, check frozen registries and reject app-specific knowledge in the skeleton. The README records the checks that actually ran. A source-integrity check does not by itself prove a hosted bundle or a live service behaved correctly; those need their own validation.

The developer experience is the third application test. A starter should need one source, one rule and one action, with optional pieces added only when useful. The “make your own app in 15 min” guide uses that as a goal. An agent's elapsed time must not be passed off as a measured human result.

## Why the no-LLM path comes first

A judge should be able to explore the product without creating an inference account. A developer should be able to run a local comment check without sending nearby source code to a remote service. The default adapter therefore uses `none` and deterministic fallback behaviour.

Modal and local Ollama are optional paths behind one adapter. Provider timeouts, rate limits and missing configuration should remain visible as fallback reasons. A simulated response is never a successful live inference call. Free-credit configuration and deployment are separate operational steps and have not been performed for this draft.

## The demonstration to keep honest

The intended demo moves from a developer reviewing a vague comment to a student confirming a deadline from the fictional Hollowmere Institute of Technology. Both use the same approval UI and engine. The notice site and its data say they are fictional. A GitHub issue proposal without a token says dry-run.

Those journeys have now been exercised locally, with test and browser results recorded in `docs/verification.md`. The next evidence must come from external integrations, tested only within the author's authorization. There is no claim here of real users, time saved or production adoption. There is a concrete proposition to test: small agents become easier to trust when their decisions, uncertainty and effects remain inspectable from beginning to end.

---

**Publication note for the author:** This is prepared copy, not a published blog. Before posting, reconcile capability and validation wording with the final README, add only verified public repository/demo links, and rewrite any personal interpretation in your own voice. Publish during the hackathon submission period only after explicitly authorizing publication, then retain the actual URL for the form.
