import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  addedLines,
  hasEmDash,
  isForbiddenEnvFile,
  isTestableSource,
  isUnderWraithStore,
  missingFromPreexistingWork,
  preexistingWorkSection,
  repoRelative,
  secretKindsIn,
} from '../../scripts/hooks/lib/checks.mjs';
import { repoRoot } from './helpers.js';

// Fake secrets are built from parts at run time, so no committed file holds a
// literal that looks like a real token (the repo's own secret scan stays clean).
const fake = {
  githubClassic: ['gh', 'p_'].join('') + 'A1b2'.repeat(9),
  githubOauth: ['gh', 'o_'].join('') + 'Zz09'.repeat(9),
  githubServer: ['gh', 's_'].join('') + 'Qq12'.repeat(9),
  githubFineGrained: ['git', 'hub_pat_'].join('') + '11ABCDEFG0' + '_' + 'x'.repeat(40),
  awsKeyId: ['AK', 'IA'].join('') + 'ABCDEFGHIJKLMNOP',
  awsSessionKeyId: ['AS', 'IA'].join('') + 'QRSTUVWXYZ234567',
  awsSecret: ['aws_secret', '_access_key'].join('') + ' = ' + 'Ab1/'.repeat(10),
  pemRsa: ['-----BEGIN RSA', ' PRIVATE KEY-----'].join(''),
  pemOpenSsh: ['-----BEGIN OPENSSH', ' PRIVATE KEY-----'].join(''),
  pemPlain: ['-----BEGIN', ' PRIVATE KEY-----'].join(''),
  modalProxy: ['w', 'k-'].join('') + 'a1B2'.repeat(4),
  modalSecret: ['w', 's-'].join('') + 'c3D4'.repeat(4),
  modalApiId: ['a', 'k-'].join('') + 'e5F6'.repeat(4),
  modalApiSecret: ['a', 's-'].join('') + 'g7H8'.repeat(4),
};

describe('secretKindsIn', () => {
  it.each([
    [fake.githubClassic, 'GitHub token'],
    [fake.githubOauth, 'GitHub token'],
    [fake.githubServer, 'GitHub token'],
    [fake.githubFineGrained, 'GitHub token'],
    [`key=${fake.awsKeyId}`, 'AWS access key ID'],
    [fake.awsSessionKeyId, 'AWS access key ID'],
    [fake.awsSecret, 'AWS secret access key assignment'],
    [fake.pemRsa, 'PEM private key'],
    [fake.pemOpenSsh, 'PEM private key'],
    [fake.pemPlain, 'PEM private key'],
    [fake.modalProxy, 'Modal token'],
    [fake.modalSecret, 'Modal token'],
    [fake.modalApiId, 'Modal token'],
    [fake.modalApiSecret, 'Modal token'],
  ])('finds a fake secret (%#: %s)', (text, kind) => {
    expect(secretKindsIn(`const value = "${text}";`)).toContain(kind);
  });

  it.each([
    'GitHub tokens start with ghp_, gho_, ghu_, ghs_, ghr_ or github_pat_',
    `${['AK', 'IA'].join('')}SHORT`,
    `${['AK', 'IA'].join('')}abcdefghijklmnop`,
    'aws_secret_access_key = <your secret key>',
    ['-----BEGIN', ' PUBLIC KEY-----'].join(''),
    'Modal proxy tokens use the wk- and ws- prefixes; API tokens use ak- and as-',
    `${['w', 'k-'].join('')}short123`,
    'git commit -m "plain text"',
  ])('finds nothing in harmless text (%#)', (text) => {
    expect(secretKindsIn(text)).toEqual([]);
  });
});

describe('addedLines', () => {
  it('lists added lines with the file and the new line number', () => {
    const diff = [
      'diff --git a/a.txt b/a.txt',
      'index 0000000..1111111 100644',
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1,0 +2,2 @@',
      '+first',
      '+second',
      '@@ -10 +12 @@',
      '-old',
      '+new',
      'diff --git a/my file.md b/my file.md',
      'new file mode 100644',
      '--- /dev/null',
      '+++ "b/my file\\t.md"',
      '@@ -0,0 +1,2 @@',
      '+++plus at start',
      '+++ looks like a header but is inside a hunk',
    ].join('\n');
    expect(addedLines(diff)).toEqual([
      { file: 'a.txt', line: 2, text: 'first' },
      { file: 'a.txt', line: 3, text: 'second' },
      { file: 'a.txt', line: 12, text: 'new' },
      { file: 'my file\t.md', line: 1, text: '++plus at start' },
      { file: 'my file\t.md', line: 2, text: '++ looks like a header but is inside a hunk' },
    ]);
  });
});

