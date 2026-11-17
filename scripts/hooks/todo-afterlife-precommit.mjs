// @ts-check
// Kiro hook: todo-afterlife-precommit (.kiro/hooks/todo-afterlife-precommit.json,
// PreToolUse on `shell`).
//
// Acts only on git commit commands (the same detection as commit-guard,
// lib/shell.mjs). Runs the app over staged changes, without advice or network.
//
// It is advisory and fails open: any internal error, including a missing or
// broken module, prints a warning and exits 0, so this hook can never block a
// commit by crashing. The modules are imported inside the try block for that
// reason.

const NAME = 'todo-afterlife-precommit';

try {
  const { parseEvent, readStdin, shellCommandOf, stringsIn } = await import('./lib/event.mjs');
  const { detectCommit } = await import('./lib/shell.mjs');

  const event = parseEvent(await readStdin());
  const command = shellCommandOf(event);
  const candidates = command !== null ? [command] : stringsIn(event?.tool_input);
  if (candidates.some((text) => detectCommit(text).isCommit)) {
    const { spawnSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const entry = fileURLToPath(new URL('../../apps/todo-afterlife/src/precommit.ts', import.meta.url));
    const run = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), entry], { encoding: 'utf8', timeout: 15000, maxBuffer: 1000000 });
    process.stdout.write(run.stdout ?? '');
    if (run.error || run.signal || (run.status !== 0 && run.status !== 2)) throw new Error('app check failed');
    process.exitCode = run.status ?? 0;
  } else {
    process.exitCode = 0;
  }
} catch (error) {
  process.stdout.write(
    `${NAME}: warning: the check did not run (${error instanceof Error ? error.message : String(error)}); not blocking the commit\n`,
  );
  process.exitCode = 0;
}
