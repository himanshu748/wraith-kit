import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { detectCommit, gitInvocation, splitCommands, unsafeCommitForms } from '../../scripts/hooks/lib/shell.mjs';
import { pbtRuns } from '../pbt.js';

const numRuns = pbtRuns();

function words(command: string): string[][] {
  return splitCommands(command).commands.map((c) => c.words);
}

describe('splitCommands', () => {
  it('splits on &&, ||, ;, |, & and newlines', () => {
    expect(words('a && b || c; d | e\nf & g')).toEqual([['a'], ['b'], ['c'], ['d'], ['e'], ['f'], ['g']]);
  });

  it('keeps operators inside single and double quotes', () => {
    expect(words(`git commit -m "a && b; c | d"`)).toEqual([['git', 'commit', '-m', 'a && b; c | d']]);
    expect(words(`echo 'x; y' "it's"`)).toEqual([['echo', 'x; y', "it's"]]);
  });

  it('handles backslash escapes outside and inside double quotes', () => {
    expect(words('echo a\\;b')).toEqual([['echo', 'a;b']]);
    expect(words('echo "say \\"hi\\" \\$HOME"')).toEqual([['echo', 'say "hi" $HOME']]);
    expect(words('echo one \\\n two')).toEqual([['echo', 'one', 'two']]);
  });

  it('keeps empty quoted words', () => {
    expect(words(`git commit -m ''`)).toEqual([['git', 'commit', '-m', '']]);
  });

  it('parses $(...) inside double quotes, with nested quotes', () => {
    const result = splitCommands(`git commit -m "$(printf '%s' "a;b)")"`);
    expect(result.complete).toBe(true);
    expect(result.commands.map((c) => c.words[0])).toEqual(['printf', 'git']);
    expect(result.commands[1].words.slice(0, 3)).toEqual(['git', 'commit', '-m']);
  });

  it('skips here-document bodies, also inside $(...)', () => {
    expect(words("git commit -F - <<'EOF'\nline; with && ops\nEOF\ngit log")).toEqual([
      ['git', 'commit', '-F', '-'],
      ['git', 'log'],
    ]);
    const nested = splitCommands(`git commit -m "$(cat <<'EOF'\nDon't (break) it; ok\nEOF\n)"`);
    expect(nested.complete).toBe(true);
    expect(nested.commands.map((c) => c.words[0])).toEqual(['cat', 'git']);
  });

  it('drops comments and redirections', () => {
    expect(words('git status # git commit -a')).toEqual([['git', 'status']]);
    expect(words('git commit -m x 2>&1 >/dev/null')).toEqual([['git', 'commit', '-m', 'x']]);
    expect(words('git commit -m x &> log.txt')).toEqual([['git', 'commit', '-m', 'x']]);
    expect(words('git commit -F - <<< "msg"')).toEqual([['git', 'commit', '-F', '-']]);
  });

  it('reports unterminated quotes, substitutions and here-documents', () => {
    expect(splitCommands('echo "abc').complete).toBe(false);
    expect(splitCommands("echo 'abc").complete).toBe(false);
    expect(splitCommands('echo $(git status').complete).toBe(false);
    expect(splitCommands('cat <<EOF\nno end').complete).toBe(false);
    expect(splitCommands('echo fine').complete).toBe(true);
  });
});

describe('gitInvocation', () => {
  it('skips assignments, env, wrappers and git global options', () => {
    expect(gitInvocation(['GIT_AUTHOR_NAME=a', 'env', '-i', 'PATH=/bin', 'git', '--no-pager', 'commit', '-m', 'x'])).toEqual({
      subcommand: 'commit',
      args: ['-m', 'x'],
    });
    expect(gitInvocation(['git', '-C', 'sub', '-c', 'a.b=c', '--git-dir=.git', '--work-tree', '.', 'status'])).toEqual({
      subcommand: 'status',
      args: [],
    });
    expect(gitInvocation(['/usr/bin/git', 'log'])?.subcommand).toBe('log');
    expect(gitInvocation(['command', 'git', 'add', '.'])?.subcommand).toBe('add');
  });

  it('returns null for non-git commands and for git options that exit', () => {
    expect(gitInvocation(['echo', 'git', 'commit'])).toBeNull();
    expect(gitInvocation(['git', '--version'])).toBeNull();
    expect(gitInvocation(['git'])).toBeNull();
  });
});

