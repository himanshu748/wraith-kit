// WRAITH-SKELETON
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { App, AppDefinition, AuditEntry, Json, Snapshot } from './types.js';

export function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    return `{${Object.keys(value).sort().filter(k => (value as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  throw new Error('Expected finite JSON data');
}
export const hash = (value: unknown): string => createHash('sha256').update(canonical(value)).digest('hex');
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
export const clone = <T>(value: T): T => structuredClone(value);
export const emptySnapshot = (): Snapshot => ({ revision: 0, events: {}, records: {}, actions: {}, deliveries: {}, schedules: {}, audit: [] });
export function defineApp(definition: AppDefinition): App {
  const fields = new Set(['id', 'sources', 'rules', 'actions', 'records', 'aggregates', 'advisor', 'theme', 'views']);
  for (const key of Object.keys(definition)) if (!fields.has(key)) throw new Error(`Unknown app field: ${key}`);
  if (!/^[a-z][a-z0-9-]*$/.test(definition.id)) throw new Error('Invalid app id');
  if (!definition.sources?.length) throw new Error('An app needs a source');
  if (!definition.rules?.length) throw new Error('An app needs a rule');
  if (!definition.actions || !Object.keys(definition.actions).length) throw new Error('An app needs an action kind');
  for (const [name, items] of [['rule', definition.rules], ['source', definition.sources], ['aggregate', definition.aggregates ?? []]] as const) {
    const ids = new Set<string>();
    for (const item of items) {
      if (!item.id || ids.has(item.id)) throw new Error(`Duplicate or empty ${name} id: ${item.id}`);
      ids.add(item.id);
    }
  }
  for (const rule of definition.rules) if (!Number.isFinite(rule.priority)) throw new Error(`Invalid priority: ${rule.id}`);
  for (const [kind, action] of Object.entries(definition.actions)) {
    if (kind === 'confirm-record') throw new Error('confirm-record is reserved');
    if (action.safety === 'safe' && !action.reason?.trim()) throw new Error(`Safe action ${kind} needs a reason`);
    const policy = { maxAttempts: 5, baseMs: 1_000, capMs: 60_000, ...action.retry };
    if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 100 || !Number.isFinite(policy.baseMs) || policy.baseMs < 0 || !Number.isFinite(policy.capMs) || policy.capMs < 0) throw new Error(`Invalid retry policy: ${kind}`);
  }
  if (definition.advisor?.mode === 'extract' && !definition.advisor.verify) throw new Error('extract advisor needs verify');
  for (const source of definition.sources) {
    if (source.type === 'poll' && !source.expand) throw new Error(`Poll source ${source.id} needs expand`);
    if (source.type !== 'poll' && !source.accept) throw new Error(`Source ${source.id} needs accept`);
    if (source.intervalMs !== undefined && (!Number.isFinite(source.intervalMs) || source.intervalMs < 1)) throw new Error(`Invalid interval: ${source.id}`);
  }
  return deepFreeze({ ...definition, sources: [...definition.sources], rules: [...definition.rules].sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)), actions: { ...definition.actions }, records: { ...definition.records }, aggregates: [...definition.aggregates ?? []], theme: { name: definition.id, accent: '#9ee6b8', ...definition.theme }, views: { ...definition.views } });
}

export const AUDIT_LIMIT = 'A valid chain detects changes by someone without the audit key; anyone with the key can rewrite it. A valid prefix cannot prove that trailing entries were not removed without an independently retained head.';
export function auditHash(entry: Omit<AuditEntry, 'hash'>, key: string): string {
  if (!key) throw new Error('Audit key is missing');
  return createHmac('sha256', key).update(canonical(entry)).digest('hex');
}
export function verifyAudit(entries: readonly AuditEntry[], key: string, expectedHead?: { seq: number; hash: string }): { valid: boolean; seq: number; reason?: string; limit: string } {
  if (!key) throw new Error('Audit key is missing');
  let previous = '';
  for (let i = 0; i < entries.length; i++) {
    const { hash: actual, ...body } = entries[i];
    const expected = auditHash(body, key);
    if (body.seq !== i + 1 || body.prevHash !== previous || !/^[a-f0-9]{64}$/.test(actual) || !timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))) return { valid: false, seq: i + 1, reason: 'Audit sequence or HMAC mismatch', limit: AUDIT_LIMIT };
    previous = actual;
  }
  if (expectedHead && (expectedHead.seq !== entries.length || expectedHead.hash !== previous)) return { valid: false, seq: entries.length + 1, reason: 'Audit head does not match retained checkpoint', limit: AUDIT_LIMIT };
  return { valid: true, seq: entries.length, limit: AUDIT_LIMIT };
}

const htmlValues = new WeakMap<object, string>();
export interface HtmlValue { toString(): string }
function escape(value: unknown): string {
  if (Array.isArray(value)) return value.map(escape).join('');
  if (value && typeof value === 'object' && htmlValues.has(value)) return htmlValues.get(value)!;
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
export function html(strings: TemplateStringsArray, ...values: unknown[]): HtmlValue {
  const text = strings.reduce((result, part, i) => result + part + (i < values.length ? escape(values[i]) : ''), '');
  const value = Object.freeze({ toString: () => text });
  htmlValues.set(value, text);
  return value;
}
export function jsonObject(value: Json): value is { [key: string]: Json } { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export class ExecutionError extends Error {
  constructor(message: string, readonly retryable = true, readonly retryAfterMs?: number, readonly unknownOutcome = false) { super(message); this.name = 'ExecutionError'; }
}
export function retryDelay(attempts: number, baseMs: number, capMs: number, random: () => number = Math.random, retryAfterMs = 0): number {
  const jitter = Math.floor(Math.max(0, Math.min(1, random())) * Math.min(capMs, baseMs * 2 ** Math.min(attempts - 1, 30)));
  return Math.max(jitter, retryAfterMs);
}
