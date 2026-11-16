// @ts-check
// Kiro hook: todo-afterlife-precommit (.kiro/hooks/todo-afterlife-precommit.json,
// PreToolUse on `shell`).
//
// Acts only on git commit commands (the same detection as commit-guard,
// lib/shell.mjs). The TODO Afterlife app does not exist yet, so for a commit it
// prints a skip notice and exits 0. The real run (TODO Afterlife with the `cli`
// source over `git diff --cached`, deterministic, no LLM, no network) is added
// in the todo-afterlife build task (PLAN.md section 6).
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
    process.stdout.write(`${NAME}: skipped: TODO Afterlife is not built yet\n`);
  }
  process.exitCode = 0;
} catch (error) {
  process.stdout.write(
    `${NAME}: warning: the check did not run (${error instanceof Error ? error.message : String(error)}); not blocking the commit\n`,
  );
  process.exitCode = 0;
}
