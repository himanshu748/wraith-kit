# Verification record

This record covers the local Wraith Kit implementation on 17 Nov 2026. Local tests, browser interactions, live-provider calls, deployment and publication are separate evidence. Nothing in this record establishes a hosted service or a submitted hackathon entry.

Validation environments: Node.js 26.12.0/npm 11.20.0 and Node.js 22.14.0/npm 10.9.2 on macOS. The final 360-test all-backend suite also passed under Node 22.14.0 in 9.20 seconds. Browser checks used Chromium through Playwright.

## Observed checks

| Check | Observed result | Boundary |
|---|---|---|
| Shared UI regression tests | 11 passed with `npx vitest run skeleton/test/ui.test.ts` | Actual renderer escaping, CSRF form fields, stored candidate indexes, invalid-edit retention, stale/authentication states, effect notices, audit honesty, and keyboard behavior in a VM DOM harness. This is not a browser accessibility result. |
| UI lint | Passed with `npx eslint skeleton/src/ui skeleton/test/ui.test.ts` | UI source and test static checks. |
| UI strict TypeScript check | Passed with `npx tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2023 --module NodeNext --moduleResolution NodeNext --types node skeleton/src/ui/index.ts` | UI and its imported types. Full-project checks are reported separately below. |
| Shared persistent-store contract | 10 tests passed against FileStore and real DynamoDB Local; 40 generated cases exercised persisted idempotency and ordering | CAS collisions, audit preservation, lease recovery and ignored late results. DynamoDB Local is an actual local emulator, not an AWS account or deployed Lambda. |
| Project typecheck and lint | Passed with `npm run typecheck` and `npm run lint` | Static checks across the repository. |
| Lambda bundles | Both app bundles built; each metafile lists the same 15 shared source inputs | Build/source inclusion evidence, not a deployed Lambda test. |
| CloudFormation lint | `cfn-lint` 1.56.2, invoked through `uvx`, passed for both app `template.yaml` files | Template lint only. SAM CLI is not installed and deployment has not been run. |
| Runtime dependency audit | `npm audit --omit=dev` reported zero vulnerabilities | The audit covers published advisories at check time, not all possible defects. |
| Development dependency audit | Seven moderate findings remained in the existing ESLint-related `minimatch` dependency chain | Development toolchain only; no major-version dependency migration was made as part of this build. |
| Full regression/property suite | `WRAITH_DYNAMODB_ENDPOINT=http://127.0.0.1:18765 npm test`: 23 files and 360 tests passed, no skips, in 11.56 seconds | Includes FileStore and actual DynamoDB Local, HTTP authorization, Lambda payload/limit handling, MCP protocol calls, shared-core integrity and the generated app HTTP smoke. Local services and fixtures, not deployed AWS or live GitHub. |
| Real-browser journeys | `npm run test:e2e`: 2 tests passed in 6.1 seconds | Both apps over real local HTTP, native forms and downloads; a second test approves with JavaScript disabled. Details below. |

These checks exercised the final UI and implementation working tree before the implementation commit. The commit and clean-install smoke are recorded separately by the release handoff. A future code change requires the affected checks to run again. With no `WRAITH_DYNAMODB_ENDPOINT`, the five DynamoDB cases are skipped; the all-backend command above explicitly ran them.

## Browser journey evidence

The two-app test opened the real landing pages, exchanged a private one-time sign-in link without recording it, and used the approval UI. TODO Afterlife produced a downloadable patch, labelled issue creation as dry-run, and retained its action count after replay. Notice Ghoul kept invalid correction text visible with an error, accepted a stored candidate, and produced HTML/Markdown digests and an `.ics` file. Both audit pages reported a valid chain; signing out restored the private-data login boundary.

Keyboard checks verified Tab focus on the skip link and opt-in `j` focus on a proposal. At 390 px, the document did not overflow horizontally. With reduced motion enabled, a rendered control had computed transition and animation durations of `0s`. Axe reported zero violations for the scanned queue and audit views using WCAG 2 A/AA and 2.1 AA tags. This automated scan does not establish full accessibility conformance or cover every possible state. The separate no-JavaScript test submitted a native approval form and observed the completed action and patch link. No browser page errors were observed.

## Visual review

The real Chromium screenshots at 1440 px desktop and 390 px mobile were inspected from `output/playwright/`. The landing page uses a readable editorial heading, original ghost artwork and a direct workspace entry. The queue uses a compact navigation rail on desktop and stacked proposals on mobile. Green and amber distinguish the two app contexts without changing the interaction model.

The inspection found and corrected four specific weaknesses:

- Queue rows showed opaque target hashes. They now use the matching source event's subject when it is available, such as a source path and line number.
- The student workspace's output links extended beyond the mobile navigation. Navigation now wraps so those links remain visible.
- The HTML digest used browser-default styling. Its app-owned escaped document now uses the shared stylesheet, an amber theme and direct workspace/download navigation.
- The deadline candidate select exposed clipped JSON and null fields. Candidate choices now use wrapping radio labels and readable field names; stored indexes and the approval contract are unchanged. The current recorded value uses the same readable fields, and the detail heading shows the source subject where available.

The final regenerated queue, digest and mobile confirmation screenshots were inspected after these refinements. Source subjects distinguish the proposal rows; all mobile navigation links and candidate labels are visible; the digest retains the shared typography and amber palette. Screenshots are generated evidence of the rendered views, not published demo URLs or proof of every interaction.

## Evidence limits

- Fixture notices and source comments are synthetic demo data. GitHub issue creation without configured credentials is a dry-run; no real public issue was created by that path.
- No live Modal or Ollama inference result is claimed. Provider contract tests and fallback checks do not establish live-provider behavior.
- AWS deployment, account free-tier eligibility, hosted access and public repository visibility remain unverified until their authorized external steps occur.
- Kiro's prior foundation and experiments are recorded in [KIRO_USAGE.md](../KIRO_USAGE.md) and [experiments.md](experiments.md). The continuation here is Codex-authored; no Kiro IDE Correctness or automatic hook run is inferred from a manual test invocation.
- No video has been recorded or uploaded. Blog, social and Devpost materials are prepared drafts, not published or submitted artifacts.

## Review before commit

Both source adapters and the runtime boundaries were inspected: live GitHub writes require explicit configuration plus approval, model calls are optional and quota-bound, hosted demo sessions cannot access real actions, and tests clear inherited live-integration settings. The secret scan initially flagged two intentional test literals; they now use per-run random fixture values. The commit guard caught and corrected an em dash in a fixture page. Neither finding was an exposed real credential.

## Committed clean-install check

Implementation commit: `84851a773d8f1b2b8b42a73756262472d1804be3`.

A Git archive of that exact commit was extracted into a new temporary directory with no node_modules, local store or build output. `npm ci --no-fund` succeeded under Node 22.14.0/npm 10.9.2. Each documented `npm run dev:todo` / `npm run dev:notices` command then started with an ephemeral loopback port, private configuration outside the checkout and all live integrations disabled. Each private one-time link exchanged successfully, and authenticated `/queue` returned HTTP 200 with seeded proposals. The child processes and temporary checkout/configuration were removed after the check.

Before that implementation commit, the staged text secret scan reported zero findings and zero omitted files. Selected binary browser captures were reviewed separately and committed under [images](images/); their pixels are not covered by the text scanner. Every required commit-guard check passed, including core integrity and fixture labels. All relative Markdown file links resolved. No remote was created and nothing was pushed.
