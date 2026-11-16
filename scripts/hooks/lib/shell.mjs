// @ts-check
// A small shell tokenizer and git commit detection, shared by commit-guard and
// todo-afterlife-precommit (PLAN.md section 10.4).
//
// Limits, recorded in KIRO_USAGE.md too: commands hidden in scripts
// (`npm run x`, `./commit.sh`), git aliases (`git ci`) and strings run by
// another shell (`sh -c '...'`, `bash -c`, `eval`, `xargs`) are not detected.
// Commands inside `$(...)` and backticks are detected. A `git commit` typed in
// a terminal never reaches a Kiro hook at all.

/**
 * One simple command: its words after quote removal. Redirections and their
 * targets are left out.
 *
 * @typedef {{ words: string[] }} SimpleCommand
 */

/**
 * @typedef {object} SplitResult
 * @property {SimpleCommand[]} commands Every simple command, in the order its
 *   text ends (so a command inside `$(...)` comes before the command around it).
 * @property {boolean} complete False when a quote, `$(` or here-document is
 *   left open.
 */

/**
 * @typedef {object} Parser
 * @property {string} text
 * @property {number} i
 * @property {boolean} ok
 * @property {SimpleCommand[]} all
 */

const BLANK = new Set([' ', '\t', '\r']);

/**
 * Splits a shell command line into simple commands. Respects single quotes,
 * double quotes, backslash escapes, `$(...)` (also inside double quotes),
 * backticks, comments and here-documents, and splits on `&&`, `||`, `;`, `|`,
 * `&`, parentheses and newlines.
 *
 * @param {string} text
 * @returns {SplitResult}
 */
export function splitCommands(text) {
  /** @type {Parser} */
  const parser = { text, i: 0, ok: true, all: [] };
  parseList(parser, false);
  return { commands: parser.all, complete: parser.ok };
}

/**
 * Parses commands until the end of the text, or until the `)` that closes a
 * command substitution when `inSubstitution` is true.
 *
 * @param {Parser} p
 * @param {boolean} inSubstitution
 */
function parseList(p, inSubstitution) {
  const { text } = p;
  /** @type {string[]} */
  let words = [];
  /** @type {string | null} */
  let word = null;
  let skipNextWord = false;
  /** @type {{ stripTabs: boolean } | null} */
  let pendingHeredoc = null;
  /** @type {{ delimiter: string, stripTabs: boolean }[]} */
  const heredocs = [];

  const finishWord = () => {
    if (word === null) {
      return;
    }
    if (pendingHeredoc) {
      heredocs.push({ delimiter: word, stripTabs: pendingHeredoc.stripTabs });
      pendingHeredoc = null;
    } else if (skipNextWord) {
      skipNextWord = false;
    } else {
      words.push(word);
    }
    word = null;
  };
  const finishCommand = () => {
    finishWord();
    if (words.length > 0) {
      p.all.push({ words });
    }
    words = [];
  };
  const readHeredocBodies = () => {
    for (const heredoc of heredocs) {
      let found = false;
      while (p.i < text.length) {
        let end = text.indexOf('\n', p.i);
        if (end < 0) {
          end = text.length;
        }
        let line = text.slice(p.i, end);
        p.i = Math.min(end + 1, text.length);
        if (heredoc.stripTabs) {
          line = line.replace(/^\t+/, '');
        }
        if (line === heredoc.delimiter) {
          found = true;
          break;
        }
      }
      if (!found) {
        p.ok = false;
      }
    }
    heredocs.length = 0;
  };

  while (p.i < text.length) {
    const c = text[p.i];
    const next = text[p.i + 1];

    if (c === '\\') {
      if (next === undefined) {
        p.i += 1;
      } else if (next === '\n') {
        p.i += 2;
      } else {
        word = (word ?? '') + next;
        p.i += 2;
      }
      continue;
    }
    if (c === "'") {
      const end = text.indexOf("'", p.i + 1);
      if (end < 0) {
        p.ok = false;
        word = (word ?? '') + text.slice(p.i + 1);
        p.i = text.length;
        break;
      }
      word = (word ?? '') + text.slice(p.i + 1, end);
      p.i = end + 1;
      continue;
    }
    if (c === '"') {
      word = (word ?? '') + readDoubleQuoted(p);
      continue;
    }
    if (c === '`') {
      word = (word ?? '') + readBackticks(p);
      continue;
    }
    if (c === '$' && next === '(') {
      const start = p.i;
      p.i += 2;
      parseList(p, true);
      word = (word ?? '') + text.slice(start, p.i);
      continue;
    }
    if (c === '#' && word === null) {
      const end = text.indexOf('\n', p.i);
      p.i = end < 0 ? text.length : end;
      continue;
    }
    if (BLANK.has(c)) {
      finishWord();
      p.i += 1;
      continue;
    }
    if (c === '\n') {
      finishCommand();
      p.i += 1;
      readHeredocBodies();
      continue;
    }
    if (c === ')') {
      finishCommand();
      p.i += 1;
      if (inSubstitution) {
        return;
      }
      continue;
    }
    if (c === '(') {
      finishCommand();
      p.i += 1;
      continue;
    }
    if (c === '&' && next === '>') {
      finishWord();
      p.i += text[p.i + 2] === '>' ? 3 : 2;
      skipNextWord = true;
      continue;
    }
    if (c === ';' || c === '&' || c === '|') {
      finishCommand();
      p.i += 1;
      while (p.i < text.length && (text[p.i] === c || (c === '|' && text[p.i] === '&'))) {
        p.i += 1;
      }
      continue;
    }
    if (c === '<' || c === '>') {
      // A word of digits right before the operator is a file descriptor.
      if (word !== null && /^[0-9]+$/.test(word)) {
        word = null;
      } else {
        finishWord();
      }
      if (text.startsWith('<<<', p.i)) {
        p.i += 3;
        skipNextWord = true;
      } else if (text.startsWith('<<', p.i)) {
        p.i += 2;
        let stripTabs = false;
        if (text[p.i] === '-') {
          stripTabs = true;
          p.i += 1;
        }
        pendingHeredoc = { stripTabs };
      } else {
        p.i += 1;
        if (text[p.i] === '>' || text[p.i] === '|' || text[p.i] === '&') {
          p.i += 1;
        }
        skipNextWord = true;
      }
      continue;
    }
    word = (word ?? '') + c;
    p.i += 1;
  }
  finishCommand();
  if (heredocs.length > 0) {
    p.ok = false;
  }
  if (inSubstitution) {
    // The text ended before the `)` that closes the substitution.
    p.ok = false;
  }
}

