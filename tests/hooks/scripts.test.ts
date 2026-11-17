import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { git, hooksDir, makeTempRepo, removeDir, repoRoot, runScript, shellEvent, writeFile } from './helpers.js';

const TIMEOUT = 60_000;
const created: string[] = [];

function tempRepo(options?: Parameters<typeof makeTempRepo>[0]): string {
  const dir = makeTempRepo(options);
  created.push(dir);
  return dir;
}

/** A copy of one hook script in an empty folder, so its ./lib imports fail. */
function scriptWithoutLib(script: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wraith-hook-nolib-'));
  created.push(dir);
  const target = path.join(dir, script);
  copyFileSync(path.join(hooksDir, script), target);
  return target;
}

afterEach(() => {
  while (created.length > 0) {
    removeDir(created.pop() as string);
  }
});

function guard(cwd: string, command = 'git commit -m test') {
  return runScript('commit-guard.mjs', shellEvent(command), { cwd, args: ['--static-only'] });
}

describe('commit-guard.mjs', () => {
  it('exits 0 silently for a command that does not commit', () => {
    const result = runScript('commit-guard.mjs', shellEvent('ls -la && git status'), { args: ['--static-only'] });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('exits 0 for a clean staged tree and prints one line per check', { timeout: TIMEOUT }, () => {
    const repo = tempRepo();
    const result = guard(repo);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const checks = JSON.parse(readFileSync(path.join(repoRoot, 'scripts', 'guard-checks.json'), 'utf8')).checks as { id: string }[];
    for (const { id } of checks) {
      expect(result.stdout).toMatch(new RegExp(`^${id}: (pass|skipped)`, 'm'));
    }
    expect(result.stdout).toContain('kiro-not-ignored: pass');
    expect(result.stdout).toContain('typecheck: skipped: --static-only');
    expect(result.stdout).toContain('core-integrity: skipped: --static-only');
    expect(result.stdout).toContain('fixture-demo-label: pass');
  });

  it('blocks when the tool of a required check is missing', { timeout: TIMEOUT }, () => {
    // No --static-only, and the temporary repo has no node_modules.
    const repo = tempRepo();
    const result = runScript('commit-guard.mjs', shellEvent('git commit -m test'), { cwd: repo });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('typecheck: fail: node_modules/.bin/tsc is not set up (a required check cannot be skipped)');
    expect(result.stderr).toContain('core-integrity: fail: tests/core-integrity.test.ts is not set up');
    expect(result.stderr).toMatch(/commit-guard: blocked: failed checks: typecheck, lint, fast-tests, core-integrity\./);
  });

  it('blocks a staged file with a fake GitHub token', { timeout: TIMEOUT }, () => {
    const repo = tempRepo();
    // Built from parts at run time; no committed file holds a token-like literal.
    const token = ['gh', 'p_'].join('') + 'T0k3n'.repeat(8);
    writeFile(repo, 'src/config.ts', `export const token = '${token}';\n`);
    git(repo, 'add', 'src/config.ts');
    const result = guard(repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/secret-scan: fail: possible secret on an added line: src\/config\.ts:1 \(GitHub token\)/);
    expect(result.stderr).not.toContain(token);
  });

  it('blocks when a .gitignore line mentions kiro', { timeout: TIMEOUT }, () => {
    const repo = tempRepo();
    writeFile(repo, '.gitignore', 'node_modules/\n.kiro/\n');
    git(repo, 'add', '.gitignore');
    const result = guard(repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/kiro-not-ignored: fail: .*\.gitignore line 2 mentions kiro/);
    expect(result.stderr).toMatch(/git check-ignore reports that these are ignored/);
  });

  it('blocks a staged .env file', { timeout: TIMEOUT }, () => {
    const repo = tempRepo();
    writeFile(repo, 'apps/demo/.env', 'MODE=demo\n');
    git(repo, 'add', '-f', 'apps/demo/.env');
    const result = guard(repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('env-files: fail: staged environment file: apps/demo/.env');
  });

  it('allows a staged .env.example file', { timeout: TIMEOUT }, () => {
    const repo = tempRepo();
    writeFile(repo, '.env.example', 'MODE=\n');
    git(repo, 'add', '.env.example');
    expect(guard(repo).status).toBe(0);
  });

  it('blocks when LICENSE is missing', { timeout: TIMEOUT }, () => {
    const repo = tempRepo({ license: false });
    const result = guard(repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('license-present: fail: no LICENSE file in the index');
  });

  it('blocks a dependency that README "Pre-existing work" does not list', { timeout: TIMEOUT }, () => {
    const repo = tempRepo();
    writeFile(repo, 'apps/demo/package.json', JSON.stringify({ name: 'demo', dependencies: { 'is-odd': '^3.0.0' } }));
    git(repo, 'add', 'apps/demo/package.json');
    const result = guard(repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('deps-in-readme: fail: not listed in backticks in README "## Pre-existing work": is-odd');
  });

  it('blocks an em dash in a staged markdown file', { timeout: TIMEOUT }, () => {
    const repo = tempRepo();
    writeFile(repo, 'docs/notes.md', `# Notes\n\nOne ${String.fromCharCode(0x2014)} two.\n`);
    git(repo, 'add', 'docs/notes.md');
    const result = guard(repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('no-em-dash: fail: U+2014 (em dash) in: docs/notes.md');
  });

  it.each([
    'git commit -a -m x',
    'git commit -am x',
    'git commit --all -m x',
    'git commit -i -m x src/a.ts',
    'git commit --include -m x',
    'git commit -m x src/a.ts',
    'git add . && git commit -m x',
  ])('blocks the unsafe form %j before running any check', (command) => {
    const repo = tempRepo();
    const result = guard(repo, command);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/commit-guard: blocked: this commit would include changes the guard cannot check first/);
    expect(result.stderr).toMatch(/stage the files with `git add <paths>` in one shell call/);
    expect(result.stderr).not.toMatch(/license-present/);
  });

  it('checks every string when the command field name is unknown', () => {
    const event = { hook_event_name: 'PreToolUse', tool_name: 'execute_bash', tool_input: { unknown_field: 'git commit -a -m x' } };
    expect(runScript('commit-guard.mjs', event, { args: ['--static-only'] }).status).toBe(2);
  });

  it('fails closed on an event it cannot read', () => {
    const result = runScript('commit-guard.mjs', 'not json', { args: ['--static-only'] });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/could not read the hook event JSON/);
  });

  it('fails closed when its modules cannot load', () => {
    const result = runScript(scriptWithoutLib('commit-guard.mjs'), shellEvent('git status'), { args: ['--static-only'] });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/commit-guard: blocked: internal error/);
  });

  it('fails closed outside a git repository', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wraith-hook-norepo-'));
    created.push(dir);
    const result = runScript('commit-guard.mjs', shellEvent('git commit -m x'), { cwd: dir, args: ['--static-only'] });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/internal error/);
  });
});

describe('todo-afterlife-precommit.mjs', () => {
  it('runs the advisory app check for a commit and exits 0', () => {
    const repo = tempRepo();
    writeFile(repo, 'sample.ts', '// TODO: fix this later\n');
    git(repo, 'add', 'sample.ts');
    const result = runScript('todo-afterlife-precommit.mjs', shellEvent('git commit -m x'), { cwd: repo });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1 comment(s), 1 vague');
    expect(result.stdout).toContain('no files changed');
  });

  it('stays silent for other commands and for unreadable events', () => {
    expect(runScript('todo-afterlife-precommit.mjs', shellEvent('git status'))).toEqual({ status: 0, stdout: '', stderr: '' });
    expect(runScript('todo-afterlife-precommit.mjs', 'not json')).toEqual({ status: 0, stdout: '', stderr: '' });
  });

  it('fails open: exits 0 with a warning when its internals throw', () => {
    const result = runScript(scriptWithoutLib('todo-afterlife-precommit.mjs'), shellEvent('git commit -m x'));
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^todo-afterlife-precommit: warning: the check did not run .*; not blocking the commit\n$/);
  });
});