describe('unsafeCommitForms', () => {
  it('knows which options take a value', () => {
    expect(unsafeCommitForms(['-m', 'src/a.ts'])).toEqual([]);
    expect(unsafeCommitForms(['-F', 'msg.txt', '-C', 'HEAD', '-c', 'HEAD', '-t', 'tmpl'])).toEqual([]);
    expect(unsafeCommitForms(['--author', 'A <a@b>', '--date', 'now', '--trailer', 'x: y', '--cleanup', 'strip'])).toEqual([]);
    expect(unsafeCommitForms(['--fixup', 'HEAD', '--squash', 'HEAD', '--reuse-message', 'HEAD', '--message', 'x'])).toEqual([]);
    expect(unsafeCommitForms(['--message=-a', '-m-a', '-ma'])).toEqual([]);
  });

  it('treats -S and -u values as attached only', () => {
    expect(unsafeCommitForms(['-S', '-Skey', '-uno', '--untracked-files=no', '--gpg-sign=key'])).toEqual([]);
    expect(unsafeCommitForms(['--untracked-files', 'no'])).toEqual(['pathspec arguments (no)']);
  });

  it('accepts unique prefixes of long options, as git does', () => {
    expect(unsafeCommitForms(['--inc'])).toEqual(['-i/--include']);
    expect(unsafeCommitForms(['--mess', 'x'])).toEqual([]);
    // Ambiguous (--all, --allow-empty, --allow-empty-message): git refuses it.
    expect(unsafeCommitForms(['--al'])).toEqual([]);
  });

  it('ignores --no- options', () => {
    expect(unsafeCommitForms(['--no-verify', '--no-edit', '--no-all'])).toEqual([]);
  });
});

describe('detectCommit', () => {
  const safe = [
    'git commit -m x',
    'git -C ../repo commit -m x',
    'git -c user.name=a -c core.editor=true commit -m x',
    'GIT_AUTHOR_NAME=a env -i PATH=/bin git --no-pager commit -m x',
    'git --git-dir=.git --work-tree=. commit -m x',
    'git --git-dir .git commit -m x',
    '/usr/bin/git commit -m x',
    'npm test && git commit -m "done; really | yes && no"',
    'git commit -m x && git add .',
    'git commit -F msg.txt',
    'git commit --amend --no-edit',
    'git commit --no-verify -qm "x"',
    'cd sub && git commit -m x',
    '! git commit -m x',
    'time git commit -m x',
    'git commit -m x | tee log.txt',
    "git commit -F - <<'EOF'\nTitle; with -a and src/x.ts\nEOF",
    `git commit -m "$(cat <<'EOF'\nDon't (break) -a\nEOF\n)"`,
  ];
  it.each(safe)('finds one safe commit in %j', (command) => {
    const detection = detectCommit(command);
    expect(detection.isCommit).toBe(true);
    expect(detection.commits).toHaveLength(1);
    expect(detection.unsafe).toEqual([]);
  });

  const unsafe: [string, string][] = [
    ['git commit -a -m x', '-a/--all'],
    ['git commit -am x', '-a/--all'],
    ['git commit -qam x', '-a/--all'],
    ['git commit --all -m x', '-a/--all'],
    ['git commit -i -m x', '-i/--include'],
    ['git commit --include -m x', '-i/--include'],
    ['git commit -o -m x', '-o/--only'],
    ['git commit --only -m x', '-o/--only'],
    ['git commit -p', '-p/--patch'],
    ['git commit --interactive', '--interactive'],
    ['git commit --pathspec-from-file=list.txt -m x', '--pathspec-from-file'],
    ['git commit -m x src/a.ts', 'pathspec arguments (src/a.ts)'],
    ['git commit -m x -- -odd-name', 'pathspec arguments (-odd-name)'],
    ['git add . && git commit -m x', 'a `git add` earlier in the same command'],
    ['git stage a; git commit -m x', 'a `git stage` earlier in the same command'],
    ['git rm a; git commit -m x', 'a `git rm` earlier in the same command'],
    ['git mv a b && git commit -m x', 'a `git mv` earlier in the same command'],
    ['git apply --cached p.diff && git commit -m x', 'a `git apply` earlier in the same command'],
    ['echo $(git add x) && git commit -m y', 'a `git add` earlier in the same command'],
    ['`git add x`; git commit -m y', 'a `git add` earlier in the same command'],
    ['(git add x && git commit -m y)', 'a `git add` earlier in the same command'],
    ['{ git add x; git commit -m y; }', 'a `git add` earlier in the same command'],
    ['if true; then git commit -a; fi', '-a/--all'],
    ['command git commit -a', '-a/--all'],
  ];
  it.each(unsafe)('flags %j as unsafe (%s)', (command, reason) => {
    const detection = detectCommit(command);
    expect(detection.isCommit).toBe(true);
    expect(detection.unsafe).toContain(reason);
  });

  it('does not take an option value for a pathspec', () => {
    expect(detectCommit('git commit --pathspec-from-file list.txt -m x').unsafe).toEqual(['--pathspec-from-file']);
  });

  it('treats a commit it cannot fully parse as unsafe', () => {
    const detection = detectCommit('git commit -m "unterminated');
    expect(detection.isCommit).toBe(true);
    expect(detection.unsafe[0]).toMatch(/could not be fully parsed/);
  });

  const notCommits = [
    'git commit-tree HEAD^{tree} -m x',
    'git log --grep commit',
    'git show commit',
    'git help commit',
    'git --version',
    'echo git commit -a',
    'echo "git commit" | cat',
    "grep -rn 'git commit' docs",
    "cat <<'EOF'\ngit commit -a\nEOF",
    'git status # git commit -a',
  ];
  it.each(notCommits)('finds no commit in %j', (command) => {
    expect(detectCommit(command).isCommit).toBe(false);
  });

  // Documented limits (KIRO_USAGE.md): these commits are not detected.
  it.each(['sh -c "git commit -a"', 'git ci -a', 'npm run commit'])('does not see a commit hidden in %j', (command) => {
    expect(detectCommit(command).isCommit).toBe(false);
  });
});

