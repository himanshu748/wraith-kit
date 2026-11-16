import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isEars, parseReferences, parseRequirements, traceSpecs } from '../../scripts/hooks/lib/spec-trace.mjs';
import { fixturesDir, runScript } from './helpers.js';

function requirements(...sections: string[]): string {
  return ['# Requirements', '', ...sections].join('\n');
}

function requirement(n: number | string, ...criteria: string[]): string {
  return [`### Requirement ${n}: Title ${n}`, '', '**User story:** As a user, I want x, so that y.', '', '#### Acceptance criteria', '', ...criteria, ''].join('\n');
}

describe('isEars', () => {
  it.each([
    'WHEN a webhook arrives THE system SHALL reply 202.',
    'WHILE the store is locked THE system SHALL wait.',
    'IF the signature is wrong THEN THE system SHALL reject the delivery.',
    'WHERE an LLM is configured THE system SHALL ask it.',
    'THE system SHALL log every transition.',
    '**WHEN** a feed is polled **THE system SHALL** dedupe items.',
  ])('accepts %j', (text) => {
    expect(isEars(text)).toBe(true);
  });

  it.each(['The system should log things.', 'when x the system shall y', 'WHEN x THE system logs y', 'Log every transition SHALL'])('rejects %j', (text) => {
    expect(isEars(text)).toBe(false);
  });
});

describe('parseRequirements', () => {
  it('gives IDs <n>.<m> from numbered acceptance criteria', () => {
    const text = requirements(
      requirement(1, '1. WHEN a THE system SHALL b.', '2. WHEN c', '   THE system SHALL d.'),
      requirement(2, '1. THE system SHALL e.'),
    );
    const { ids, findings } = parseRequirements(text, 'core');
    expect([...ids.keys()]).toEqual(['1.1', '1.2', '2.1']);
    expect(findings).toEqual([]);
  });

  it('ignores numbered lists outside the acceptance criteria', () => {
    const text = requirements(
      ['### Requirement 1: Title', '', '1. a numbered note before the criteria', '', '#### Acceptance criteria', '', '1. THE system SHALL a.', '', '#### Notes', '', '2. not a criterion'].join('\n'),
    );
    const { ids, findings } = parseRequirements(text, 'core');
    expect([...ids.keys()]).toEqual(['1.1']);
    expect(findings).toEqual([]);
  });

  it('reports duplicate IDs and duplicate requirement numbers', () => {
    const duplicateCriterion = parseRequirements(requirements(requirement(1, '1. THE system SHALL a.', '1. THE system SHALL b.')), 'core');
    expect(duplicateCriterion.findings.map((f) => f.message)).toEqual([expect.stringMatching(/^duplicate ID 1\.1 \(first at line \d+\)$/)]);

    const duplicateRequirement = parseRequirements(requirements(requirement(1, '1. THE system SHALL a.'), requirement(1, '1. THE system SHALL b.')), 'core');
    const messages = duplicateRequirement.findings.map((f) => f.message);
    expect(messages).toContainEqual(expect.stringMatching(/^duplicate Requirement 1/));
    expect(messages).toContainEqual(expect.stringMatching(/^duplicate ID 1\.1/));
  });

  it('reports malformed headings, missing criteria, criterion 0 and non-EARS criteria', () => {
    const text = requirements(
      '### Requirement one: Bad number',
      '',
      requirement(2),
      requirement(3, '0. THE system SHALL a.', '1. The system should b.'),
    );
    const findings = parseRequirements(text, 'core').findings;
    expect(findings.every((f) => f.level === 'error')).toBe(true);
    expect(findings.map((f) => f.message)).toEqual([
      expect.stringMatching(/^malformed requirement heading/),
      'Requirement 2 has no numbered list under "#### Acceptance criteria"',
      'malformed criterion number 0 in Requirement 3',
      expect.stringMatching(/^criterion 3\.1 is not in EARS form/),
    ]);
  });

  it('reports a file with no requirement sections', () => {
    expect(parseRequirements('# Requirements\n\nNothing yet.\n', 'core').findings.map((f) => f.message)).toEqual([
      'no "### Requirement <n>: <title>" sections found',
    ]);
  });
});