/**
 * Reads a double-quoted string starting at the opening quote and returns its
 * value. A `$(...)` inside is parsed as commands and kept as raw text.
 *
 * @param {Parser} p
 * @returns {string}
 */
function readDoubleQuoted(p) {
  const { text } = p;
  let out = '';
  p.i += 1;
  while (p.i < text.length) {
    const c = text[p.i];
    const next = text[p.i + 1];
    if (c === '"') {
      p.i += 1;
      return out;
    }
    if (c === '\\') {
      if (next === '"' || next === '\\' || next === '$' || next === '`') {
        out += next;
        p.i += 2;
      } else if (next === '\n') {
        p.i += 2;
      } else {
        out += c;
        p.i += 1;
      }
      continue;
    }
    if (c === '$' && next === '(') {
      const start = p.i;
      p.i += 2;
      parseList(p, true);
      out += text.slice(start, p.i);
      continue;
    }
    if (c === '`') {
      out += readBackticks(p);
      continue;
    }
    out += c;
    p.i += 1;
  }
  p.ok = false;
  return out;
}

/**
 * Reads a backtick command substitution starting at the opening backtick,
 * parses its body as commands and returns the raw text.
 *
 * @param {Parser} p
 * @returns {string}
 */
function readBackticks(p) {
  const { text } = p;
  const start = p.i;
  let body = '';
  p.i += 1;
  while (p.i < text.length) {
    const c = text[p.i];
    if (c === '\\' && (text[p.i + 1] === '`' || text[p.i + 1] === '\\' || text[p.i + 1] === '$')) {
      body += text[p.i + 1];
      p.i += 2;
      continue;
    }
    if (c === '`') {
      p.i += 1;
      const inner = splitCommands(body);
      p.all.push(...inner.commands);
      if (!inner.complete) {
        p.ok = false;
      }
      return text.slice(start, p.i);
    }
    body += c;
    p.i += 1;
  }
  p.ok = false;
  return text.slice(start);
}

/** Words that may come before the real command name. */
const PREFIX_WORDS = new Set(['!', '{', '}', 'if', 'then', 'else', 'elif', 'do', 'while', 'until', 'time', 'command', 'builtin', 'exec', 'nohup']);
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
/** `env` options that take the next word as their value. */
const ENV_OPTIONS_WITH_VALUE = new Set(['-u', '-C', '-P', '-S', '--unset', '--chdir', '--split-string']);
/** git global options that take the next word as their value (git(1)). */
const GIT_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--attr-source']);
/** git global options that print something and exit without running a subcommand. */
const GIT_TERMINAL_OPTIONS = new Set(['-h', '--help', '-v', '--version', '--exec-path', '--html-path', '--man-path', '--info-path']);

