import { createHash } from 'node:crypto';

export interface Occurrence { repo: string; path: string; line: number; marker: string; text: string; original: string; context: string; key: string }
export const normalise = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();
export const digest = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const vaguePhrases = ['fix this', 'later', 'temp', 'cleanup', 'hack', '???'];
const markerPattern = /\b(TODO|FIXME|HACK|XXX)\b(?:\((@[\w-]+)\))?\s*:?\s*(.*)/i;

/** Unified diff scanner. Only added comment lines are candidates; no source is modified. */
export function extractTodos(diff: string, repo: string, defaultPath = 'unknown'): Occurrence[] {
  const found: Occurrence[] = [];
  const ordinals = new Map<string, number>();
  let path = defaultPath; let line = 0; let context = ''; let inHunk = false;
  for (const raw of diff.split(/\r?\n/)) {
    if (raw.startsWith('diff --git ')) { inHunk = false; context = ''; }
    if (raw.startsWith('+++ ')) { path = raw.slice(4).replace(/^b\//, '').split('\t')[0] ?? defaultPath; continue; }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/.exec(raw);
    if (hunk) { line = Number(hunk[1]); context = (hunk[2] ?? '').trim(); inHunk = true; continue; }
    if (!inHunk || raw.startsWith('-') || raw.startsWith('\\')) continue;
    const code = raw.slice(1);
    if (raw.startsWith('+')) {
      // Restrict matches to documented comment introducers, not arbitrary TODO strings.
      const comment = /(?:\/\/|\/\*|<!--|^\s*#|^\s*\*|^\s*--)\s*(.*)/.exec(code);
      const match = comment && markerPattern.exec(comment[1] ?? '');
      if (match && path !== '/dev/null' && !/[\r\n\0]/.test(path)) {
        const text = `${match[2] ?? ''} ${match[3] ?? ''}`.replace(/\s*(?:\*\/|-->)\s*$/, '').trim();
        const identity = `${repo}\0${path}\0${normalise(text)}`;
        const ordinal = ordinals.get(identity) ?? 0; ordinals.set(identity, ordinal + 1);
        found.push({ repo, path, line, marker: (match[1] ?? 'TODO').toUpperCase(), text, original: code, context, key: digest([identity, ordinal]) });
      }
    }
    if (raw.startsWith('+') || raw.startsWith(' ')) line++;
  }
  return found;
}

export interface CommentFindings { vague: boolean; short: boolean; noOwner: boolean; noAnchor: boolean; retire: boolean }
export function classify(text: string, phrases = vaguePhrases): CommentFindings {
  const body = normalise(text);
  const vague = phrases.some(phrase => {
    const escaped = normalise(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i').test(body);
  });
  return { vague, short: body.replace(/@[\w-]+/g, '').trim().length < 18,
    noOwner: !/@[a-z\d](?:[a-z\d-]*[a-z\d])?/i.test(body),
    noAnchor: !/(?:#\d+|https?:\/\/|\b\d{4}-\d{2}-\d{2}\b|\b(?:when|before|after|once)\b)/i.test(body),
    retire: /\b(?:maybe|someday|probably not)\b/.test(body) };
}

export function rewrite(occurrence: Occurrence, owner?: string): { text: string; incomplete: boolean } {
  const safeOwner = owner?.replace(/^@/, '');
  if (safeOwner && !/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(safeOwner)) throw new Error('Invalid configured owner');
  const location = occurrence.context || occurrence.path;
  const safeContext = [...vaguePhrases,'maybe','someday','probably not'].reduce((text, phrase) => text.replaceAll(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), 'pending'), location).replace(/[\r\n]/g, ' ');
  return { text: `TODO${safeOwner ? `(@${safeOwner})` : ''}: Implement the expected behaviour in ${safeContext}; done when a regression test demonstrates the documented result.`, incomplete: !safeOwner };
}

export function patchFor(occurrence: Occurrence, replacement: string | null): string {
  const oldLine = occurrence.original;
  const prefix = oldLine.slice(0, oldLine.search(/\b(?:TODO|FIXME|HACK|XXX)\b/i));
  const suffix = /\*\/\s*$/.test(oldLine) ? ' */' : /-->\s*$/.test(oldLine) ? ' -->' : '';
  const path = occurrence.path;
  if (!/^[\w./ -]+$/.test(path) || path.split('/').includes('..')) throw new Error('Patch path requires manual review');
  return `--- a/${path}\n+++ b/${path}\n@@ -${occurrence.line},1 +${occurrence.line},${replacement === null ? 0 : 1} @@\n-${oldLine}\n${replacement === null ? '' : `+${prefix}${replacement}${suffix}\n`}`;
}