describe('parseReferences', () => {
  it('reads _Validates_ in design.md and _Requirements_ in tasks.md, with cross-spec citations', () => {
    const design = parseReferences('_Validates: Requirements 1.1, 1.2 and other-spec 3.4_\n**Validates: Requirement 2.1**\n_Requirements: 9.9_', 'core', 'design');
    expect(design.references.map((r) => `${r.spec} ${r.id}`)).toEqual(['core 1.1', 'core 1.2', 'other-spec 3.4', 'core 2.1']);
    const tasks = parseReferences('- [ ] 1. Do it\n  - _Requirements: 1.1, 2.1_\n_Validates: Requirements 9.9_', 'core', 'tasks');
    expect(tasks.references.map((r) => r.id)).toEqual(['1.1', '2.1']);
  });

  it('reports malformed and empty citations', () => {
    const { findings } = parseReferences('_Requirements: 1, x.2, 1.1_\n_Requirements: _', 'core', 'tasks');
    expect(findings.map((f) => f.message)).toEqual([
      'malformed requirement reference "1" (expected <n>.<m> or <spec-name> <n>.<m>)',
      'malformed requirement reference "x.2" (expected <n>.<m> or <spec-name> <n>.<m>)',
      'empty Requirements citation',
    ]);
  });
});

describe('traceSpecs', () => {
  const core = requirements(requirement(1, '1. THE system SHALL a.', '2. THE system SHALL b.'));

  it('reports design pending for a spec with only requirements.md', () => {
    expect(traceSpecs([{ name: 'core', requirements: core }])).toEqual([
      expect.objectContaining({ level: 'info', message: 'design pending (only requirements.md exists)' }),
    ]);
  });

  it('warns about IDs without a design reference or a task', () => {
    const findings = traceSpecs([{ name: 'core', requirements: core, design: '_Validates: Requirements 1.1_', tasks: '- [ ] 1. x\n  - _Requirements: 1.2_' }]);
    expect(findings.map((f) => `${f.level}: ${f.message}`)).toEqual([
      'warning: 1.1 has no task (_Requirements: 1.1_)',
      'warning: 1.2 has no design reference (_Validates: Requirements 1.2_)',
    ]);
  });

  it('reports references to missing IDs and unknown specs as errors', () => {
    const findings = traceSpecs([
      { name: 'core', requirements: core, design: '_Validates: Requirements 1.1, 1.2, 1.3, ghost 1.1, app 2.1_' },
      { name: 'app', requirements: requirements(requirement(1, '1. THE app SHALL c.')) },
    ]);
    const errors = findings.filter((f) => f.level === 'error').map((f) => f.message);
    expect(errors).toEqual([
      'cites 1.3, which does not exist',
      'cites ghost 1.1, but spec "ghost" has no requirements.md',
      'cites app 2.1, which does not exist',
    ]);
  });

  it('reports design.md or tasks.md without requirements.md', () => {
    expect(traceSpecs([{ name: 'orphan', design: '# Design' }]).map((f) => f.message)).toEqual(['design.md or tasks.md without requirements.md']);
  });
});

describe('spec-trace.mjs on fixtures', () => {
  const dir = (name: string) => path.join(fixturesDir, 'spec-trace', name);

  it('--strict exits 0 on the clean fixture', () => {
    const result = runScript('spec-trace.mjs', '', { args: ['--strict', '--specs-dir', dir('clean')] });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('spec-trace: info: demo-app/: design pending');
    expect(result.stdout).toContain('spec-trace: 2 spec(s), 4 requirement ID(s), 0 error(s), 0 warning(s)');
  });

  it('--strict exits 1 on the duplicate-ID fixture', () => {
    const result = runScript('spec-trace.mjs', '', { args: ['--strict', '--specs-dir', dir('duplicate')] });
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/spec-trace: error: demo-core\/requirements\.md:\d+: duplicate ID 1\.1/);
  });

  it('exits 0 without --strict even when there are errors (hook mode)', () => {
    const result = runScript('spec-trace.mjs', '', { args: ['--specs-dir', dir('duplicate')] });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('1 error(s)');
  });

  it('reports no specs when the folder does not exist', () => {
    const result = runScript('spec-trace.mjs', '', { args: ['--strict', '--specs-dir', dir('missing')] });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/no specs found/);
  });
});
