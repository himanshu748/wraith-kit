// @ts-check
// Kiro hook: store-guard (.kiro/hooks/store-guard.json, PreToolUse on `write`).
//
// Blocks (exit 2) an agent write tool whose target path resolves to a
// `.wraith/` folder inside the repo: the local action store and audit log.
// Actions change only through the human approval gate (PLAN.md section 5.4).
//
// It fails open: when the payload has no path field it recognises, or on any
// internal error, it prints a warning and exits 0. It guards against mistakes,
// not attacks, and the payload field names are still to confirm (E2).
// Paths are compared after path.resolve; symbolic links are not followed.

const NAME = 'store-guard';

try {
  const { parseEvent, readStdin, targetPathsOf } = await import('./lib/event.mjs');
  const { isUnderWraithStore } = await import('./lib/checks.mjs');

  const event = parseEvent(await readStdin());
  const targets = targetPathsOf(event);
  if (targets.length === 0) {
    const fields = event && typeof event.tool_input === 'object' && event.tool_input !== null ? Object.keys(event.tool_input) : [];
    process.stdout.write(
      `${NAME}: warning: no target path found in the tool input (fields: ${fields.join(', ') || 'none'}); not blocking\n`,
    );
    process.exitCode = 0;
  } else {
    const root = process.cwd();
    const base = typeof event?.cwd === 'string' ? event.cwd : root;
    const blocked = targets.filter((target) => isUnderWraithStore(target, root, base));
    if (blocked.length > 0) {
      process.stderr.write(
        `${NAME}: blocked: ${blocked.join(', ')} is inside .wraith/, the Wraith action store and audit log. ` +
          'Do not edit it with file tools. Approve or reject actions in the approval UI instead ' +
          '(it arrives with the approval-ui spec; until then, leave .wraith/ alone).\n',
      );
      process.exitCode = 2;
    } else {
      process.exitCode = 0;
    }
  }
} catch (error) {
  process.stdout.write(`${NAME}: warning: the check did not run (${error instanceof Error ? error.message : String(error)}); not blocking\n`);
  process.exitCode = 0;
}