describe('isForbiddenEnvFile', () => {
  it.each(['.env', '.env.local', 'apps/x/.env.production', '.env.'])('blocks %s', (file) => {
    expect(isForbiddenEnvFile(file)).toBe(true);
  });
  it.each(['.env.example', 'apps/x/.env.example', 'env.ts', '.environment', 'docs/env.md'])('allows %s', (file) => {
    expect(isForbiddenEnvFile(file)).toBe(false);
  });
});

describe('hasEmDash', () => {
  it('detects U+2014 only', () => {
    expect(hasEmDash(`a ${String.fromCharCode(0x2014)} b`)).toBe(true);
    expect(hasEmDash('a - b -- c')).toBe(false);
    expect(hasEmDash(`a ${String.fromCharCode(0x2013)} b`)).toBe(false);
  });
});

describe('preexistingWorkSection and missingFromPreexistingWork', () => {
  const readme = [
    '# Project',
    '',
    'Uses `outside-section` in the intro.',
    '',
    '## Pre-existing work',
    '',
    '| `@scope/tool` | 1.0.0 |',
    '| `listed` | 2.0.0 |',
    '',
    '### More',
    '',
    '`in-subsection`',
    '',
    '## License',
    '',
    '`after-section`',
  ].join('\n');

  it('takes the text up to the next level-2 heading, keeping subsections', () => {
    const section = preexistingWorkSection(readme);
    expect(section).toContain('`@scope/tool`');
    expect(section).toContain('`in-subsection`');
    expect(section).not.toContain('`after-section`');
    expect(section).not.toContain('`outside-section`');
    expect(preexistingWorkSection('# No section')).toBeNull();
  });

  it('lists dependencies from every field of every package.json that the section lacks', () => {
    const packages = [
      { dependencies: { listed: '^2.0.0' }, devDependencies: { '@scope/tool': '1.0.0', 'after-section': '1' } },
      { peerDependencies: { 'in-subsection': '*' }, optionalDependencies: { 'outside-section': '1', zeta: '1' } },
      null,
      { name: 'no-deps' },
    ];
    expect(missingFromPreexistingWork(packages, readme)).toEqual(['after-section', 'outside-section', 'zeta']);
  });

  it('reports every dependency when the section is missing', () => {
    expect(missingFromPreexistingWork([{ devDependencies: { a: '1', b: '1' } }], '# Nothing')).toEqual(['a', 'b']);
  });

  it('passes for this repo: every package in package.json is listed in README.md', () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const text = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
    expect(missingFromPreexistingWork([pkg], text)).toEqual([]);
  });
});

describe('repoRelative, isUnderWraithStore and isTestableSource', () => {
  const root = path.resolve('/work/repo');

  it('normalises paths inside the root and rejects paths outside it', () => {
    expect(repoRelative('a/b.ts', root)).toBe('a/b.ts');
    expect(repoRelative(path.join(root, 'tests/x.ts'), root)).toBe('tests/x.ts');
    expect(repoRelative('x.ts', root, path.join(root, 'tests'))).toBe('tests/x.ts');
    expect(repoRelative('../other/x.ts', root)).toBeNull();
    expect(repoRelative('.', root)).toBeNull();
    expect(repoRelative('..file', root)).toBe('..file');
  });

  it.each([
    '.wraith/actions.json',
    'apps/notice-ghoul/.wraith/audit.log',
    path.join(root, '.wraith', 'x'),
    '.WRAITH/x',
    'a/../.wraith/x',
    '.wraith',
  ])('treats %s as inside the store', (target) => {
    expect(isUnderWraithStore(target, root)).toBe(true);
  });

  it.each(['../other/.wraith/x', '.wraithy/x', 'docs/wraith.md', 'src/.wraith-notes.md', '.'])('treats %s as outside the store', (target) => {
    expect(isUnderWraithStore(target, root)).toBe(false);
  });

  it('resolves relative targets against the base folder', () => {
    expect(isUnderWraithStore('x.json', root, path.join(root, '.wraith'))).toBe(true);
    expect(isUnderWraithStore('x.json', root, path.join(root, 'docs'))).toBe(false);
  });

  it.each([
    ['skeleton/src/core/run.ts', true],
    ['apps/todo-afterlife/src/rules.ts', true],
    ['tests/hooks/shell.test.ts', true],
    ['scripts/hooks/lib/shell.mjs', true],
    ['apps/x/node_modules/y/index.ts', false],
    ['docs/guide.md', false],
    ['README.ts', false],
    ['apps/readme.ts', false],
    ['skeleton/src/view.tsx', false],
  ])('isTestableSource(%s) is %s', (file, expected) => {
    expect(isTestableSource(file)).toBe(expected);
  });
});
