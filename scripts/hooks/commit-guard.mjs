// @ts-check
// Kiro hook: commit-guard (.kiro/hooks/commit-guard.json, PreToolUse on `shell`).
//
// Reads the hook event from STDIN. Shell commands that do not commit pass
// through silently (exit 0). For a git commit it:
//   1. blocks forms that would commit content the staged scan cannot see
//      (-a/--all, -i/--include, -o/--only, -p/--patch, --interactive,
//      --pathspec-from-file, pathspecs, a `git add` earlier in the same call);
//   2. runs every check in scripts/guard-checks.json against the staged index
//      and blocks if any check fails.
// Blocking means exit 2 with the reason on stderr, which the Kiro docs say
// blocks a Pre Tool Use call and returns stderr to the agent.
//
// It fails closed: an internal error, or an event it cannot read, exits 2.
// The modules are imported inside the try block so that a missing or broken
// module also ends in exit 2 (the hook types page says other non-zero codes
// only warn and let the tool run). A Kiro timeout is the one case it cannot
// fail closed: E5 showed that a timed-out Pre Tool Use hook lets the tool call
// run. So the command checks stop at a 150 s budget (lib/guard.mjs), below the
// hook's 180 s timeout, and the guard blocks when the budget runs out.
//
// `--static-only` skips the checks that run commands (typecheck, lint, tests).
// Only the tests in tests/hooks/ pass it; the hook never does.
//
// Limits (also in KIRO_USAGE.md): a commit typed in a terminal never reaches
// this hook, and commits hidden in scripts, git aliases or `sh -c` strings are
// not detected (see lib/shell.mjs).

const NAME = 'commit-guard';

/**
 * @param {string} message
 */
function block(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
}

try {
  const { parseEvent, readStdin, shellCommandOf, stringsIn } = await import('./lib/event.mjs');
  const { detectCommit } = await import('./lib/shell.mjs');
  const { allChecksPassed, formatResults, loadGuardChecks, repoRoot, runGuardChecks } = await import('./lib/guard.mjs');

  const staticOnly = process.argv.includes('--static-only');
  const event = parseEvent(await readStdin());
  if (event === null) {
    block(
      `${NAME}: blocked: could not read the hook event JSON on STDIN, so this shell call cannot be checked for a git commit. ` +
        'If this keeps happening, record the payload (docs/experiments.md, E2) and fix scripts/hooks/lib/event.mjs.',
    );
  } else {
    // CLI V3 sends the command in tool_input.command (E2). When no candidate
    // field matches (another surface or version), every string in tool_input
    // is checked instead.
    const command = shellCommandOf(event);
    const candidates = command !== null ? [command] : stringsIn(event.tool_input);
    const detections = candidates.map((text) => detectCommit(text));
    if (detections.some((detection) => detection.isCommit)) {
      const unsafe = [...new Set(detections.flatMap((detection) => detection.unsafe))];
      if (unsafe.length > 0) {
        block(
          `${NAME}: blocked: this commit would include changes the guard cannot check first: ${unsafe.join('; ')}.\n` +
            `${NAME}: stage the files with \`git add <paths>\` in one shell call, then run \`git commit -m "<message>"\` ` +
            'in the next call, without -a, -i, -o, -p, pathspecs or --pathspec-from-file.',
        );
      } else {
        const root = repoRoot(process.cwd());
        const checks = loadGuardChecks();
        const results = runGuardChecks(checks, root, { staticOnly });
        const report = formatResults(results);
        if (allChecksPassed(results)) {
          process.stdout.write(`${report}\n${NAME}: all checks passed or were skipped; the commit may go ahead.\n`);
        } else {
          const failed = results.filter((result) => result.status === 'fail').map((result) => result.id);
          block(`${report}\n${NAME}: blocked: failed checks: ${failed.join(', ')}. Fix them, stage the fixes, then commit again.`);
        }
      }
    }
  }
} catch (error) {
  block(`${NAME}: blocked: internal error, so the commit is blocked to be safe: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
}
