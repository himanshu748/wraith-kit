// @ts-check
// Pure checks used by the hook scripts. No file system or git access here, so
// every function can be unit tested with plain strings.

import path from 'node:path';

/**
 * Normalises `target` to a POSIX path relative to `root`, or null when it
 * resolves to the root itself or outside it. Relative targets resolve
 * against `base` (default: `root`).
 *
 * @param {string} target
 * @param {string} root
 * @param {string} [base]
 * @returns {string | null}
 */
export function repoRelative(target, root, base = root) {
  const relative = path.relative(path.resolve(root), path.resolve(base, target));
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return relative.split(path.sep).join('/');
}

/**
 * True when `target` resolves to a path inside `root` that has a `.wraith`
 * segment (the local action store and audit log). Relative targets resolve
 * against `base` (default: `root`). The segment is compared without case,
 * because macOS file systems usually ignore case.
 *
 * @param {string} target
 * @param {string} root
 * @param {string} [base]
 * @returns {boolean}
 */
export function isUnderWraithStore(target, root, base = root) {
  const relative = repoRelative(target, root, base);
  return relative !== null && relative.split('/').some((segment) => segment.toLowerCase() === '.wraith');
}

/**
 * True for a repo-relative .ts or .mjs file under skeleton/, apps/<name>/,
 * tests/ or scripts/ (outside node_modules): the files tests-on-save acts on.
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isTestableSource(file) {
  return (
    /^(?:skeleton\/|apps\/[^/]+\/|tests\/|scripts\/).*\.(?:ts|mjs)$/.test(file) &&
    !file.split('/').includes('node_modules')
  );
}

/**
 * Secret patterns for the staged-diff scan. Each pattern names what it finds;
 * the guard reports the name, the file and the line, never the match itself.
 *
 * - GitHub tokens: the ghp_, gho_, ghu_, ghs_, ghr_ and github_pat_ prefixes.
 * - AWS access key IDs: AKIA or ASIA followed by 16 uppercase letters or digits.
 * - `aws_secret_access_key` assignments with a long value.
 * - PEM private key headers.
 * - Modal proxy tokens and secrets (`wk-`, `ws-`) and API tokens (`ak-`, `as-`),
 *   per `modal workspace proxy-tokens --help` on modal 1.5.5, followed by at
 *   least 16 letters or digits.
 *
 * @type {ReadonlyArray<{ name: string, pattern: RegExp }>}
 */
export const SECRET_PATTERNS = Object.freeze([
  { name: 'GitHub token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { name: 'AWS access key ID', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: 'AWS secret access key assignment', pattern: /aws_secret_access_key["']?\s*[:=]\s*["']?[A-Za-z0-9/+=]{30,}/i },
  { name: 'PEM private key', pattern: new RegExp(['-----BEGIN', ' (?:[A-Z0-9]+ )*PRIVATE', ' KEY-----'].join('')) },
  { name: 'Modal token', pattern: /\b(?:wk|ws|ak|as)-[A-Za-z0-9]{16,}/ },
]);

/**
 * @param {string} text
 * @returns {string[]} The names of the secret patterns that match.
 */
export function secretKindsIn(text) {
  return SECRET_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}

/**
 * Added lines of a unified diff (`git diff --cached -U0`), with the file and
 * the line number in the new version.
 *
 * @param {string} diff
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function addedLines(diff) {
  /** @type {{ file: string, line: number, text: string }[]} */
  const added = [];
  let file = '';
  let line = 0;
  let inHeader = false;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      inHeader = true;
      file = '';
      continue;
    }
    if (inHeader) {
      // Only header lines name the file; inside a hunk, "+++ x" is an added line "++ x".
      if (raw.startsWith('+++ ')) {
        file = unquoteDiffPath(raw.slice(4));
      }
      const hunkStart = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (hunkStart) {
        inHeader = false;
        line = Number(hunkStart[1]);
      }
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith('+') && file !== '') {
      added.push({ file, line, text: raw.slice(1) });
      line += 1;
    } else if (raw.startsWith(' ')) {
      line += 1;
    }
  }
  return added;
}

/**
 * @param {string} value A path from a `+++` diff header.
 * @returns {string}
 */
function unquoteDiffPath(value) {
  let text = value.replace(/\t$/, '');
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      text = JSON.parse(text);
    } catch {
      text = text.slice(1, -1);
    }
  }
  return text.startsWith('b/') ? text.slice(2) : text;
}

/**
 * True for `.env` and `.env.*` files, except `.env.example`.
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isForbiddenEnvFile(file) {
  const name = path.posix.basename(file.replaceAll('\\', '/'));
  return /^\.env(?:\..*)?$/.test(name) && name !== '.env.example';
}

const EM_DASH = '\u2014';

/**
 * @param {string} text
 * @returns {boolean} True when the text contains U+2014 (em dash).
 */
export function hasEmDash(text) {
  return text.includes(EM_DASH);
}

/**
 * The README section under the exact heading `## Pre-existing work`, up to
 * the next level-1 or level-2 heading. Null if there is no such heading.
 *
 * @param {string} readme
 * @returns {string | null}
 */
export function preexistingWorkSection(readme) {
  const lines = readme.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '## Pre-existing work');
  if (start < 0) {
    return null;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2} /.test(line));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

const DEPENDENCY_FIELDS = Object.freeze(['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']);

/**
 * Package names from the dependency fields of any of the given package.json
 * objects that do not appear in backticks inside the README section
 * `## Pre-existing work`. Sorted, without repeats.
 *
 * @param {unknown[]} packageJsons Parsed package.json files.
 * @param {string} readme README.md text.
 * @returns {string[]}
 */
export function missingFromPreexistingWork(packageJsons, readme) {
  const section = preexistingWorkSection(readme) ?? '';
  /** @type {Set<string>} */
  const names = new Set();
  for (const pkg of packageJsons) {
    if (typeof pkg !== 'object' || pkg === null) {
      continue;
    }
    for (const field of DEPENDENCY_FIELDS) {
      const deps = /** @type {Record<string, unknown>} */ (pkg)[field];
      if (typeof deps === 'object' && deps !== null) {
        for (const name of Object.keys(deps)) {
          names.add(name);
        }
      }
    }
  }
  return [...names].filter((name) => !section.includes(`\`${name}\``)).sort();
}
