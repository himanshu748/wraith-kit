import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pbtRuns } from './pbt.js';

const numRuns = pbtRuns();

function runsFor(value: string): number | undefined {
  return pbtRuns({ WRAITH_PBT_RUNS: value });
}

describe('pbtRuns', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses any positive integer string to itself', () => {
    fc.assert(
      fc.property(
        fc.maxSafeNat().filter((n) => n > 0),
        (n) => runsFor(String(n)) === n,
      ),
      { numRuns },
    );
  });

  it('gives undefined for zero, with or without leading zeros', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), (width) => runsFor('0'.repeat(width)) === undefined),
      { numRuns },
    );
  });

  it('gives undefined for any string with a character that is not an ASCII digit', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'binary' }).filter((s) => /[^0-9]/.test(s)),
        (s) => runsFor(s) === undefined,
      ),
      { numRuns },
    );
  });

  it('returns undefined or a positive safe integer for any string', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (s) => {
        const runs = runsFor(s);
        return runs === undefined || (Number.isSafeInteger(runs) && runs > 0);
      }),
      { numRuns },
    );
  });

  it('gives undefined for unset, empty and out-of-range values', () => {
    expect(pbtRuns({})).toBeUndefined();
    expect(pbtRuns({ WRAITH_PBT_RUNS: undefined })).toBeUndefined();
    expect(runsFor('')).toBeUndefined();
    expect(runsFor('-5')).toBeUndefined();
    expect(runsFor('1.5')).toBeUndefined();
    expect(runsFor(' 20')).toBeUndefined();
    expect(runsFor('9007199254740992')).toBeUndefined();
  });

  it('reads WRAITH_PBT_RUNS from process.env when called without an argument', () => {
    vi.stubEnv('WRAITH_PBT_RUNS', '7');
    expect(pbtRuns()).toBe(7);
    vi.stubEnv('WRAITH_PBT_RUNS', 'many');
    expect(pbtRuns()).toBeUndefined();
    vi.stubEnv('WRAITH_PBT_RUNS', undefined);
    expect(pbtRuns()).toBeUndefined();
  });
});
