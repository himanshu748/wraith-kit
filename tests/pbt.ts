/**
 * Run count for fast-check properties, read from the WRAITH_PBT_RUNS
 * environment variable. Hooks set it low (fast mode); `npm test` leaves it
 * unset.
 *
 * Returns the value when it is a positive integer written in ASCII digits.
 * Returns undefined for anything else (unset, empty, zero, signs, decimals,
 * spaces), so `fc.assert(property, { numRuns: pbtRuns() })` falls back to
 * fast-check's default run count.
 *
 * `env` defaults to `process.env`; tests pass their own object.
 */
export function pbtRuns(env: Readonly<Record<string, string | undefined>> = process.env): number | undefined {
  const value = env.WRAITH_PBT_RUNS;
  if (value === undefined || !/^[0-9]+$/.test(value)) {
    return undefined;
  }
  const runs = Number(value);
  return Number.isSafeInteger(runs) && runs > 0 ? runs : undefined;
}
