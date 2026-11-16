// @ts-check
// Traceability checks for Kiro specs in .kiro/specs/<spec>/ (pure functions).
//
// ID convention (documented in .kiro/steering/structure.md):
// - requirements.md has `### Requirement <n>: <title>` sections, each with an
//   `#### Acceptance criteria` numbered list in EARS form. Criterion <m> of
//   requirement <n> has the ID <n>.<m>.
// - design.md cites IDs as `_Validates: Requirements 1.2, 3.4_`.
// - tasks.md items are `- [ ] <n>. <task>` with `_Requirements: 1.2, 3.4_`.
// - A citation of another spec is written `<spec-name> 1.2`.
// The bold form `**Validates: Requirements 1.2**` is accepted too.

/** @typedef {'error' | 'warning' | 'info'} Level */
/**
 * @typedef {object} Finding
 * @property {Level} level
 * @property {string} spec
 * @property {string} file
 * @property {number} [line]
 * @property {string} message
 */
/**
 * @typedef {object} SpecFiles
 * @property {string} name The folder name under .kiro/specs/.
 * @property {string} [requirements] requirements.md text.
 * @property {string} [design] design.md text.
 * @property {string} [tasks] tasks.md text.
 */
/** @typedef {{ spec: string, id: string, line: number }} Reference */

const REQUIREMENT_HEADING = /^###\s+Requirement\s+([1-9][0-9]*):\s*\S/;
const ANY_REQUIREMENT_HEADING = /^###\s+Requirement\b/i;
const CRITERIA_HEADING = /^####\s+Acceptance criteria\s*$/i;
const HEADING = /^#{1,6}\s/;
const SECTION_HEADING = /^#{1,3}\s/;
const NUMBERED_ITEM = /^ {0,3}([0-9]+)\.\s+(.*)$/;
const REFERENCE = /(?:_|\*\*)(Validates|Requirements):\s*(.*?)(?:_|\*\*)/;
const REFERENCE_ITEM = /^(?:([a-z0-9]+(?:-[a-z0-9]+)*)\s+)?([1-9][0-9]*\.[1-9][0-9]*)$/;

/**
 * True when a criterion reads as EARS: it starts with WHEN, WHILE, IF, WHERE
 * or THE and contains SHALL (markdown emphasis ignored).
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isEars(text) {
  const plain = text.replace(/[*`]/g, '').trim();
  return /^(?:WHEN|WHILE|IF|WHERE|THE)\b/.test(plain) && /\bSHALL\b/.test(plain);
}

/**
 * Parses requirements.md into criterion IDs and findings.
 *
 * @param {string} text
 * @param {string} spec
 * @returns {{ ids: Map<string, number>, findings: Finding[] }}
 */
export function parseRequirements(text, spec) {
  const file = `${spec}/requirements.md`;
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Map<string, number>} */
  const ids = new Map();
  /** @type {Map<number, number>} */
  const requirementLines = new Map();
  /** @type {{ n: number, line: number, inCriteria: boolean, count: number } | null} */
  let current = null;
  /** @type {{ id: string, line: number, text: string } | null} */
  let criterion = null;

  /**
   * @param {Level} level
   * @param {number} line
   * @param {string} message
   */
  const report = (level, line, message) => findings.push({ level, spec, file, line, message });
  const closeCriterion = () => {
    if (criterion && !isEars(criterion.text)) {
      report('error', criterion.line, `criterion ${criterion.id} is not in EARS form (WHEN/WHILE/IF/WHERE/THE ... SHALL)`);
    }
    criterion = null;
  };
  const closeRequirement = () => {
    closeCriterion();
    if (current && current.count === 0) {
      report('error', current.line, `Requirement ${current.n} has no numbered list under "#### Acceptance criteria"`);
    }
    current = null;
  };

  text.split(/\r?\n/).forEach((line, index) => {
    const lineNo = index + 1;
    if (HEADING.test(line)) {
      closeCriterion();
      if (ANY_REQUIREMENT_HEADING.test(line)) {
        closeRequirement();
        const match = REQUIREMENT_HEADING.exec(line);
        if (!match) {
          report('error', lineNo, `malformed requirement heading (expected "### Requirement <n>: <title>"): ${line.trim()}`);
          return;
        }
        const n = Number(match[1]);
        const first = requirementLines.get(n);
        if (first !== undefined) {
          report('error', lineNo, `duplicate Requirement ${n} (first at line ${first})`);
        } else {
          requirementLines.set(n, lineNo);
        }
        current = { n, line: lineNo, inCriteria: false, count: 0 };
        return;
      }
      if (current && CRITERIA_HEADING.test(line)) {
        current.inCriteria = true;
        return;
      }
      if (current && SECTION_HEADING.test(line)) {
        closeRequirement();
        return;
      }
      if (current) {
        current.inCriteria = false;
      }
      return;
    }
    if (!current || !current.inCriteria) {
      return;
    }
    const item = NUMBERED_ITEM.exec(line);
    if (item) {
      closeCriterion();
      const m = Number(item[1]);
      const id = `${current.n}.${m}`;
      current.count += 1;
      if (m === 0) {
        report('error', lineNo, `malformed criterion number 0 in Requirement ${current.n}`);
        return;
      }
      const first = ids.get(id);
      if (first !== undefined) {
        report('error', lineNo, `duplicate ID ${id} (first at line ${first})`);
      } else {
        ids.set(id, lineNo);
      }
      criterion = { id, line: lineNo, text: item[2] };
      return;
    }
    if (criterion && line.trim() !== '') {
      criterion.text += ` ${line.trim()}`;
    }
  });
  closeRequirement();
  if (requirementLines.size === 0 && !findings.some((finding) => finding.message.startsWith('malformed requirement heading'))) {
    findings.push({ level: 'error', spec, file, message: 'no "### Requirement <n>: <title>" sections found' });
  }
  return { ids, findings };
}

