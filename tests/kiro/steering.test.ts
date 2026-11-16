import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseReferences, parseRequirements, traceSpecs } from '../../scripts/hooks/lib/spec-trace.mjs';

// Steering front matter as documented at kiro.dev/docs/steering (read 16 Nov 2026):
// YAML between `---` lines as the very first content of the file;
// inclusion: always | fileMatch (fileMatchPattern: string or array) | manual |
// auto (name and description required); #[[file:<path>]] resolves from the
// workspace root.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const steeringDir = path.join(repoRoot, '.kiro', 'steering');
const EXPECTED = ['product.md', 'skeleton-authoring.md', 'structure.md', 'tech.md', 'wraith-domain.md'];

function read(name: string): string {
  return readFileSync(path.join(steeringDir, name), 'utf8');
}

/** Splits a steering file into its front matter lines and its body. */
function split(text: string): { front: Map<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) {
    throw new Error('no front matter at the start of the file');
  }
  const front = new Map<string, string>();
  for (const line of match[1].split('\n')) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!pair) {
      throw new Error(`unexpected front matter line: ${line}`);
    }
    front.set(pair[1], pair[2]);
  }
  return { front, body: text.slice(match[0].length) };
}

/** The fenced ```markdown blocks of a file, in order. */
function markdownBlocks(text: string): string[] {
  return [...text.matchAll(/```markdown\n([\s\S]*?)```/g)].map((block) => block[1]);
}

describe('.kiro/steering', () => {
  it('holds exactly the five planned steering files', () => {
    expect(readdirSync(steeringDir).sort()).toEqual(EXPECTED);
  });

  it.each(['product.md', 'tech.md', 'structure.md'])('%s is always included', (name) => {
    const { front } = split(read(name));
    expect(Object.fromEntries(front)).toEqual({ inclusion: 'always' });
  });

  it('wraith-domain.md is included for skeleton and app source files', () => {
    const { front } = split(read('wraith-domain.md'));
    expect(front.get('inclusion')).toBe('fileMatch');
    expect(JSON.parse(front.get('fileMatchPattern') ?? '')).toEqual(['skeleton/src/**', 'apps/*/src/**']);
    expect(front.size).toBe(2);
  });

  it('skeleton-authoring.md is auto included with a name and a description', () => {
    const { front } = split(read('skeleton-authoring.md'));
    expect(front.get('inclusion')).toBe('auto');
    expect(front.get('name')).toBe('skeleton-authoring');
    expect(front.get('description')).toMatch(/new Wraith/);
    expect(front.size).toBe(3);
  });

  it.each(EXPECTED)('%s resolves every #[[file:...]] reference from the repo root', (name) => {
    for (const reference of read(name).matchAll(/#\[\[file:([^\]]+)\]\]/g)) {
      expect(existsSync(path.join(repoRoot, reference[1])), reference[1]).toBe(true);
    }
  });

  it('skeleton-authoring.md links the 15-minute guide', () => {
    expect(read('skeleton-authoring.md')).toContain('#[[file:docs/make-your-own-app-in-15-min.md]]');
  });
});

describe('structure.md spec ID convention', () => {
  const blocks = markdownBlocks(read('structure.md'));

  it('has the requirements, design, tasks and cross-spec examples', () => {
    expect(blocks).toHaveLength(3);
  });

  it('its requirements example parses with no findings and gives IDs 2.1 and 2.2', () => {
    const parsed = parseRequirements(blocks[0], 'example');
    expect(parsed.findings).toEqual([]);
    expect([...parsed.ids.keys()]).toEqual(['2.1', '2.2']);
  });

  it('its design and tasks examples cite those IDs, and the whole example traces cleanly', () => {
    expect(parseReferences(blocks[1], 'example', 'design').references.map((reference) => reference.id)).toEqual(['2.1', '2.2']);
    expect(parseReferences(blocks[2], 'example', 'tasks').references.map((reference) => reference.id)).toEqual(['2.1', '2.2']);
    expect(traceSpecs([{ name: 'example', requirements: blocks[0], design: blocks[1], tasks: blocks[2] }])).toEqual([]);
  });

  it('its cross-spec citation form parses as a reference to the other spec', () => {
    const citation = /`(_Requirements: [^`]+_)`/.exec(read('structure.md'))?.[1] ?? '';
    expect(parseReferences(citation, 'example', 'tasks').references.map(({ spec, id }) => `${spec} ${id}`)).toEqual([
      'example 2.1',
      'wraith-core 4.3',
    ]);
  });
});
