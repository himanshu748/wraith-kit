import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, utimes, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const archive = resolve(process.argv[2] ?? join(root, 'output', 'wraith-kit-judge.zip'));
const fixturePath = 'apps/notice-ghoul/fixtures/site';
const archiveTime = new Date('2000-01-01T00:00:00Z');

/** @param {string[]} inputs */
async function dependencyManifests(inputs) {
  /** @type {Map<string, { name: string, version: string }>} */
  const manifests = new Map();
  for (const input of inputs) {
    let directory = dirname(resolve(root, input));
    if (!directory.split(sep).includes('node_modules')) continue;
    while (directory.split(sep).includes('node_modules')) {
      if (manifests.has(directory)) break;
      const source = await readFile(join(directory, 'package.json'), 'utf8').catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (source !== null) {
        const { name, version } = JSON.parse(source);
        if (name && version) {
          manifests.set(directory, { name, version });
          break;
        }
      }
      directory = dirname(directory);
    }
  }
  return manifests;
}

const bundle = await build({
  absWorkingDir: root,
  entryPoints: ['scripts/run-app.ts'],
  platform: 'node',
  format: 'esm',
  target: 'node22',
  bundle: true,
  metafile: true,
  write: false,
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});

const files = new Map([
  ['wraith.mjs', bundle.outputFiles[0].contents],
  ['README.md', await readFile(join(root, 'scripts/judge-build-README.md'))],
  ['LICENSE', await readFile(join(root, 'LICENSE'))],
]);
for (const file of await readdir(join(root, fixturePath), { withFileTypes: true })) {
  if (!file.isFile() || !/\.(html|xml|txt)$/.test(file.name)) continue;
  const path = fixturePath + '/' + file.name;
  files.set(path, await readFile(join(root, path)));
}

for (const [directory, { name, version }] of await dependencyManifests(Object.keys(bundle.metafile.inputs))) {
  const licenses = (await readdir(directory, { withFileTypes: true }))
    .filter(file => file.isFile() && /^(license|licence|copying|notice)([.-]|$)/i.test(file.name));
  const prefix = 'third-party/' + name + '/' + version + '/';
  if (licenses.length === 0) {
    // boolbase's published npm tarball omits its upstream ISC license.
    if (name !== 'boolbase' || version !== '1.0.0') {
      throw new Error('Missing bundled dependency license: ' + name + '@' + version);
    }
    files.set(prefix + 'LICENSE', await readFile(join(root, 'scripts/judge-licenses/boolbase-1.0.0.txt')));
  }
  for (const license of licenses) {
    files.set(prefix + license.name, await readFile(join(directory, license.name)));
  }
}

await mkdir(dirname(archive), { recursive: true });
const temporary = await mkdtemp(join(dirname(archive), '.wraith-judge-'));
try {
  const staged = join(temporary, 'files');
  const contents = Object.fromEntries(files);
  const paths = Object.keys(contents).sort();
  for (const path of paths) {
    const destination = join(staged, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents[path]);
    await chmod(destination, 0o644);
    await utimes(destination, archiveTime, archiveTime);
  }

  const zip = join(temporary, 'judge.zip');
  execFileSync('zip', ['-q', '-X', '-9', zip, '-@'], {
    cwd: staged,
    env: { ...process.env, TZ: 'UTC', ZIPOPT: '' },
    input: paths.join('\n') + '\n',
  });
  await rename(zip, archive);
  console.log(archive);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
