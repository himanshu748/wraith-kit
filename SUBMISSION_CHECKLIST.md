# Wraith Kit submission checklist

**Prepared, not submitted.** Category: **Skeleton Crew**. Student bonus: **Best Student Project: Skeleton Crew**, solo. No publishing, hosting, posting or submission is authorized by this checklist.

Official rules checked 20 Nov 2026: [Kiroween rules](https://kiroween.devpost.com/rules). Deadline: **4 Dec 2026, 2:00 PM Pacific Standard Time**, which is **5 Dec 2026, 3:30 AM IST**. Recheck the actual form and rules before release. Dates and eligibility here are preparation notes, not a confirmation that the entrant qualifies.

## Local product and evidence

- [x] Dedicated Wraith Kit repository and MIT license exist locally.
- [x] Root `.kiro` requirements, steering, hooks and custom-agent configuration are present; `.kiro` is not ignored.
- [x] Submission story, video shotlist, blog draft and social draft are prepared.
- [x] Record local typecheck, lint, regression/property tests, core-integrity and store-contract results: 360 tests passed with DynamoDB Local enabled; details in [verification](docs/verification.md). A passing fixture test is not a provider test.
- [x] Retain the implementation commit and clean-install smoke in the release handoff. See [committed clean-install evidence](docs/verification.md#committed-clean-install-check).
- [x] Exercise TODO Afterlife through source → proposed rewrite → approval → downloaded patch. Show dry-run honestly where no GitHub token is configured.
- [x] Exercise Notice Ghoul through fixture polling → repeated/corrected notices → uncertain date → confirmation → digest and `.ics`.
- [x] Inspect desktop/mobile layouts, keyboard, reduced motion and JavaScript-disabled forms; retain actual axe and browser results.
- [x] Confirm both apps import the same unmodified core, and that each app has its own runnable README.
- [x] Rehearse the app-authoring guide. A non-Kiro agent ran it on a clean tree on 21 Nov in 5 min 43 s including the full suite ([E13](docs/experiments.md#e13-kiro-retry-on-21-nov-a-labelled-wraith-mcp-call-and-the-guide-rehearsal)). Human timing stays unmeasured; the Kiro `app-smith` rehearsal remains pending under the monthly usage cap.
- [x] Reconcile README, app READMEs, `KIRO_USAGE.md`, this checklist and the local demo with the final implementation and known limitations. Clean Git-archive quickstarts passed. The local demo was recorded and verified on 21 Nov.

## Required Kiro evidence

- [x] Earlier Kiro CLI planning/foundation and hook experiments are documented in `KIRO_USAGE.md` and `docs/experiments.md`.
- [x] Codex continuation is identified separately; no Kiro IDE Correctness, Web or Crew use is invented.
- [ ] Verify the configured project hooks in the actual intended Kiro/T3 workspace. Keep manual script runs distinct from automatic hook events.
- [ ] Run the custom agents for their substantive intended work and retain the outputs. Configuration validation alone does not prove agent usage.
- [x] Demonstrate an actual helpful MCP call and label whether it was a documentation server or the project inspection server. Both kinds are recorded in `KIRO_USAGE.md`: the `aws-docs` documentation server call (17 Nov, DynamoDB docs) and the `wraith` project inspection server call (21 Nov, pending actions, explain, audit verify and extension points over real stdio). Neither was Kiro-hosted; the Kiro-hosted call stays pending under the usage cap.
- [x] Answer every rule prompt: surfaces, agents, hooks, spec versus vibe, steering strategy, MCP, property testing and powers. `KIRO_USAGE.md` answers each; Kiro IDE, Web, Crew and powers are marked unused, and items blocked by the monthly usage limit say so.
- [x] Review the required-tool rule against observed usage. Kiro authored the plan and foundation, and Codex continued implementation. Kiro CLI 3.4.0 discovered both custom agents and both MCP servers on 20 Nov; retries on 20 and 21 Nov were blocked by the account monthly usage limit. Judges determine whether the total Kiro usage is sufficient. See [E12](docs/experiments.md#e12-project-root-kiro-cli-retry-on-20-nov) and [E13](docs/experiments.md#e13-kiro-retry-on-21-nov-a-labelled-wraith-mcp-call-and-the-guide-rehearsal).

## Release and external actions

- [ ] On the author's go, publish the project to public **GitHub**. Verify anonymous access to source, assets and setup instructions.
- [ ] Verify GitHub detects the OSI-approved license and displays it in the repository About area. A local `LICENSE` file does not establish target-side detection.
- [ ] Confirm `.kiro` is visible at the published repository root, with specs, hooks and steering included.
- [ ] Compare every incorporated library/template/tool with README **Pre-existing work**, including versions and licenses; confirm no older project code was copied.
- [ ] On separate authorization, create/configure the sandbox repository, restricted token and webhook. Record a real push → approval → real `[DEMO]` issue result before claiming live GitHub operation.
- [ ] If optional Modal inference will be shown, verify applicable free credits and a no-spend configuration, then retain a real provider result. Otherwise keep `none`; no LLM key is required for the local demonstration.
- [x] Validate both AWS templates with `cfn-lint` and the store contract with actual DynamoDB Local. This is local evidence; SAM CLI and AWS deployment have not run.
- [ ] Deploy only on the author's go after free-tier coverage, account lifetime, quotas, request caps and secrets are verified.
- [ ] Verify the hosted app URLs as a judge would, including login/access instructions and a fallback local path. Keep required access available through **29 Jan 2027** as planned; verify the actual event access requirements before deployment.
- [x] Record and review the actual demo. The local 1080p export runs **2:05** and shows both apps using labelled fictional data, with the resulting patch and calendar downloads. See [the shotlist](VIDEO_SHOTLIST.md).
- [ ] With publication approval, upload the video to YouTube, make it public and verify anonymous playback. Devpost requires that public YouTube link.
- [ ] Fill the actual submission fields and limits, confirm the category and bonus selections, and verify every supplied URL. Do not submit without explicit authorization.

## Bonuses and personal information

| Bonus or requirement | Decision | Remaining evidence |
|---|---|---|
| Best Student Project: Skeleton Crew | Targeted; solo entry | Author supplies LinkedIn profile, student email, year/degree and school name privately in the form. Current enrollment must be true and proof supplied if requested. None of these details is invented or stored in this repo. |
| Best Demo | Targeted through the real two-app journey | Local video recorded. Public YouTube URL and hosted app access remain pending. Eligibility/ranking is determined by the organizers; no award claim. |
| Bonus Blog | Draft prepared | Author-approved public third-party blog post during the submission period, explicitly mentioning Kiroween 2026, and its actual URL. |
| Social Blitz | Draft prepared for author's rewrite | Post begins with `#KiroweenHackathon26`; author provides their own favourite Kiro feature and concrete effect on the build. Publish within the submission period only on their go and retain the actual URL. |
| Kiro credits | Author previously reported received/redeemed | Do not request or purchase more automatically. A prior redemption does not imply credits remain available. |
| Best Ghost of Kiroween Past | Not targeted | Prior 2025 registration has not been established for this entry. |
| Best Kiro Crew App | Not targeted | No distinct Kiro Crew app or its required public repository evidence. |
| Best Startup Project | Not targeted | No startup-founder eligibility asserted. |

## Distinctness from the other entry

Wraith Kit is a Skeleton Crew template with two applications. Notice Ghoul automatically ingests and reconciles notice data, and asks about extracted dates. Deadline Graveyard is a separate browser-only tracker for manually entered deadlines with a graveyard presentation. Keep their code, demos and submissions separate. The shared topic and `.ics` output must not be presented as the same product submitted twice.

## Five judging criteria: inspection path

| Criterion | What the judge should be able to inspect |
|---|---|
| Potential Impact | A concrete developer task and student task completed locally, with setup that works without a provider key. No invented adoption or time-saving statistics. |
| Technological Implementation | The actual Kiro work, `.kiro` artifacts, real hook/MCP/agent evidence and named property tests. Clearly identify later Codex work. |
| Design | Evidence before approval; readable state changes; coherent layout, keyboard and mobile behaviour across both apps. |
| Innovation/Idea | A shared approval/provenance contract spanning different app data and actions; explain real differences from alternatives without claiming unique invention. |
| Presentation | A short, understandable two-audience demo, consistent documentation and verified access links. |

Publication, checks, deployment, video upload and submission are separate outcomes. Mark each box from direct evidence, not from a planned command or another box being complete.