/**
 * @param {string} word
 * @returns {string}
 */
function commandName(word) {
  const slash = word.lastIndexOf('/');
  return slash >= 0 ? word.slice(slash + 1) : word;
}

/**
 * Finds a git invocation in one simple command. Skips leading `VAR=value`
 * assignments, `env` with its options, and words such as `command` or `!`.
 * Then skips git's global options (`-C <path>`, `-c <key>=<value>`,
 * `--git-dir=<path>`, `--work-tree <path>`, `--no-pager` and the like).
 *
 * @param {string[]} words
 * @returns {{ subcommand: string, args: string[] } | null}
 */
export function gitInvocation(words) {
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    if (ASSIGNMENT.test(word) || PREFIX_WORDS.has(word)) {
      i += 1;
      continue;
    }
    if (commandName(word) === 'env') {
      i += 1;
      while (i < words.length && words[i].startsWith('-')) {
        const option = words[i];
        i += 1;
        if (option === '--') {
          break;
        }
        if (ENV_OPTIONS_WITH_VALUE.has(option)) {
          i += 1;
        }
      }
      continue;
    }
    break;
  }
  if (i >= words.length || commandName(words[i]) !== 'git') {
    return null;
  }
  i += 1;
  while (i < words.length) {
    const word = words[i];
    if (GIT_TERMINAL_OPTIONS.has(word)) {
      return null;
    }
    if (GIT_OPTIONS_WITH_VALUE.has(word)) {
      i += 2;
      continue;
    }
    if (word.startsWith('-')) {
      i += 1;
      continue;
    }
    return { subcommand: word, args: words.slice(i + 1) };
  }
  return null;
}

/**
 * Long options of `git commit` (git-commit(1)) and what they take:
 * 'flag' takes nothing, 'value' takes a value (`--opt=v` or `--opt v`),
 * 'optional' takes a value only in the `--opt=v` form.
 *
 * @type {Readonly<Record<string, 'flag' | 'value' | 'optional'>>}
 */
const COMMIT_LONG_OPTIONS = Object.freeze({
  all: 'flag',
  patch: 'flag',
  interactive: 'flag',
  'reuse-message': 'value',
  'reedit-message': 'value',
  fixup: 'value',
  squash: 'value',
  'reset-author': 'flag',
  short: 'flag',
  branch: 'flag',
  porcelain: 'flag',
  long: 'flag',
  null: 'flag',
  file: 'value',
  author: 'value',
  date: 'value',
  message: 'value',
  template: 'value',
  signoff: 'flag',
  trailer: 'value',
  verify: 'flag',
  'allow-empty': 'flag',
  'allow-empty-message': 'flag',
  cleanup: 'value',
  edit: 'flag',
  amend: 'flag',
  include: 'flag',
  only: 'flag',
  'pathspec-from-file': 'value',
  'pathspec-file-nul': 'flag',
  'untracked-files': 'optional',
  verbose: 'flag',
  quiet: 'flag',
  'dry-run': 'flag',
  status: 'flag',
  'gpg-sign': 'optional',
});

/** Short options of `git commit` whose value is the rest of the cluster or the next word. */
const COMMIT_SHORT_WITH_VALUE = new Set(['m', 'F', 'C', 'c', 't']);
/** Short options whose optional value can only be the rest of the cluster (`-S<keyid>`, `-u<mode>`). */
const COMMIT_SHORT_OPTIONAL = new Set(['S', 'u']);

/** @type {Readonly<Record<string, string>>} */
const UNSAFE_SHORT = Object.freeze({ a: '-a/--all', i: '-i/--include', o: '-o/--only', p: '-p/--patch' });
/** @type {Readonly<Record<string, string>>} */
const UNSAFE_LONG = Object.freeze({
  all: '-a/--all',
  include: '-i/--include',
  only: '-o/--only',
  patch: '-p/--patch',
  interactive: '--interactive',
  'pathspec-from-file': '--pathspec-from-file',
});

/**
 * Resolves a long option name, accepting a unique prefix as git does
 * (gitcli(7)). Returns null for unknown or ambiguous names.
 *
 * @param {string} name
 * @returns {string | null}
 */
function resolveLongOption(name) {
  if (Object.hasOwn(COMMIT_LONG_OPTIONS, name)) {
    return name;
  }
  const matches = Object.keys(COMMIT_LONG_OPTIONS).filter((option) => option.startsWith(name));
  return name !== '' && matches.length === 1 ? matches[0] : null;
}