// Generators for the properties P-H1 to P-H3.

const name = fc.stringMatching(/^[a-z][a-z0-9._/-]{0,8}$/);
const messagePart = fc.constantFrom(
  'a', 'Z', '1', ' ', '&&', ';', '|', '||', '"', "'", '$', '`', '\\', '(', ')', '#', '\n', '-m', '-a', '*', '>', '<', '!', '{', '}', '$(', '~', 'git add .',
);
const message = fc.array(messagePart, { maxLength: 10 }).map((parts) => parts.join(''));
const nonEmptyMessage = fc.array(messagePart, { minLength: 1, maxLength: 10 }).map((parts) => parts.join(''));

function singleQuote(text: string): string {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

function doubleQuote(text: string): string {
  return `"${text.replace(/["\\$`]/g, (c) => `\\${c}`)}"`;
}

const quote = (text: fc.Arbitrary<string>) =>
  fc.tuple(text, fc.boolean()).map(([value, single]) => (single ? singleQuote(value) : doubleQuote(value)));
const quoted = quote(message);
const quotedNonEmpty = quote(nonEmptyMessage);

const globalOption = fc.oneof(
  fc.constantFrom('--no-pager', '-P', '--literal-pathspecs', '--no-optional-locks', '--bare'),
  name.map((p) => `-C ${p}`),
  fc.tuple(name, name).map(([k, v]) => `-c ${k}=${v}`),
  quoted.map((q) => `-c user.name=${q}`),
  name.map((p) => `--git-dir=${p}`),
  name.map((p) => `--git-dir ${p}`),
  name.map((p) => `--work-tree=${p}`),
  name.map((p) => `--work-tree ${p}`),
);
const globalOptions = fc.array(globalOption, { maxLength: 3 });

const envPrefix = fc.oneof(
  fc.constant(''),
  name.map((v) => `GIT_AUTHOR_NAME=${v} `),
  fc.constant('env '),
  fc.constant('env -i PATH=/usr/bin '),
  quoted.map((q) => `env FOO=${q} `),
);

const safeCommitOption = fc.oneof(
  quoted.map((q) => `-m ${q}`),
  quoted.map((q) => `--message=${q}`),
  quoted.map((q) => `--message ${q}`),
  quoted.map((q) => `-qm ${q}`),
  quoted.map((q) => `-sm ${q}`),
  quotedNonEmpty.map((q) => `-m${q}`),
  fc.constantFrom(
    '-q', '-v', '-s', '-n', '-e', '--no-verify', '--allow-empty', '--allow-empty-message', '--signoff', '--quiet',
    '--verbose', '--no-edit', '--amend', '-S', '--no-gpg-sign', '--cleanup=strip', '-uno', '--untracked-files=no',
    '--dry-run', '--reset-author', '--no-status', '-C HEAD', '-c HEAD', '--fixup HEAD', '--fixup=HEAD',
    '--squash HEAD', '--reuse-message HEAD',
  ),
  name.map((f) => `-F ${f}`),
  name.map((f) => `--file=${f}`),
  name.map((f) => `-t ${f}`),
  quoted.map((q) => `--author ${q}`),
  quoted.map((q) => `--author=${q}`),
  quoted.map((q) => `--date ${q}`),
  quoted.map((q) => `--trailer ${q}`),
);
const safeCommitOptions = fc.array(safeCommitOption, { minLength: 1, maxLength: 5 });

