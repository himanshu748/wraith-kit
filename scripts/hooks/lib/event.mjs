// @ts-check
// Reading the hook event that Kiro sends on STDIN.
//
// Facts from the official docs (kiro.dev/docs/hooks and /hooks/types, read 16 Nov 2026):
// command hooks get the event as JSON on STDIN with `hook_event_name`, `cwd`,
// `session_id`, and for tool triggers `tool_name` and `tool_input`. The docs show
// `tool_input.path` for `read_file`, but they do not name the field that holds a
// shell command, nor the fields of a PostFileSave event. Experiments E2 and E4
// (docs/experiments.md) record what CLI V3 actually sends. Until then the helpers
// below check several candidate field names.

/** @typedef {Record<string, unknown>} HookEvent */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses the STDIN text of a hook. Returns null for empty text, invalid JSON
 * or JSON that is not an object.
 *
 * @param {unknown} text
 * @returns {HookEvent | null}
 */
export function parseEvent(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return null;
  }
  try {
    const value = JSON.parse(text);
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

/** Field names that may hold the command string of a shell tool call, in the order they are checked. */
export const COMMAND_FIELDS = Object.freeze([
  'command',
  'cmd',
  'commandLine',
  'command_line',
  'shell_command',
  'script',
]);

/**
 * Returns the command string of a shell tool call, or null if no candidate
 * field holds a string. A `tool_input` that is itself a string is returned as is.
 *
 * @param {HookEvent | null} event
 * @returns {string | null}
 */
export function shellCommandOf(event) {
  const input = event?.tool_input;
  if (typeof input === 'string') {
    return input;
  }
  if (!isObject(input)) {
    return null;
  }
  for (const field of COMMAND_FIELDS) {
    const value = input[field];
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === 'string')) {
      return value.join(' ');
    }
  }
  return null;
}

/** Field names that may hold a file path, in the order they are checked. */
export const PATH_FIELDS = Object.freeze([
  'path',
  'file_path',
  'filePath',
  'file',
  'filename',
  'target',
  'target_file',
  'targetFile',
  'source',
  'destination',
  'dest',
  'paths',
  'files',
  'file_paths',
  'filePaths',
]);

/**
 * Collects path strings from the candidate fields of one object. Arrays of
 * strings are allowed, and so are arrays of objects that have path fields
 * (for example a list of edits).
 *
 * @param {unknown} value
 * @returns {string[]}
 */
function pathsIn(value) {
  if (!isObject(value)) {
    return [];
  }
  /** @type {string[]} */
  const found = [];
  for (const field of PATH_FIELDS) {
    const candidate = value[field];
    if (typeof candidate === 'string' && candidate !== '') {
      found.push(candidate);
    } else if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === 'string' && item !== '') {
          found.push(item);
        } else if (isObject(item)) {
          found.push(...pathsIn(item));
        }
      }
    }
  }
  for (const nested of Object.values(value)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        if (isObject(item)) {
          found.push(...pathsIn(item));
        }
      }
    }
  }
  return [...new Set(found)];
}

/**
 * Target paths of a write tool call (from `tool_input`). An empty array means
 * the payload shape is unknown.
 *
 * @param {HookEvent | null} event
 * @returns {string[]}
 */
export function targetPathsOf(event) {
  return pathsIn(event?.tool_input);
}

/**
 * Paths named by a file event such as PostFileSave: top-level fields first,
 * then `tool_input`.
 *
 * @param {HookEvent | null} event
 * @returns {string[]}
 */
export function savedPathsOf(event) {
  return [...new Set([...pathsIn(event), ...pathsIn(event?.tool_input)])];
}

/**
 * Every string inside a JSON value, depth first. Used as a fallback when no
 * known command field is present.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function stringsIn(value) {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => stringsIn(item));
  }
  if (isObject(value)) {
    return Object.values(value).flatMap((item) => stringsIn(item));
  }
  return [];
}

/**
 * Reads all of STDIN as text. Returns '' when STDIN is a terminal. Stops
 * waiting after `timeoutMs` and returns what arrived, so a hook never hangs on
 * a pipe that stays open.
 *
 * @param {number} [timeoutMs]
 * @returns {Promise<string>}
 */
export function readStdin(timeoutMs = 5000) {
  if (process.stdin.isTTY) {
    return Promise.resolve('');
  }
  return new Promise((resolve) => {
    /** @type {Buffer[]} */
    const chunks = [];
    const finish = () => {
      clearTimeout(timer);
      process.stdin.removeAllListeners('data');
      process.stdin.removeAllListeners('end');
      process.stdin.removeAllListeners('error');
      process.stdin.pause();
      resolve(Buffer.concat(chunks).toString('utf8'));
    };
    const timer = setTimeout(finish, timeoutMs);
    process.stdin.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
  });
}
