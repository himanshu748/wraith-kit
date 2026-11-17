import { describe, expect, it } from 'vitest';
import { readFile, readdir, realpath, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import ts from 'typescript';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coreRoot = join(root, 'skeleton', 'src');
const appNames = ['todo-afterlife', 'notice-ghoul'];
const sha = (body: Buffer | string) => createHash('sha256').update(body).digest('hex');
async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.filter(e => !['node_modules', 'dist', '.wraith', '.aws-sam'].includes(e.name)).map(e => e.isDirectory() ? files(join(directory, e.name)) : Promise.resolve([join(directory, e.name)])))).flat();
}
function imports(body: string, path: string): string[] {
  const source = ts.createSourceFile(path, body, ts.ScriptTarget.Latest, true);
  const result: string[] = [];
  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) result.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      if (node.arguments[0] && ts.isStringLiteral(node.arguments[0])) result.push(node.arguments[0].text);
      else throw new Error(`Uninspectable computed import in ${path}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source); return result;
}
function inspectAppFile(path: string, body: Buffer, sourceHashes: Set<string>, allowed: Set<string>, packageName: string): void {
  if (sourceHashes.has(sha(body))) throw new Error(`Copied source: ${path}`);
  if (body.toString().includes('// WRAITH-SKELETON')) throw new Error(`Skeleton marker in app: ${path}`);
  if (!/\.[cm]?[jt]sx?$/.test(path)) return;
  for (const specifier of imports(body.toString(), path)) {
    if (specifier.startsWith(packageName) && !allowed.has(specifier)) throw new Error(`Not a public export: ${specifier}`);
    if (specifier.includes('skeleton/src') || (specifier.startsWith('.') && resolve(dirname(path), specifier).startsWith(join(root, 'skeleton') + sep))) throw new Error(`Private skeleton import: ${path} -> ${specifier}`);
  }
}
function compareLoaded(left: Map<string, LoadedFile>, right: Map<string, LoadedFile>, coreEntry: string): void {
  if (!left.has(coreEntry) || !right.has(coreEntry)) throw new Error('Missing core entry in observed loads');
  for (const [path, observed] of left) {
    const peer = right.get(path);
    if (peer && (peer.sourceHash !== observed.sourceHash || peer.loadedHash !== observed.loadedHash)) throw new Error(`Loaded bytes differ: ${path}`);
  }
}
interface LoadedFile { path: string; sourceHash: string; loadedHash: string }
interface Probe { id: string; resolution: string; frozen: boolean; mutationBlocked: boolean }

describe('shared skeleton integrity', () => {
  // Validates: app-authoring 2.1, 2.4, 2.5, 2.6, 2.7
  it('both independent app processes load the same source and transformed module bytes', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'wraith-loader-'));
    try {
      const probes = await Promise.all(appNames.map(async id => {
        const report = join(folder, `${id}.jsonl`);
        const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', '--import', join(root, 'scripts/loaded-sources.mjs'), join(root, 'scripts/core-probe.ts'), id], { cwd: join(root, 'apps', id), env: { ...process.env, WRAITH_CORE_LOAD_REPORT: report }, maxBuffer: 2_000_000 });
        const probe = JSON.parse(result.stdout.trim()) as Probe;
        const loaded = (await readFile(report, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as LoadedFile);
        expect(probe.frozen).toBe(true); expect(probe.mutationBlocked).toBe(true);
        expect(probe.id).toBe(id); expect(probe.resolution).toBe(await realpath(join(coreRoot, 'core/index.ts')));
        expect(loaded.some(file => file.path === probe.resolution)).toBe(true);
        for (const file of loaded) {
          expect(file.path.startsWith((await realpath(coreRoot)) + sep)).toBe(true);
          expect(file.sourceHash).toBe(sha(await readFile(file.path)));
          expect(file.loadedHash).toMatch(/^[a-f0-9]{64}$/);
        }
        return new Map(loaded.map(file => [file.path, file]));
      }));
      const common = [...probes[0].keys()].filter(path => probes[1].has(path));
      expect(common).toContain(await realpath(join(coreRoot, 'core/engine.ts')));
      expect(common).toContain(await realpath(join(coreRoot, 'node/store.ts')));
      expect(common).toContain(await realpath(join(coreRoot, 'ui/index.ts')));
      compareLoaded(probes[0], probes[1], await realpath(join(coreRoot, 'core/index.ts')));
    } finally { await rm(folder, { recursive: true, force: true }); }
  });
  // Validates: app-authoring 2.2, 2.3, 2.8
  it('apps use public exports, contain no source forks, and source knows no app names', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'skeleton/package.json'), 'utf8')) as { name: string; exports: Record<string, string> };
    const allowed = new Set(Object.keys(pkg.exports).map(entry => pkg.name + entry.slice(1)));
    const sourceFiles = await files(coreRoot); const hashes = new Set<string>();
    for (const path of sourceFiles) {
      const body = await readFile(path); hashes.add(sha(body));
      expect(body.toString().startsWith('// WRAITH-SKELETON')).toBe(true);
      for (const name of appNames) expect(body.toString(), `${relative(root, path)} must stay app-neutral`).not.toContain(name);
    }
    for (const path of await files(join(root, 'apps'))) {
      const body = await readFile(path);
      inspectAppFile(path, body, hashes, allowed, pkg.name);
    }
  });
  it('negative fixtures reject forks, private exports, changed loaded bytes and missing core', () => {
    const source = '// WRAITH-SKELETON\nexport const a = 1;';
    const allowed = new Set(['@wraith-kit/skeleton/core']);
    const inspect = (body: string) => inspectAppFile(join(root, 'apps/example/src/index.ts'), Buffer.from(body), new Set([sha(source)]), allowed, '@wraith-kit/skeleton');
    expect(() => inspect(source)).toThrow('Copied source');
    expect(() => inspect(source + '\n// patched')).toThrow('marker');
    expect(() => inspect("import { a } from '../../../skeleton/src/core/index.js'")).toThrow('Private skeleton import');
    expect(() => inspect("import { a } from '@wraith-kit/skeleton/private'")).toThrow('Not a public export');
    expect(() => inspect('const x = await import(variable)')).toThrow('computed import');
    const observed = { path: '/core', sourceHash: 'source', loadedHash: 'loaded' };
    expect(() => compareLoaded(new Map([['/core', observed]]), new Map(), '/core')).toThrow('Missing core');
    expect(() => compareLoaded(new Map([['/core', observed]]), new Map([['/core', { ...observed, loadedHash: 'patched' }]]), '/core')).toThrow('Loaded bytes differ');
  });
  it('Lambda bundle metadata, when present, references only actual skeleton sources', async () => {
    for (const id of appNames) {
      const path = join(root, 'apps', id, 'dist/meta.json');
      let body: string;
      try { body = await readFile(path, 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
      const meta = JSON.parse(body) as { inputs: Record<string, unknown> };
      const sources = Object.keys(meta.inputs).filter(input => input.includes('skeleton/'));
      expect(sources).toContain('skeleton/src/core/index.ts');
      for (const input of sources) {
        expect(isAbsolute(input)).toBe(false);
        expect((await realpath(resolve(root, input))).startsWith((await realpath(coreRoot)) + sep)).toBe(true);
        expect(basename(input)).toMatch(/\.ts$/);
      }
    }
  });
});