describe('store-guard.mjs', () => {
  const writeEvent = (toolInput: unknown, cwd = repoRoot) => ({
    hook_event_name: 'PreToolUse',
    cwd,
    tool_name: 'fs_write',
    tool_input: toolInput,
  });

  it.each([
    { path: '.wraith/actions.json' },
    { path: path.join(repoRoot, 'apps', 'demo', '.wraith', 'audit.log') },
    { file_path: '.wraith/x' },
    { paths: ['docs/a.md', '.wraith/y'] },
  ])('exits 2 for a path under .wraith/ (%j)', (toolInput) => {
    const result = runScript('store-guard.mjs', writeEvent(toolInput));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/store-guard: blocked: .* is inside \.wraith\/.*approval UI/);
  });

  it('resolves a relative path against the event cwd', () => {
    expect(runScript('store-guard.mjs', writeEvent({ path: 'x.json' }, path.join(repoRoot, '.wraith'))).status).toBe(2);
  });

  it.each([{ path: 'docs/notes.md' }, { path: '../outside/.wraith/x' }, { path: '.wraithy/x' }])('exits 0 for %j', (toolInput) => {
    const result = runScript('store-guard.mjs', writeEvent(toolInput));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('fails open with a warning for an unknown payload or unreadable event', () => {
    const unknown = runScript('store-guard.mjs', writeEvent({ content: 'x' }));
    expect(unknown.status).toBe(0);
    expect(unknown.stdout).toMatch(/store-guard: warning: no target path found .*fields: content/);
    expect(runScript('store-guard.mjs', 'not json').status).toBe(0);
  });

  it('fails open when its modules cannot load', () => {
    const result = runScript(scriptWithoutLib('store-guard.mjs'), writeEvent({ path: '.wraith/x' }));
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/store-guard: warning: the check did not run/);
  });
});

describe('tests-on-save.mjs', () => {
  it('does nothing for files it does not act on', () => {
    for (const file of ['README.md', 'docs/guide.md', '../outside/x.ts', 'apps/x/node_modules/y/z.ts']) {
      expect(runScript('tests-on-save.mjs', { hook_event_name: 'PostFileSave', file_path: file })).toEqual({ status: 0, stdout: '', stderr: '' });
    }
  });

  it('ignores an unexpanded {{filePath}} argument', () => {
    expect(runScript('tests-on-save.mjs', '', { args: ['{{filePath}}'] })).toEqual({ status: 0, stdout: '', stderr: '' });
  });

  it('runs the related tests for a saved source file', { timeout: TIMEOUT }, () => {
    const result = runScript('tests-on-save.mjs', '', { args: [path.join(repoRoot, 'tests', 'pbt.ts')] });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^tests-on-save: related tests passed for tests\/pbt\.ts/);
  });
});
