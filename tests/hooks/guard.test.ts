import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { allChecksPassed, formatResults, loadGuardChecks, runGuardChecks } from '../../scripts/hooks/lib/guard.mjs';
import { removeDir } from './helpers.js';

const scratch = mkdtempSync(path.join(os.tmpdir(), 'wraith-guard-'));
afterAll(() => removeDir(scratch));

describe('loadGuardChecks', () => {
  it('loads scripts/guard-checks.json with the required flags from PLAN.md 10.4', () => {
    const checks = loadGuardChecks();
    expect(Object.fromEntries(checks.map((check) => [check.id, check.required]))).toEqual({
      'kiro-not-ignored': true,
      'license-present': true,
      'secret-scan': true,
      'env-files': true,
      'deps-in-readme': true,
      'no-em-dash': true,
      typecheck: true,
      lint: true,
      'fast-tests': true,
      'core-integrity': false,
      'fixture-demo-label': false,
    });
    expect(checks.every((check) => check.description.length > 0)).toBe(true);
  });

  it('throws on a malformed file, so the guard fails closed', () => {
    const file = path.join(scratch, 'bad.json');
    writeFileSync(file, '{"checks": [{"description": "no id"}]}');
    expect(() => loadGuardChecks(file)).toThrow(/has no id/);
    writeFileSync(file, '{"checks": [{"id": "x", "command": "not an array"}]}');
    expect(() => loadGuardChecks(file)).toThrow(/malformed command/);
    writeFileSync(file, '[]');
    expect(() => loadGuardChecks(file)).toThrow(/"checks" array/);
  });

  it('treats anything but an explicit required: false as required', () => {
    const file = path.join(scratch, 'required.json');
    writeFileSync(file, '{"checks": [{"id": "a"}, {"id": "b", "required": "no"}, {"id": "c", "required": false}]}');
    expect(loadGuardChecks(file).map((check) => check.required)).toEqual([true, true, false]);
  });
});

describe('runGuardChecks', () => {
  const node = process.execPath;
  const check = (id: string, command: string[], required = true) => ({ id, description: id, required, command });

  it('passes and fails command checks by exit code', () => {
    const results = runGuardChecks([check('ok', [node, '-e', 'process.exit(0)']), check('bad', [node, '-e', 'console.log("why"); process.exit(3)'])], scratch);
    expect(results.map((result) => result.status)).toEqual(['pass', 'fail']);
    expect(results[1].reason).toMatch(/exited 3\nwhy/);
    expect(allChecksPassed(results)).toBe(false);
  });

  it('stops a command at the deadline and fails it, and fails later commands without running them', () => {
    const results = runGuardChecks(
      [check('slow', [node, '-e', 'setTimeout(() => {}, 10000)']), check('after', [node, '-e', 'process.exit(0)'])],
      scratch,
      { deadline: Date.now() + 500 },
    );
    expect(results[0]).toMatchObject({ status: 'fail', reason: expect.stringMatching(/timed out after \d+ s/) });
    expect(results[1]).toMatchObject({ status: 'fail', reason: expect.stringMatching(/time budget is used up/) });
  });

  it('fails an unknown check that has no command', () => {
    const [result] = runGuardChecks([{ id: 'mystery', description: '', required: true }], scratch);
    expect(result).toEqual({ id: 'mystery', status: 'fail', reason: 'unknown check: no built-in check and no command' });
  });

  it('skips a missing tool when not required and fails it when required', () => {
    const results = runGuardChecks(
      [
        { ...check('later', [node, '-e', '0'], false), tool: 'not/here.ts' },
        { ...check('now', [node, '-e', '0'], true), tool: 'not/here.ts' },
      ],
      scratch,
    );
    expect(results).toEqual([
      { id: 'later', status: 'skipped', reason: 'not/here.ts not set up yet' },
      { id: 'now', status: 'fail', reason: 'not/here.ts is not set up (a required check cannot be skipped)' },
    ]);
  });

  it('formats one line per check', () => {
    expect(
      formatResults([
        { id: 'a', status: 'pass' },
        { id: 'b', status: 'fail', reason: 'why' },
        { id: 'c', status: 'skipped', reason: 'later' },
      ]),
    ).toBe('a: pass\nb: fail: why\nc: skipped: later');
    expect(allChecksPassed([{ id: 'a', status: 'pass' }, { id: 'c', status: 'skipped' }])).toBe(true);
  });
});
