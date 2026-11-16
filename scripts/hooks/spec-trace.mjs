// @ts-check
// Kiro hook: spec-trace (.kiro/hooks/spec-trace.json, PostFileSave on
// markdown under .kiro/specs/). Also `npm run spec:trace` (with --strict).
//
// Reads every .kiro/specs/<spec>/ folder and reports duplicate or malformed
// requirement IDs, criteria not in EARS form, IDs with no design reference or
// task, and references to IDs that do not exist (lib/spec-trace.mjs).
//
// As a hook it always exits 0 and prints the report (a save cannot be
// blocked). With --strict it exits 1 when there is any error-level finding.
// `--specs-dir <dir>` reads another folder (the tests use fixtures).

const NAME = 'spec-trace';
const strict = process.argv.includes('--strict');

try {
  const { existsSync, readdirSync, readFileSync, statSync } = await import('node:fs');
  const path = (await import('node:path')).default;
  const { formatReport, traceSpecs } = await import('./lib/spec-trace.mjs');

  const dirFlag = process.argv.indexOf('--specs-dir');
  const specsDir = path.resolve(dirFlag >= 0 && process.argv[dirFlag + 1] ? process.argv[dirFlag + 1] : '.kiro/specs');
  if (!existsSync(specsDir)) {
    process.stdout.write(`${NAME}: no specs found (${path.relative(process.cwd(), specsDir) || specsDir} does not exist)\n`);
  } else {
    /**
     * @param {string} file
     * @returns {string | undefined}
     */
    const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : undefined);
    const specs = readdirSync(specsDir)
      .filter((name) => statSync(path.join(specsDir, name)).isDirectory())
      .sort()
      .map((name) => ({
        name,
        requirements: read(path.join(specsDir, name, 'requirements.md')),
        design: read(path.join(specsDir, name, 'design.md')),
        tasks: read(path.join(specsDir, name, 'tasks.md')),
      }));
    const findings = traceSpecs(specs);
    process.stdout.write(`${formatReport(findings, specs)}\n`);
    if (strict && findings.some((finding) => finding.level === 'error')) {
      process.exitCode = 1;
    }
  }
} catch (error) {
  const message = `${NAME}: error: ${error instanceof Error ? error.message : String(error)}\n`;
  if (strict) {
    process.stderr.write(message);
    process.exitCode = 1;
  } else {
    process.stdout.write(message);
  }
}
