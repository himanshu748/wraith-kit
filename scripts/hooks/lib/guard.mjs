// @ts-check
// Runs the checks listed in scripts/guard-checks.json against the staged index
// of a git repository. Used by scripts/hooks/commit-guard.mjs.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  addedLines,
  hasEmDash,
  isForbiddenEnvFile,
  missingFromPreexistingWork,
  secretKindsIn,
} from './checks.mjs';

/**
 * @typedef {object} GuardCheck
 * @property {string} id
 * @property {string} description
 * @property {boolean} required
 * @property {string} [tool] A path (relative to the repo root) that must exist before the check can run.
 * @property {string[]} [command] Command to run in the repo root; exit 0 passes.
 */

/**
 * @typedef {object} CheckResult
 * @property {string} id
 * @property {'pass' | 'fail' | 'skipped'} status
 * @property {string} [reason]
 */

/** The default list, next to this folder: scripts/guard-checks.json. */
export const DEFAULT_CHECKS_FILE = new URL('../../guard-checks.json', import.meta.url);

/**
 * Time budget for the command checks. The commit-guard hook has a 180 s
 * timeout (.kiro/hooks/commit-guard.json), and a timed-out Pre Tool Use hook
 * lets the tool call run (E5, docs/experiments.md), so the guard stops at
 * 150 s and blocks instead.
 */
export const DEFAULT_BUDGET_MS = 150_000;
const OUTPUT_TAIL_LINES = 15;
const MAX_LISTED = 10;

/**
 * Reads and validates the check list. Throws on a malformed file, so the
 * guard fails closed.
 *
 * @param {URL | string} [file]
 * @returns {GuardCheck[]}
 */
export function loadGuardChecks(file = DEFAULT_CHECKS_FILE) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.checks)) {
    throw new Error('guard-checks.json must be an object with a "checks" array');
  }
  return parsed.checks.map((/** @type {unknown} */ entry, /** @type {number} */ index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`guard-checks.json: check ${index} is not an object`);
    }
    const check = /** @type {Record<string, unknown>} */ (entry);
    if (typeof check.id !== 'string' || check.id === '') {
      throw new Error(`guard-checks.json: check ${index} has no id`);
    }
    const command = check.command;
    if (command !== undefined && (!Array.isArray(command) || command.length === 0 || !command.every((part) => typeof part === 'string'))) {
      throw new Error(`guard-checks.json: check ${check.id} has a malformed command`);
    }
    return {
      id: check.id,
      description: typeof check.description === 'string' ? check.description : '',
      // Anything other than an explicit false counts as required (fail closed).
      required: check.required !== false,
      tool: typeof check.tool === 'string' ? check.tool : undefined,
      command: /** @type {string[] | undefined} */ (command),
    };
  });
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {{ status: number | null, stdout: Buffer, stderr: string }}
 */
function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) {
    throw result.error;
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr.toString('utf8') };
}

/**
 * Like git(), but throws unless git exits 0.
 *
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Buffer}
 */
function gitOk(args, cwd) {
  const result = git(args, cwd);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} exited ${result.status}: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

/**
 * The top level of the git repository that contains `cwd`. Throws outside a repository.
 *
 * @param {string} cwd
 * @returns {string}
 */
export function repoRoot(cwd) {
  return gitOk(['rev-parse', '--show-toplevel'], cwd).toString('utf8').trim();
}

/**
 * @param {Buffer} buffer
 * @returns {string[]}
 */
function nulSeparated(buffer) {
  return buffer.toString('utf8').split('\0').filter((entry) => entry !== '');
}

/**
 * Staged files that are added, copied, modified or renamed.
 *
 * @param {string} root
 * @returns {string[]}
 */