const otherCommand = fc.constantFrom('npm test', 'git status', 'echo hi', 'git log --oneline -1', 'git diff --cached --stat');
const connector = fc.constantFrom(' && ', ' ; ', ' || ', '\n', ' | ');

function chain(parts: string[], joiners: string[]): string {
  return parts.reduce((text, part, index) => (index === 0 ? part : `${text}${joiners[(index - 1) % joiners.length]}${part}`), '');
}

const contextAround = fc.record({
  before: fc.array(otherCommand, { maxLength: 2 }),
  after: fc.array(otherCommand, { maxLength: 2 }),
  joiners: fc.array(connector, { minLength: 1, maxLength: 4 }),
});

function commitCommand(prefix: string, globals: string[], options: string[]): string {
  return `${prefix}git ${[...globals, 'commit', ...options].join(' ')}`;
}

describe('commit detection properties', () => {
  it('P-H1: a generated safe commit is found exactly once and is not unsafe', () => {
    fc.assert(
      fc.property(envPrefix, globalOptions, safeCommitOptions, contextAround, (prefix, globals, options, context) => {
        const command = chain([...context.before, commitCommand(prefix, globals, options), ...context.after], context.joiners);
        const detection = detectCommit(command);
        expect(detection.commits).toHaveLength(1);
        expect(detection.unsafe).toEqual([]);
      }),
      { numRuns },
    );
  });

  const unsafeOption = fc.oneof(
    fc.constantFrom('-a', '--all', '-i', '--include', '--inc', '-o', '--only', '--onl', '-qa', '-av', '-p', '--patch', '--interactive', '--pathspec-from-file=list.txt'),
    quoted.map((q) => `-am ${q}`),
    quoted.map((q) => `-vam ${q}`),
    name.map((f) => `--pathspec-from-file ${f}`),
    name,
  );
  const unsafeVariant = fc.oneof(
    fc.record({ kind: fc.constant('option' as const), option: unsafeOption, at: fc.nat() }),
    fc.record({ kind: fc.constant('dash-dash' as const), option: name, at: fc.constant(0) }),
    fc.record({ kind: fc.constant('staged-before' as const), option: fc.constantFrom('add', 'rm', 'mv a', 'stage'), at: fc.constant(0) }),
  );

  it('P-H2: adding any one unsafe form makes the commit unsafe', () => {
    fc.assert(
      fc.property(envPrefix, globalOptions, safeCommitOptions, unsafeVariant, name, connector, (prefix, globals, options, variant, file, join) => {
        let command: string;
        if (variant.kind === 'option') {
          const at = variant.at % (options.length + 1);
          command = commitCommand(prefix, globals, [...options.slice(0, at), variant.option, ...options.slice(at)]);
        } else if (variant.kind === 'dash-dash') {
          command = commitCommand(prefix, globals, [...options, '--', variant.option]);
        } else {
          command = `git ${variant.option} ${file}${join}${commitCommand(prefix, globals, options)}`;
        }
        const detection = detectCommit(command);
        expect(detection.commits).toHaveLength(1);
        expect(detection.unsafe.length).toBeGreaterThan(0);
      }),
      { numRuns },
    );
  });

  const nonCommitGit = fc
    .tuple(
      globalOptions,
      fc.constantFrom(
        'log --grep commit',
        'log --oneline --grep=commit -1',
        'status',
        'show commit',
        'commit-tree HEAD^{tree} -m x',
        'branch commit',
        'help commit',
        'log -1 --format=%s commit',
        'diff --cached commit',
        'add commit',
      ),
    )
    .map(([globals, rest]) => `git ${[...globals, rest].join(' ')}`);
  // Comments are left out here: a comment followed by a joined command that
  // has a newline inside quotes is not valid shell (unit tests cover comments).
  const echoesCommit = fc.oneof(
    fc.constantFrom('echo git commit -a', 'echo "git commit -m x"', "printf '%s\\n' 'git commit'", 'grep -rn "git commit" docs'),
    quote(message.map((m) => `git commit -a ${m}`)).map((q) => `echo ${q}`),
  );

  it('P-H3: non-commit git commands and commands that only mention git commit are not commits', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(nonCommitGit, echoesCommit), { minLength: 1, maxLength: 4 }), fc.array(connector, { minLength: 1, maxLength: 3 }), (parts, joiners) => {
        const detection = detectCommit(chain(parts, joiners));
        expect(detection.commits).toEqual([]);
      }),
      { numRuns },
    );
  });
});
