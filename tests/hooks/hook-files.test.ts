import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './helpers.js';

// The documented schema (kiro.dev/docs/hooks, read 16 Nov 2026):
// {"version": "v1", "hooks": [{name, description?, trigger, matcher?,
//  action: {type: "command" | "agent", command | prompt}, timeout?, enabled?, confirm?}]}
const ALLOWED_KEYS = new Set(['name', 'description', 'trigger', 'matcher', 'action', 'timeout', 'enabled']);
const EXPECTED = ['commit-guard', 'doc-sync', 'spec-trace', 'store-guard', 'tests-on-save', 'todo-afterlife-precommit'];
const hooksFolder = path.join(repoRoot, '.kiro', 'hooks');

interface Hook {
  name: string;
  description?: string;
  trigger: string;
  matcher?: string;
  action: { type: string; command?: string; prompt?: string };
  timeout?: number;
  enabled?: boolean;
}

function load(name: string): { version: string; hooks: Hook[] } {
  return JSON.parse(readFileSync(path.join(hooksFolder, `${name}.json`), 'utf8'));
}

describe('.kiro/hooks', () => {
  it('holds exactly the six planned hook files', () => {
    const files = readdirSync(hooksFolder).filter((file) => file.endsWith('.json')).sort();
    expect(files).toEqual(EXPECTED.map((name) => `${name}.json`));
  });

  it.each(EXPECTED)('%s.json follows the documented schema', (name) => {
    const file = load(name);
    expect(file.version).toBe('v1');
    expect(file.hooks).toHaveLength(1);
    const [hook] = file.hooks;
    for (const key of Object.keys(hook)) {
      expect(ALLOWED_KEYS.has(key), `unexpected key ${key}`).toBe(true);
    }
    expect(hook.name).toBe(name);
    expect(hook.enabled).toBe(true);
    expect(hook.description?.length).toBeGreaterThan(20);
    expect(['PreToolUse', 'PostFileSave', 'PostTaskExec']).toContain(hook.trigger);
    expect(readFileSync(path.join(hooksFolder, `${name}.json`), 'utf8')).not.toContain(String.fromCharCode(0x2014));
  });

  it.each(EXPECTED.filter((name) => name !== 'doc-sync'))('%s runs an existing script from the project root', (name) => {
    const [hook] = load(name).hooks;
    expect(hook.action.type).toBe('command');
    const match = /^node (scripts\/hooks\/[a-z-]+\.mjs)$/.exec(hook.action.command ?? '');
    expect(match, hook.action.command).not.toBeNull();
    expect(existsSync(path.join(repoRoot, match?.[1] ?? ''))).toBe(true);
    expect(hook.description).toContain(match?.[1]);
    expect(Number.isInteger(hook.timeout) && (hook.timeout ?? 0) > 0).toBe(true);
  });

  it('doc-sync is an agent prompt on PostTaskExec that says not to commit', () => {
    const [hook] = load('doc-sync').hooks;
    expect(hook.trigger).toBe('PostTaskExec');
    expect(hook.action.type).toBe('agent');
    expect(hook.action.prompt).toMatch(/KIRO_USAGE\.md/);
    expect(hook.action.prompt).toMatch(/Do not commit/);
    expect(hook.matcher).toBeUndefined();
    expect(hook.timeout).toBeUndefined();
  });

  it('uses the planned triggers, matchers and timeouts', () => {
    const summary = Object.fromEntries(
      EXPECTED.map((name) => {
        const [hook] = load(name).hooks;
        return [name, [hook.trigger, hook.matcher, hook.timeout]];
      }),
    );
    expect(summary).toEqual({
      'commit-guard': ['PreToolUse', 'shell', 180],
      'doc-sync': ['PostTaskExec', undefined, undefined],
      'spec-trace': ['PostFileSave', '\\.kiro/specs/.*\\.md$', 30],
      'store-guard': ['PreToolUse', 'write', 10],
      'tests-on-save': ['PostFileSave', '\\.(ts|mjs)$', 60],
      'todo-afterlife-precommit': ['PreToolUse', 'shell', 30],
    });
  });

  it('file matchers match relative and absolute paths', () => {
    const testsOnSave = new RegExp(load('tests-on-save').hooks[0].matcher ?? '');
    expect(testsOnSave.test('skeleton/src/core.ts')).toBe(true);
    expect(testsOnSave.test('/Users/x/wraith-kit/scripts/hooks/lib/shell.mjs')).toBe(true);
    expect(testsOnSave.test('README.md')).toBe(false);
    const specTrace = new RegExp(load('spec-trace').hooks[0].matcher ?? '');
    expect(specTrace.test('.kiro/specs/wraith-core/requirements.md')).toBe(true);
    expect(specTrace.test('/Users/x/wraith-kit/.kiro/specs/notice-ghoul/tasks.md')).toBe(true);
    expect(specTrace.test('.kiro/steering/product.md')).toBe(false);
  });
});