function stagedFiles(root) {
  return nulSeparated(gitOk(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'], root));
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function indexFiles(root) {
  return nulSeparated(gitOk(['ls-files', '-z'], root));
}

/**
 * Content of a file as it is in the index.
 *
 * @param {string} root
 * @param {string} file
 * @returns {Buffer}
 */
function indexContent(root, file) {
  return gitOk(['cat-file', 'blob', `:${file}`], root);
}

/**
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function looksBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0);
}

/**
 * @param {string[]} items
 * @returns {string}
 */
function listed(items) {
  const shown = items.slice(0, MAX_LISTED).join(', ');
  return items.length > MAX_LISTED ? `${shown} and ${items.length - MAX_LISTED} more` : shown;
}

/**
 * Built-in checks. Each returns null when it passes, or the reason it fails.
 *
 * @type {Record<string, (root: string) => string | null>}
 */
const BUILT_IN = {
  'kiro-not-ignored': (root) => {
    /** @type {string[]} */
    const problems = [];
    const sources = [];
    const workingCopy = path.join(root, '.gitignore');
    if (existsSync(workingCopy)) {
      sources.push({ name: '.gitignore', text: readFileSync(workingCopy, 'utf8') });
    }
    if (git(['cat-file', '-e', ':.gitignore'], root).status === 0) {
      sources.push({ name: 'staged .gitignore', text: indexContent(root, '.gitignore').toString('utf8') });
    }
    for (const { name, text } of sources) {
      text.split(/\r?\n/).forEach((line, index) => {
        if (/kiro/i.test(line)) {
          problems.push(`${name} line ${index + 1} mentions kiro`);
        }
      });
    }
    const ignored = git(['check-ignore', '--no-index', '.kiro', '.kiro/hooks/probe.json'], root);
    if (ignored.status === 0) {
      problems.push(`git check-ignore reports that these are ignored: ${ignored.stdout.toString('utf8').trim().split('\n').join(', ')}`);
    } else if (ignored.status !== 1) {
      problems.push(`git check-ignore exited ${ignored.status}: ${ignored.stderr.trim()}`);
    }
    return problems.length > 0 ? listed(problems) : null;
  },

  'license-present': (root) => {
    const found = indexFiles(root).some((file) => /^(?:LICENSE|LICENCE|COPYING)(?:\.md|\.txt)?$/.test(file));
    return found ? null : 'no LICENSE file in the index';
  },

  'secret-scan': (root) => {
    const diff = gitOk(['diff', '--cached', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', '--diff-filter=ACMR'], root).toString('utf8');
    const hits = addedLines(diff).flatMap(({ file, line, text }) =>
      secretKindsIn(text).map((kind) => `${file}:${line} (${kind})`),
    );
    return hits.length > 0 ? `possible secret on an added line: ${listed(hits)}` : null;
  },

  'env-files': (root) => {
    const envFiles = stagedFiles(root).filter((file) => isForbiddenEnvFile(file));
    return envFiles.length > 0 ? `staged environment file: ${listed(envFiles)} (only .env.example may be committed)` : null;
  },

  'deps-in-readme': (root) => {
    const packageFiles = indexFiles(root).filter(
      (file) => path.posix.basename(file) === 'package.json' && !file.split('/').includes('node_modules'),
    );
    if (packageFiles.length === 0) {
      return null;
    }
    if (git(['cat-file', '-e', ':README.md'], root).status !== 0) {
      return 'README.md is not in the index, so its "## Pre-existing work" section cannot be checked';
    }
    const readme = indexContent(root, 'README.md').toString('utf8');
    const packageJsons = packageFiles.map((file) => {
      try {
        return JSON.parse(indexContent(root, file).toString('utf8'));
      } catch {
        throw new Error(`${file} is not valid JSON`);
      }
    });
    const missing = missingFromPreexistingWork(packageJsons, readme);
    return missing.length > 0 ? `not listed in backticks in README "## Pre-existing work": ${listed(missing)}` : null;
  },

  'no-em-dash': (root) => {
    const withDash = stagedFiles(root).filter((file) => {
      const content = indexContent(root, file);
      return !looksBinary(content) && hasEmDash(content.toString('utf8'));
    });
    return withDash.length > 0 ? `U+2014 (em dash) in: ${listed(withDash)}` : null;
  },

  'fixture-demo-label': (root) => {
    const unlabelled = stagedFiles(root).filter((file) => {
      if (!/^apps\/[^/]+\/fixtures\//.test(file)) {
        return false;
      }
      const content = indexContent(root, file);
      return !looksBinary(content) && !content.toString('utf8').includes('DEMO');
    });
    return unlabelled.length > 0 ? `fixture files without the DEMO label: ${listed(unlabelled)}` : null;
  },
};

/**
 * True when at least one apps/<name>/fixtures/ folder exists.
 *
 * @param {string} root
 * @returns {boolean}
 */
function appFixturesExist(root) {
  const apps = path.join(root, 'apps');
  if (!existsSync(apps)) {
    return false;
  }
  return readdirSync(apps).some((name) => {
    const fixtures = path.join(apps, name, 'fixtures');
    return existsSync(fixtures) && statSync(fixtures).isDirectory();
  });
}

/**
 * True when the check's tool exists.
 *
 * @param {GuardCheck} check
 * @param {string} root
 * @returns {boolean}
 */
function toolExists(check, root) {
  if (check.id === 'fixture-demo-label') {
    return appFixturesExist(root);
  }
  return check.tool === undefined || existsSync(path.join(root, check.tool));
}

/**
 * @param {string} text
 * @returns {string}
 */
function tail(text) {
  const lines = text.trimEnd().split(/\r?\n/);
  return lines.slice(-OUTPUT_TAIL_LINES).join('\n');
}

/**
 * Runs one command check with whatever time is left before `deadline`.
 *
 * @param {string[]} command
 * @param {string} root
 * @param {number} deadline Epoch milliseconds.
 * @returns {string | null}
 */
function runCommand(command, root, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    return `${command.join(' ')} not run: the guard's time budget is used up`;
  }
  const [program, ...args] = command;
  const result = spawnSync(program, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: remaining,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error && /** @type {NodeJS.ErrnoException} */ (result.error).code === 'ETIMEDOUT') {
    return `${command.join(' ')} timed out after ${Math.round(remaining / 1000)} s (the guard's time budget)`;
  }
  if (result.error) {
    return `${command.join(' ')} could not run: ${result.error.message}`;
  }
  if (result.status === 0) {
    return null;
  }
  const output = tail(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  const how = result.signal ? `was stopped by ${result.signal}` : `exited ${result.status}`;
  return `${command.join(' ')} ${how}\n${output}`;
}

/**
 * Runs every check in order. A check never throws: an error becomes a failure.
 *
 * Options: `staticOnly` skips checks that run a command (tests use it).
 * `deadline` (epoch milliseconds, default 150 s from now) bounds the command
 * checks: one still running at the deadline is stopped and fails, and later
 * ones fail without running. Experiment E5 showed that a Pre Tool Use hook
 * that hits its Kiro timeout lets the tool call run, so the guard must give up
 * and block before Kiro's timeout does.
 *
 * @param {GuardCheck[]} checks
 * @param {string} root
 * @param {{ staticOnly?: boolean, deadline?: number }} [options]
 * @returns {CheckResult[]}
 */
export function runGuardChecks(checks, root, options = {}) {
  const deadline = options.deadline ?? Date.now() + DEFAULT_BUDGET_MS;
  return checks.map((check) => {
    try {
      const exists = toolExists(check, root);
      const tool = check.tool ?? check.id;
      if (!exists && !check.required) {
        return { id: check.id, status: 'skipped', reason: `${tool} not set up yet` };
      }
      if (check.command !== undefined && options.staticOnly) {
        return { id: check.id, status: 'skipped', reason: '--static-only' };
      }
      if (!exists) {
        return { id: check.id, status: 'fail', reason: `${tool} is not set up (a required check cannot be skipped)` };
      }
      if (check.command !== undefined) {
        const reason = runCommand(check.command, root, deadline);
        return reason === null ? { id: check.id, status: 'pass' } : { id: check.id, status: 'fail', reason };
      }
      const builtIn = BUILT_IN[check.id];
      if (builtIn === undefined) {
        return { id: check.id, status: 'fail', reason: 'unknown check: no built-in check and no command' };
      }
      const reason = builtIn(root);
      return reason === null ? { id: check.id, status: 'pass' } : { id: check.id, status: 'fail', reason };
    } catch (error) {
      return { id: check.id, status: 'fail', reason: `error: ${error instanceof Error ? error.message : String(error)}` };
    }
  });
}

/**
 * One line per check: `<id>: pass`, `<id>: fail: <reason>` or `<id>: skipped: <reason>`.
 *
 * @param {CheckResult[]} results
 * @returns {string}
 */
export function formatResults(results) {
  return results
    .map(({ id, status, reason }) => (reason ? `${id}: ${status}: ${reason}` : `${id}: ${status}`))
    .join('\n');
}

/**
 * True when no check failed. `required` only decides whether a missing tool
 * is a failure or a skip; a check that runs and fails always blocks.
 *
 * @param {CheckResult[]} results
 * @returns {boolean}
 */
export function allChecksPassed(results) {
  return results.every((result) => result.status !== 'fail');
}
