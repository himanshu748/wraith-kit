# Requirements: app-authoring

## Introduction

App authoring makes the Skeleton Crew claim reproducible: a developer can build a third app from public extension points, and tests show that both supplied apps use the same unmodified skeleton. PLAN.md sections 5.1, 8, 10.2 and 10.5 define the scope.

**Status.** Requirements authored by Codex through T3 Code on 17 Nov 2026. The template, scaffold and integrity suite do not exist yet; the 15-minute guide is a stub. No timed rehearsal has run. Design and tasks follow the core design.

## Glossary

- **Minimal app:** one source, one rule and one action kind registered through `defineApp`.
- **Public entry:** an export declared by the skeleton package.
- **Loaded-file map:** real source paths and SHA-256 hashes reported by each app's separate test process.
- **Rehearsal:** an observed scratch-app build, with agent and human timings reported separately.

## Requirements

### Requirement 1: Minimal template and safe scaffold

**User story:** As a developer, I want a small starter app, so that I can learn the extension points without copying either demo's internals.

#### Acceptance criteria

1. THE skeleton SHALL ship a minimal app under `skeleton/template/` containing one source, one rule and one action kind.
2. THE template SHALL use only public skeleton exports and SHALL run locally with no key or external service.
3. THE scaffold SHALL create a named app under `apps/` from that template and provide commands to run and test it.
4. IF the requested name is invalid, escapes `apps/` or names an existing destination, THEN THE scaffold SHALL refuse without overwriting files.
5. THE scaffold SHALL neither modify skeleton source nor copy skeleton implementation into the app.
6. THE generated example SHALL demonstrate a proposed action and approval unless its kind is explicitly declared safe with a written reason.

### Requirement 2: Six independent integrity checks

**User story:** As a judge, I want executable evidence that the apps share the skeleton, so that common-looking code is not mistaken for a reusable template.

#### Acceptance criteria

1. THE integrity suite SHALL verify that both app folders resolve the skeleton package to the same real path under `/skeleton`.
2. THE suite SHALL verify that every skeleton import under `apps/` uses a declared public entry and reject relative or deep imports into skeleton source.
3. THE suite SHALL reject any app file with the same content hash as a skeleton source file and any app file carrying the skeleton source marker banner.
4. THE suite SHALL start each app in a separate process and compare every reported loaded skeleton file's SHA-256 with the corresponding file under `skeleton/src` on disk.
5. THE loaded-file maps SHALL include the core entry and every other skeleton source actually loaded by that process, not require identical maps for unrelated runtime entries.
6. THE comparison SHALL use current on-disk source rather than Git HEAD, allowing legitimate skeleton changes to be tested before committing them.
7. THE suite SHALL verify that exported registries and the object returned by `defineApp` are frozen against monkey-patching.
8. THE suite SHALL reject app identifiers or folder names in `skeleton/src`, preserving the core's independence from either app.
9. THE test fixtures SHALL demonstrate rejection for a copied file, forbidden import, altered loaded-file hash, missing core entry and mutable registry.

### Requirement 3: Integrity checks in the working path

**User story:** As a maintainer, I want reuse checks in the normal workflow, so that a later shortcut cannot silently fork the skeleton.

#### Acceptance criteria

1. THE integrity suite SHALL run in `npm test` and the commit guard once both apps exist.
2. THE skeleton-warden review instructions SHALL require the integrity suite and record its actual result, or a precise reason it could not run.
3. THE AWS runtime bundle checks SHALL independently ensure all bundled skeleton inputs come from `skeleton/src`, as specified by `runtimes`.
4. THE guide SHALL explain which checks prove shared source and SHALL not present source hashes alone as proof of deployed runtime behaviour.

### Requirement 4: A complete authoring guide

**User story:** As a first-time app author, I want a short end-to-end guide, so that I can receive an event, propose an action and inspect its result.

#### Acceptance criteria

1. THE guide at `docs/make-your-own-app-in-15-min.md` SHALL begin with prerequisites, scaffold and local run commands, and one realistic input with its expected action.
2. THE guide SHALL teach the minimal source, rule and action path before optional records, advisors, aggregates, views, themes and other extension points.
3. THE guide SHALL show how to test duplicate events, rule ordering and approval through the shared testing entry.
4. THE guide SHALL explain how to add capabilities by extending the shared skeleton contract rather than copying or patching core code in an app.
5. THE `skeleton-authoring` steering file SHALL remain consistent with the guide and link to it.
6. THE title's `15 min` SHALL be described as a goal until observed timings support a narrower claim, never a measured promise without evidence.

### Requirement 5: Honest rehearsal evidence

**User story:** As a reader, I want observed setup timings and failures, so that I can judge the guide's usefulness without fabricated success claims.

#### Acceptance criteria

1. WHEN the skeleton and guide are ready, THE app-smith rehearsal SHALL build a scratch app from the guide without editing the skeleton or either supplied app.
2. THE rehearsal SHALL begin on a clean tree, record start and finish times and report agent elapsed time separately from any human timing.
3. THE report SHALL list commands run, observed results, failures and fixes needed in the guide, without calling a partial journey complete.
4. THE scratch app SHALL never be committed; cleanup SHALL be performed by the main session after inspecting the rehearsal changes and preserving unrelated work.
5. THE README SHALL report the author's separately timed human run only after it occurs, with its setup conditions and result.
6. IF no human run has occurred, THEN THE documentation SHALL say `human timing not measured` instead of substituting agent time.

## Notes for the design phase

- Confirm Node package exports, conditional source resolution under the installed tsx version and the mechanism that observes actually loaded files. Hashing filenames merely claimed by the app is weaker than observing module loads; document and test that distinction. No API is chosen by this requirement alone.
- Resolve scaffold workspace registration and dependency handling without overwriting existing files. Choose the public package name alongside `wraith-core` design.
- The six checks in PLAN.md section 8 map to 2.1 (resolution), 2.2 (exports), 2.3 (forks), 2.4-2.6 (loaded bytes), 2.7 (freezing) and 2.8 (app independence).
- The guide is complete only after the realistic journey runs. Agent configuration validation or a generated folder does not count as an app-smith rehearsal.
