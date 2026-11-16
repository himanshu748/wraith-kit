---
inclusion: always
---

# Tech: stack, rules and commands

## Stack

- Node.js 22 (developed on v22.14.0; `package.json` `engines` allows `^22.13.0 || ^24.0.0 || >=26.0.0`), npm 10.9.2.
- TypeScript in strict mode, ESM only (`"type": "module"`, `module` and `moduleResolution` `NodeNext`). Relative imports in TypeScript use the `.js` suffix (for example `import { pbtRuns } from './pbt.js'`). `tsc` only typechecks (`noEmit`).
- Kiro hook scripts in `scripts/hooks/` are plain ESM `.mjs` files with `// @ts-check` and JSDoc types, typechecked through `allowJs` and `checkJs`. They use Node built-ins only. ESLint lists the Node globals they use by name in `eslint.config.js`; add a global there when a script needs a new one.
- Tests: Vitest with fast-check for property-based tests. Property tests take their run count from `pbtRuns()` in `tests/pbt.ts`, which reads `WRAITH_PBT_RUNS` (hooks and `npm run test:fast` set it to 20; `npm test` leaves it unset, so fast-check's default applies). Write `fc.assert(property, { numRuns: pbtRuns() })`.

## The skeleton's runtime entries

The skeleton is one package with separate entries, so the core stays small (PLAN.md section 5.1):

| Entry | Contents |
|---|---|
| `core` | The pure pipeline. Zero runtime npm dependencies, Node built-ins only, under a line budget counted by a script |
| `node` | `node:http` server, JSON-lines file store, interval scheduler |
| `aws` | Lambda Function URL handler, scheduled tick handler, DynamoDB store |
| `llm` | The LLM adapter and its providers |
| `ui` | The approval UI |
| `mcp` | The `wraith` MCP server |
| `testing` | Fakes and fast-check arbitraries for app authors |

Never add a runtime dependency to `core`. A dependency anywhere else needs a reason, and every package in any `package.json` must be listed in README "Pre-existing work" with its version and license (the commit guard checks this).

## Free tiers only

- AWS: free tier only, two stacks (`todo-afterlife` and `notice-ghoul-demo`), each with a daily request cap (PLAN.md section 11.2). Nothing is deployed without the author's go.
- LLM: one adapter, selected by `WRAITH_LLM_PROVIDER=none|modal|ollama`. The default is `none`, which sends nothing anywhere and always runs the deterministic fallback, so judges can test everything with no key. `modal` is a Modal Dedicated Endpoint used within the Starter plan's free monthly credits, under a spend limit the author sets. `ollama` is a local model, local mode only. Both speak the OpenAI-compatible Chat Completions API through one `fetch` client, with no vendor SDK (PLAN.md section 5.5).
- A daily call cap per app keeps LLM usage inside the free credits. Hosted stacks run with `none` unless the author says go for Modal.

## Confirm every API in official docs

Confirm every API, CLI flag, config field and file format in the official docs before using it (the AWS Documentation MCP server for AWS; kiro.dev for Kiro; the vendor's own pages for GitHub, Modal, Ollama, npm packages and RFC 5545). Never guess. Cite the page in the spec's design.md. Mark anything not yet confirmed as "to confirm", in code comments and docs alike, and leave it marked until it is checked.

## Secrets

Secrets live only in environment variables or AWS SSM Parameter Store. Never put a secret in code, tests, fixtures, logs, audit entries, prompts or the repo. Tests that need a token-shaped string build it from parts at runtime. `.env` files are gitignored except `.env.example`, and the commit guard scans staged changes for token patterns.

## Writing rules

- Plain English. No U+2014 em dashes in any file (the commit guard blocks them); use commas, periods or parentheses.
- No invented numbers or results. Report what a command printed.

## Commands

Run these from the repo root:

```sh
npm run typecheck   # tsc, strict, no output files
npm run lint        # ESLint with the typescript-eslint recommended rules
npm test            # Vitest; property tests use fast-check's default run count
npm run test:fast   # the same with WRAITH_PBT_RUNS=20
npm run guard       # the commit guard by hand on the staged index (stage first)
npm run spec:trace  # requirement ID traceability for .kiro/specs/ (strict)
```

Before every commit: typecheck, lint, test, then stage files by name and run `npm run guard`. Stage with `git add` in one shell call and commit in the next; the commit guard blocks `git commit -a`, pathspecs and a `git add` chained before the commit.
