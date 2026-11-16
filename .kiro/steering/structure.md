---
inclusion: always
---

# Structure: folders, boundaries, naming, tests and spec IDs

## Folder layout

From PLAN.md section 3. Folders marked "later" do not exist yet; create them only in the task that the plan gives them to.

```text
wraith-kit/
  .kiro/
    steering/   product.md, tech.md, structure.md, wraith-domain.md, skeleton-authoring.md
    specs/      one folder per spec (later): wraith-core, llm-adapter, approval-ui, runtimes,
                todo-afterlife, notice-ghoul, wraith-mcp, app-authoring
                (each: requirements.md, design.md, tasks.md)
    hooks/      one JSON file per hook, {"version": "v1", "hooks": [...]}
    agents/     skeleton-warden.json, app-smith.json
    settings/   mcp.json
  skeleton/     the template package (later): package.json with "exports",
                src/{core,node,aws,llm,ui,mcp,testing}, template/ (the minimal app #3), test/
  apps/
    todo-afterlife/   README.md, package.json, src/, fixtures/, template.yaml (SAM), test/ (later)
    notice-ghoul/     README.md, package.json, src/, fixtures/site/, template.yaml (SAM), test/ (later)
  tests/        repo-level tests: tests/hooks/ today; core-integrity.test.ts and
                store-contract.test.ts later
  docs/         experiments.md, make-your-own-app-in-15-min.md, reviews/ (skeleton-warden
                reports), and later architecture.md, run-local.md, deploy-aws.md
  scripts/      hooks/ (Kiro hook scripts and lib/), guard-checks.json; later the core
                budget script and the new-app scaffold
  README.md  KIRO_USAGE.md  LICENSE  PLAN.md  and the later write-up files
```

- `.kiro/` is committed at the repo root and never appears in `.gitignore`.
- `.wraith/` (local action store and audit log), `.scratch/` (experiment labs), `.env*` (except `.env.example`) and `apps/notice-ghoul/config.json` are gitignored. Never commit them.
- npm workspaces (`skeleton`, `apps/*`) are added to the root `package.json` when the first workspace package is created.

## The extension-point boundary

- An app is built only from the skeleton's extension points, passed to `defineApp({...})` (PLAN.md section 5.1).
- Apps import the skeleton only through the entries listed in the skeleton's `package.json` `exports` (`core`, `node`, `aws`, `llm`, `ui`, `mcp`, `testing`). Never import a `skeleton/src/...` path, and never use a relative path into `skeleton/`. The package name and export paths are set in the `wraith-core` spec.
- No app file may copy or patch a skeleton file. Every skeleton source file carries a marker banner, and no app file may carry it.
- The skeleton knows nothing about the apps: no app id or app folder name (`todo-afterlife`, `notice-ghoul`) appears anywhere under `skeleton/src/`.
- `tests/core-integrity.test.ts` checks all of this (PLAN.md section 8). If an app needs something the skeleton does not offer, change the skeleton through its own spec and keep the change app-neutral.

## Naming

- File and folder names are lowercase kebab-case (`commit-guard.mjs`, `spec-trace.mjs`, `make-your-own-app-in-15-min.md`). An app's folder name is its app id.
- Spec folders under `.kiro/specs/` use the planned kebab-case names above. The spec ID parser only accepts lowercase letters, digits and single hyphens in a spec name.
- Test files are `<module>.test.ts`. A hook's JSON file and its script share the hook's name (`.kiro/hooks/store-guard.json` runs `scripts/hooks/store-guard.mjs`).

## Where tests go

- Repo-level tests, including tests of `scripts/`: `tests/**/*.test.ts` (hook script tests in `tests/hooks/`, their fixtures in `tests/hooks/fixtures/`).
- Skeleton tests: `skeleton/test/`. App tests: `apps/<name>/test/`, with app fixtures in `apps/<name>/fixtures/`. Vitest picks up `tests/**/*.test.ts`, `skeleton/**/*.test.ts` and `apps/**/*.test.ts`.
- Property tests use fast-check with `numRuns: pbtRuns()` from `tests/pbt.ts`.
- Tests that need a git repo create one under `os.tmpdir()`, never inside this repo.

## Spec ID convention

`scripts/hooks/spec-trace.mjs` (the `spec-trace` hook and `npm run spec:trace`) parses exactly this format. Use it in every requirements.md, design.md, tasks.md and test.

**requirements.md.** One section per requirement, numbered from 1, each with a user story and an acceptance criteria list in EARS form:

```markdown
### Requirement 2: Deduplicate events

**User story:** As an app author, I want a redelivered webhook to be ignored, so that one event never produces two actions.

#### Acceptance criteria

1. WHEN an event arrives whose idempotency key is already stored, THE core SHALL store no new event and propose no new action.
2. IF two processes write the same event at the same time, THEN THE core SHALL keep exactly one copy.
```

- The heading is exactly `### Requirement <n>: <title>` (`<n>` a positive integer with no leading zero; numbers unique in the file).
- The list sits under the heading `#### Acceptance criteria`. Criterion `<m>` of requirement `<n>` has the ID `<n>.<m>` (the example gives `2.1` and `2.2`). Number the items 1, 2, 3 in order; never reuse or renumber an ID once a design or task cites it.
- Every criterion starts with `WHEN`, `WHILE`, `IF`, `WHERE` or `THE` and contains `SHALL`, in capitals. A criterion may wrap onto following lines.

**design.md.** Cite the criteria a design section or a correctness property covers on one line, between underscores:

```markdown
_Validates: Requirements 2.1, 2.2_
```

**tasks.md.** Each task is a checkbox item numbered from 1, with the criteria it implements on its own line:

```markdown
- [ ] 3. Add the event dedupe check to the store write
  _Requirements: 2.1, 2.2_
```

**Citing another spec.** Prefix the ID with the spec's folder name: `_Requirements: 2.1, wraith-core 4.3_`. In prose, write `wraith-core 4.3`.

Separate IDs with commas (or "and"). The bold form `**Validates: Requirements 2.1**` is accepted too. The checker reports duplicate or malformed IDs, criteria not in EARS form, citations of IDs that do not exist, and IDs that no design or task cites (only once that spec has a design.md or tasks.md).

## How tests name what they check

Every test that checks a requirement or a property says which one, so a reader can trace it both ways:

- Put the ID in the `describe` or `it` name when it is a planned property: `it('P1: the same event twice gives one action', ...)`. Property IDs come from PLAN.md section 9 (`P1` to `P7` for the core, `TA-P1` to `TA-P3` for TODO Afterlife, `NG-P1` to `NG-P4` for Notice Ghoul, `P-H1` to `P-H3` for the hook scripts).
- Put a comment directly above the test for the criteria it covers: `// Validates: wraith-core 2.1, 2.2`. Always include the spec name in test comments.
- The design.md "Correctness properties" section links each property ID to its criteria with a `_Validates: Requirements ..._` line.