/**
 * Lists the forms in `git commit <args>` that would commit content other than
 * the staged index: -a/--all (also inside clusters such as -am), -i/--include,
 * -o/--only, -p/--patch, --interactive, --pathspec-from-file and pathspec
 * arguments (anything that is not an option or an option's value, and
 * everything after `--`).
 *
 * @param {string[]} args
 * @returns {string[]}
 */
export function unsafeCommitForms(args) {
  /** @type {Set<string>} */
  const problems = new Set();
  /** @type {string[]} */
  const pathspecs = [];
  let afterDashDash = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (afterDashDash) {
      pathspecs.push(arg);
      continue;
    }
    if (arg === '--') {
      afterDashDash = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);
      if (name.startsWith('no-')) {
        continue;
      }
      const option = resolveLongOption(name);
      if (option !== null) {
        if (Object.hasOwn(UNSAFE_LONG, option)) {
          problems.add(UNSAFE_LONG[option]);
        }
        if (COMMIT_LONG_OPTIONS[option] === 'value' && eq < 0) {
          i += 1;
        }
      }
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1) {
      for (let j = 1; j < arg.length; j += 1) {
        const letter = arg[j];
        if (Object.hasOwn(UNSAFE_SHORT, letter)) {
          problems.add(UNSAFE_SHORT[letter]);
        }
        if (COMMIT_SHORT_WITH_VALUE.has(letter)) {
          if (j === arg.length - 1) {
            i += 1;
          }
          break;
        }
        if (COMMIT_SHORT_OPTIONAL.has(letter)) {
          break;
        }
      }
      continue;
    }
    pathspecs.push(arg);
  }
  const list = [...problems];
  if (pathspecs.length > 0) {
    list.push(`pathspec arguments (${pathspecs.join(' ')})`);
  }
  return list;
}

/**
 * True when a git subcommand changes the index, so a commit later in the same
 * shell call would include content the guard did not scan.
 *
 * @param {{ subcommand: string, args: string[] }} git
 * @returns {boolean}
 */
function changesIndex(git) {
  if (['add', 'stage', 'rm', 'mv', 'update-index'].includes(git.subcommand)) {
    return true;
  }
  return git.subcommand === 'apply' && git.args.some((arg) => arg === '--cached' || arg === '--index');
}

/**
 * @typedef {object} CommitInfo
 * @property {string[]} words The words of the simple command that commits.
 * @property {string[]} unsafe Why this commit cannot be checked from the staged index.
 */

/**
 * @typedef {object} CommitDetection
 * @property {boolean} isCommit True when any simple command is a git commit.
 * @property {CommitInfo[]} commits One entry per commit found.
 * @property {string[]} unsafe All reasons from all commits, without repeats.
 */

/**
 * Finds git commits in a shell command line. A commit is any simple command in
 * the chain that invokes git with the subcommand `commit` (`commit-tree`,
 * `log --grep commit` and `echo git commit` are not commits). For each commit
 * it lists the unsafe forms (see unsafeCommitForms) and a `git add`, `git rm`,
 * `git mv`, `git update-index` or `git apply --cached` earlier in the same call.
 *
 * When the line cannot be fully parsed (an open quote, `$(` or
 * here-document) and it mentions git and commit, it is treated as an unsafe
 * commit, so the guard blocks it instead of guessing.
 *
 * @param {string} command
 * @returns {CommitDetection}
 */
export function detectCommit(command) {
  const { commands, complete } = splitCommands(command);
  /** @type {CommitInfo[]} */
  const commits = [];
  /** @type {string | null} */
  let stagedEarlier = null;
  for (const { words } of commands) {
    const git = gitInvocation(words);
    if (git === null) {
      continue;
    }
    if (git.subcommand === 'commit') {
      const unsafe = unsafeCommitForms(git.args);
      if (stagedEarlier !== null) {
        unsafe.push(`a \`${stagedEarlier}\` earlier in the same command`);
      }
      commits.push({ words, unsafe });
    } else if (stagedEarlier === null && changesIndex(git)) {
      stagedEarlier = `git ${git.subcommand}`;
    }
  }
  if (!complete && /\bgit\b[\s\S]*\bcommit\b/.test(command)) {
    const reason = 'the command could not be fully parsed (an open quote, $( or here-document)';
    if (commits.length === 0) {
      commits.push({ words: [], unsafe: [reason] });
    } else {
      commits[0].unsafe.push(reason);
    }
  }
  const unsafe = [...new Set(commits.flatMap((commit) => commit.unsafe))];
  return { isCommit: commits.length > 0, commits, unsafe };
}