/**
 * Parses `_Validates: Requirements ..._` (design.md) or `_Requirements: ..._`
 * (tasks.md) citations.
 *
 * @param {string} text
 * @param {string} spec
 * @param {'design' | 'tasks'} kind
 * @returns {{ references: Reference[], findings: Finding[] }}
 */
export function parseReferences(text, spec, kind) {
  const file = `${spec}/${kind}.md`;
  const marker = kind === 'design' ? 'Validates' : 'Requirements';
  /** @type {Reference[]} */
  const references = [];
  /** @type {Finding[]} */
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const match = REFERENCE.exec(line);
    if (!match || match[1] !== marker) {
      return;
    }
    const lineNo = index + 1;
    const items = match[2]
      .trim()
      .replace(/^Requirements?\b\s*/i, '')
      .split(/\s*,\s*|\s+and\s+/)
      .map((item) => item.trim())
      .filter((item) => item !== '');
    if (items.length === 0) {
      findings.push({ level: 'error', spec, file, line: lineNo, message: `empty ${marker} citation` });
    }
    for (const item of items) {
      const parsed = REFERENCE_ITEM.exec(item);
      if (!parsed) {
        findings.push({ level: 'error', spec, file, line: lineNo, message: `malformed requirement reference "${item}" (expected <n>.<m> or <spec-name> <n>.<m>)` });
        continue;
      }
      references.push({ spec: parsed[1] ?? spec, id: parsed[2], line: lineNo });
    }
  });
  return { references, findings };
}

/**
 * Checks every spec: IDs, EARS form, references to missing IDs, and IDs that
 * no design reference or task covers.
 *
 * @param {SpecFiles[]} specs
 * @returns {Finding[]}
 */
export function traceSpecs(specs) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Map<string, Map<string, number>>} */
  const idsBySpec = new Map();
  for (const spec of specs) {
    if (spec.requirements === undefined) {
      if (spec.design !== undefined || spec.tasks !== undefined) {
        findings.push({ level: 'error', spec: spec.name, file: `${spec.name}/`, message: 'design.md or tasks.md without requirements.md' });
      }
      continue;
    }
    const parsed = parseRequirements(spec.requirements, spec.name);
    idsBySpec.set(spec.name, parsed.ids);
    findings.push(...parsed.findings);
  }
  for (const spec of specs) {
    const ids = idsBySpec.get(spec.name);
    /** @type {Record<'design' | 'tasks', Set<string>>} */
    const covered = { design: new Set(), tasks: new Set() };
    for (const kind of /** @type {const} */ (['design', 'tasks'])) {
      const text = spec[kind];
      if (text === undefined) {
        continue;
      }
      const parsed = parseReferences(text, spec.name, kind);
      findings.push(...parsed.findings);
      for (const reference of parsed.references) {
        const target = idsBySpec.get(reference.spec);
        const label = reference.spec === spec.name ? reference.id : `${reference.spec} ${reference.id}`;
        if (target === undefined) {
          findings.push({ level: 'error', spec: spec.name, file: `${spec.name}/${kind}.md`, line: reference.line, message: `cites ${label}, but spec "${reference.spec}" has no requirements.md` });
        } else if (!target.has(reference.id)) {
          findings.push({ level: 'error', spec: spec.name, file: `${spec.name}/${kind}.md`, line: reference.line, message: `cites ${label}, which does not exist` });
        } else if (reference.spec === spec.name) {
          covered[kind].add(reference.id);
        }
      }
    }
    if (ids === undefined) {
      continue;
    }
    if (spec.design === undefined && spec.tasks === undefined) {
      findings.push({ level: 'info', spec: spec.name, file: `${spec.name}/`, message: 'design pending (only requirements.md exists)' });
      continue;
    }
    for (const [id, line] of ids) {
      if (spec.design !== undefined && !covered.design.has(id)) {
        findings.push({ level: 'warning', spec: spec.name, file: `${spec.name}/requirements.md`, line, message: `${id} has no design reference (_Validates: Requirements ${id}_)` });
      }
      if (spec.tasks !== undefined && !covered.tasks.has(id)) {
        findings.push({ level: 'warning', spec: spec.name, file: `${spec.name}/requirements.md`, line, message: `${id} has no task (_Requirements: ${id}_)` });
      }
    }
  }
  return findings;
}

/**
 * @param {Finding[]} findings
 * @param {SpecFiles[]} specs
 * @returns {string}
 */
export function formatReport(findings, specs) {
  const lines = findings.map(({ level, file, line, message }) => `spec-trace: ${level}: ${file}${line ? `:${line}` : ''}: ${message}`);
  const count = (/** @type {Level} */ level) => findings.filter((finding) => finding.level === level).length;
  const idCount = specs.reduce((total, spec) => total + (spec.requirements === undefined ? 0 : parseRequirements(spec.requirements, spec.name).ids.size), 0);
  lines.push(
    `spec-trace: ${specs.length} spec(s), ${idCount} requirement ID(s), ${count('error')} error(s), ${count('warning')} warning(s)`,
  );
  return lines.join('\n');
}
