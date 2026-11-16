import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The wraith-kit repo root. */
export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const hooksDir = path.join(repoRoot, 'scripts', 'hooks');
export const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** process.env without GIT_* variables, so git in a temporary repo never sees this repo. */
export function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_')) {
      delete env[key];
    }
  }
  return env;
}

export function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: cleanEnv() });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} exited ${result.status}: ${result.stderr}`);
  }
  return result.stdout;
}

export function writeFile(root: string, file: string, content: string): void {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

export interface TempRepoOptions {
  license?: boolean;
}

/**
 * A temporary git repo under os.tmpdir() with a LICENSE, a .gitignore, a
 * README with a "## Pre-existing work" section and a package.json whose one
 * dependency is listed there. Everything is staged; nothing is committed.
 */
export function makeTempRepo(options: TempRepoOptions = {}): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wraith-hooks-'));
  git(dir, 'init', '-q');
  const files: Record<string, string> = {
    '.gitignore': 'node_modules/\n.env\n',
    'README.md': [
      '# Fixture repo',
      '',
      '## Pre-existing work',
      '',
      '| Item | Version | License |',
      '|---|---|---|',
      '| `left-pad` | 1.3.0 | WTFPL |',
      '',
      '## License',
      '',
      'MIT',
      '',
    ].join('\n'),
    'package.json': `${JSON.stringify({ name: 'fixture', private: true, devDependencies: { 'left-pad': '^1.3.0' } }, null, 2)}\n`,
  };
  if (options.license !== false) {
    files.LICENSE = 'MIT License\n\nCopyright (c) 2026 test fixture\n';
  }
  for (const [file, content] of Object.entries(files)) {
    writeFile(dir, file, content);
  }
  git(dir, 'add', ...Object.keys(files));
  return dir;
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs a hook script with a payload on STDIN. Objects are sent as JSON;
 * strings are sent as they are.
 */
export function runScript(
  script: string,
  payload: unknown,
  options: { cwd?: string; args?: string[] } = {},
): RunResult {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const scriptPath = path.isAbsolute(script) ? script : path.join(hooksDir, script);
  const result = spawnSync(process.execPath, [scriptPath, ...(options.args ?? [])], {
    cwd: options.cwd ?? repoRoot,
    input,
    encoding: 'utf8',
    env: cleanEnv(),
    timeout: 120_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** A PreToolUse event for the shell tool, in the shape the Kiro docs show. */
export function shellEvent(command: string): Record<string, unknown> {
  return {
    hook_event_name: 'PreToolUse',
    cwd: repoRoot,
    session_id: 'test-session',
    tool_name: 'execute_bash',
    tool_input: { command },
  };
}
