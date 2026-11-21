# Wraith Kit

**Tagline:** Small agents that give forgotten work a second life, with a human in the loop.

Draft for the **Skeleton Crew** category and **Best Student Project: Skeleton Crew**, entered solo. Both apps run locally, and the 2:05 demo is ready for review. The video upload, deployment, and submission remain pending.

## Inspiration

A code comment says “fix this later.” A college notice buries a deadline in a paragraph. Both ask somebody to remember something, and both can slip past a busy day.

The useful automation is easy to imagine: find the comment or notice and suggest what should happen next. The difficult part comes after that suggestion. What happens when the same event arrives twice? What if two sources disagree? What if an AI answer sounds convincing but the evidence says something else?

Wraith Kit starts at that boundary. It is a reusable foundation for event agents that explain their reasoning and ask before they act. Two distinct apps show how the same foundation can serve developers and students without copying the engine.

## What it does

**TODO Afterlife** reads added or changed TODO, FIXME, HACK and XXX comments. Deterministic rules identify vague wording, missing ownership and missing completion conditions. A developer can inspect a proposed rewrite, approve a downloadable patch, review an issue proposal, or retire a comment with a reason. Without GitHub credentials, issue creation is an explicit dry-run. No rewrite is automatically committed or pushed.

**Notice Ghoul** reads configured notice pages and feeds, extracts deadlines, reconciles repeated notices and produces a digest and calendar file. When a date is ambiguous or sources disagree, it asks for confirmation. The review shows the original quote and the candidate dates, so the student can choose a reading or make a validated correction. Nothing is emailed or posted anywhere.

The demo notice board belongs to the fictional Hollowmere Institute of Technology. Its pages and resulting records are labelled demo data. It includes repeated notices, a corrected date and an ambiguous date to make the confirmation flow inspectable.

The shared approval queue, Limbo, connects both experiences. Each proposal has a source, ordered rule findings and an exact preview. The same core manages event identity, approval, execution attempts, records and audit history for both apps.

## How it is built

The repository separates `/skeleton` from `/apps/todo-afterlife` and `/apps/notice-ghoul`. Apps register sources, rules, action kinds and optional records, aggregates or advice through the skeleton's public extension points. The engine does not know either app's name.

The default path uses deterministic rules and needs no LLM key. One optional adapter supports Modal or local Ollama. Advice has two constrained roles: reword an existing proposal, or propose a value with evidence that deterministic code must verify. The core tracks unconfirmed AI-sourced values and keeps them behind approval.

The local Node runtime supplies persistence and a server-rendered UI. The repository also contains the AWS deployment path for review and validation; a template in Git is not a hosted deployment. The runtime and service boundaries, commands and current checks are documented in the README and technical notes.

Kiro CLI was used for the approved plan, repository foundation, hooks, steering, custom-agent configuration, MCP configuration and the initial requirements. After a Kiro usage-limit interruption, Codex through T3 Code continued requirements and implementation. `KIRO_USAGE.md` distinguishes those contributions. Kiro IDE Correctness, Kiro Web and Kiro Crew are not claimed as used.

## Challenges

The approval boundary reaches further than one button. An uncertain date can enter a record, and that record can later feed a digest. The design therefore needs to preserve provenance through rule queries and aggregates, not just label the original AI response.

Identity also needs care. A repeated delivery should not create a second proposal, but a corrected notice must still update its deadline. Confirmations must become stale when the proposed value changes. Human corrections should not disappear on the next poll.

External writes have an additional limit: an uncertain GitHub response is not proof that an issue was never created. An idempotency marker and lookup help recovery, but the implementation must avoid treating an incomplete lookup as permission to blindly create another issue. Local tests can check these decisions; they cannot establish live GitHub behaviour by themselves.

## Accomplishments

The project now has a shared implementation and two app modules with different source data, rules and outcomes. The approval interface gives those outcomes one consistent review language. The project also makes its intended invariants visible in EARS requirements, designs, task lists and property tests, instead of leaving them only in an agent prompt.

The useful demonstration is specific: a developer reviews a vague comment, then a student resolves an uncertain deadline, and both decisions travel through the same engine. The README records which checks and journeys actually passed. This draft does not claim deployed operation, live-provider execution, user adoption, measured time savings or a completed video.

## What was learned

Writing a safety rule is easier than making it survive the full data flow. “Ask before acting” has to cover source ingestion, record updates, aggregate outputs and retry recovery. That led to explicit state transitions and evidence at the point of decision.

The no-LLM path is also part of the product experience. It lets a judge inspect the central journey without an account, and it makes provider outages visible as a fallback rather than disguising them as successful AI output.

## What comes next

The local tests and two-app browser journeys now pass, with evidence in `docs/verification.md`. The next step is to validate the authorized external paths: a real sandbox webhook and approved issue, optional free-credit inference, and the AWS store and deployment. Publication and hosting require the author's separate go. The authoring guide should be rehearsed with a genuinely timed human run before any measured “15 minutes” claim is made.

## Distinction from Deadline Graveyard

Notice Ghoul is an ingestion and reconciliation app inside a reusable skeleton: it reads notices and asks about uncertain extracted values. Deadline Graveyard is a separate browser-only deadline tracker centered on manually entered deadlines and a graveyard scene. They share a broad topic and calendar export, but not code, the central workflow or the category claim. Wraith Kit's entry is the reusable foundation and its two distinct applications.

## Submission references to fill only after the action occurs

- Public GitHub repository: not published.
- Working hosted app URLs: not deployed; local run instructions are in the README.
- Public demo video: local recording verified at 2:05. YouTube URL pending.
- Blog and social URLs: drafts prepared, not posted.
- Student identity and enrollment details: supplied privately by the author in the submission form, never invented or committed here.
