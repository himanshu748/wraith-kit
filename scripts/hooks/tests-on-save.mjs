// @ts-check
// Kiro hook: tests-on-save (.kiro/hooks/tests-on-save.json, PostFileSave).
//
// Gets the saved path from the event on STDIN (CLI V3 sends a top-level
// `file_path`, E4) or from its arguments. E4 showed that CLI 3.3.0 does not
// expand the `{{filePath}}` template from the IDE 1.0 page (the script got the
// literal text), so the hook passes no argument and a literal template is
// ignored. Acts only on .ts and
// .mjs files under skeleton/, apps/<name>/, tests/ or scripts/. Runs
// `npx vitest related --run <file>` with WRAITH_PBT_RUNS=20 (fast property
// tests). On a test failure it exits 1 with the tail of the output on stderr,
// which the docs say is sent to the agent. A save cannot be blocked, so the
// exit code only reports.
//
// File triggers fire only on agent edits, not on saves made by hand. In E4,
// creating a file fired PostFileSave as well as PostFileCreate, so this hook
// also runs for new files.

const NAME = 'tests-on-save';
const TAIL_LINES = 30;

try {
  const { parseEvent, readStdin, savedPathsOf } = await import('./lib/event.mjs');
  const { isTestableSource, repoRelative } = await import('./lib/checks.mjs');
  const { spawnSync } = await import('node:child_process');

  const root = process.cwd();
  const argument = process.argv.slice(2).join(' ');
  // An unexpanded template arrives as the literal text `{{filePath}}`.
  const fromArgument = argument !== '' && !argument.includes('{{') ? [argument] : [];
  const event = parseEvent(await readStdin());
  const base = typeof event?.cwd === 'string' ? event.cwd : root;
  /** @type {string[]} */
  const files = [];
  for (const candidate of [...fromArgument, ...savedPathsOf(event)]) {
    const file = repoRelative(candidate, root, base);
    if (file !== null && isTestableSource(file) && !files.includes(file)) {
      files.push(file);
    }
  }
  if (files.length > 0) {
    const result = spawnSync('npx', ['vitest', 'related', '--run', '--passWithNoTests', ...files], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, WRAITH_PBT_RUNS: '20' },
      maxBuffer: 64 * 1024 * 1024,
    });
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trimEnd();
    if (result.error) {
      process.stderr.write(`${NAME}: could not run vitest: ${result.error.message}\n`);
      process.exitCode = 1;
    } else if (result.status === 0) {
      const summary = output
        .split('\n')
        .filter((line) => /^\s*(?:Test Files|Tests)\s/.test(line))
        .map((line) => line.trim())
        .join('; ');
      process.stdout.write(`${NAME}: related tests passed for ${files.join(', ')}${summary ? ` (${summary})` : ''}\n`);
    } else {
      const tail = output.split('\n').slice(-TAIL_LINES).join('\n');
      process.stderr.write(`${NAME}: related tests failed for ${files.join(', ')}\n${tail}\n`);
      process.exitCode = 1;
    }
  }
} catch (error) {
  process.stderr.write(`${NAME}: error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
