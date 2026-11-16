import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { savedPathsOf, shellCommandOf, targetPathsOf } from '../../scripts/hooks/lib/event.mjs';
import { fixturesDir, repoRoot, runScript } from './helpers.js';

// Payloads recorded from Kiro CLI 3.3.0 (V3) in experiments E2 and E4
// (docs/experiments.md). `/path/to/workspace` stands for the workspace root.
const PLACEHOLDER = '/path/to/workspace';

function recorded(name: string, workspace = PLACEHOLDER): Record<string, unknown> {
  const text = readFileSync(path.join(fixturesDir, 'payloads', `${name}.json`), 'utf8');
  return JSON.parse(text.replaceAll(PLACEHOLDER, workspace));
}

describe('recorded CLI V3 payloads', () => {
  it('reads the shell command from tool_input.command (E2)', () => {
    expect(shellCommandOf(recorded('pre-tool-use-execute-bash'))).toBe('echo wraith-e2');
    expect(shellCommandOf(recorded('post-tool-use-execute-bash'))).toBe('echo wraith-e2');
  });

  it('reads the write target from tool_input.path for fs_write and str_replace (E2)', () => {
    expect(targetPathsOf(recorded('pre-tool-use-fs-write'))).toEqual([`${PLACEHOLDER}/notes/sample.ts`]);
    expect(targetPathsOf(recorded('pre-tool-use-str-replace'))).toEqual([`${PLACEHOLDER}/notes/sample.ts`]);
  });

  it('reads the saved path from the top-level file_path (E4)', () => {
    expect(savedPathsOf(recorded('post-file-save'))).toEqual([`${PLACEHOLDER}/notes/sample.ts`]);
    expect(savedPathsOf(recorded('post-file-create'))).toEqual([`${PLACEHOLDER}/notes/sample.ts`]);
  });

  it('commit-guard blocks an unsafe commit sent in the recorded shape', () => {
    const event = recorded('pre-tool-use-execute-bash', repoRoot);
    (event.tool_input as Record<string, unknown>).command = 'git commit -a -m "from a recorded payload"';
    const result = runScript('commit-guard.mjs', event, { args: ['--static-only'] });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('-a/--all');
  });

  it('commit-guard and todo-afterlife-precommit pass the recorded echo command through', () => {
    const event = recorded('pre-tool-use-execute-bash', repoRoot);
    expect(runScript('commit-guard.mjs', event, { args: ['--static-only'] })).toEqual({ status: 0, stdout: '', stderr: '' });
    expect(runScript('todo-afterlife-precommit.mjs', event)).toEqual({ status: 0, stdout: '', stderr: '' });
  });

  it('store-guard blocks a recorded fs_write and str_replace aimed at .wraith/', () => {
    for (const name of ['pre-tool-use-fs-write', 'pre-tool-use-str-replace']) {
      const event = recorded(name, repoRoot);
      (event.tool_input as Record<string, unknown>).path = path.join(repoRoot, '.wraith', 'actions.json');
      expect(runScript('store-guard.mjs', event).status).toBe(2);
      expect(runScript('store-guard.mjs', recorded(name, repoRoot)).status).toBe(0);
    }
  });

  it('tests-on-save ignores the recorded save of a file outside its folders', () => {
    expect(runScript('tests-on-save.mjs', recorded('post-file-save', repoRoot))).toEqual({ status: 0, stdout: '', stderr: '' });
  });
});
