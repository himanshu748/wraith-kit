// WRAITH-SKELETON
import type { Action, ActionCandidate, AdviceResult, App, AuditEntry, Decision, Delivery, EngineOptions, Event, EventInput, Json, JsonObject, RecordEntry, RecordQuery, RecordUpsert, RuleContext, Snapshot, StateView, Store, TraceEntry } from './types.js';
import { auditHash, canonical, clone, deepFreeze, ExecutionError, hash, jsonObject, retryDelay, verifyAudit } from './primitives.js';

type Mark = { sources: Set<string>; demo: boolean };
type Evaluation = { actions: ActionCandidate[]; records: RecordUpsert[]; trace: TraceEntry[]; mark: Mark };
const present = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const errorText = (error: unknown): string => error instanceof Error ? error.message : 'Operation failed';
const addMs = (at: string, ms: number): string => new Date(Date.parse(at) + ms).toISOString();
const recordId = (appId: string, type: string, key: string): string => hash([appId, 'record', type, key]);

export class Engine {
  readonly app: App;
  readonly store: Store;
  private readonly options: EngineOptions;
  constructor(app: App, store: Store, options: EngineOptions) {
    if (!options.auditKey) throw new Error('Audit key is missing');
    this.app = app; this.store = store; this.options = options;
    for (const [name, value] of Object.entries({ executeTimeoutMs: options.executeTimeoutMs ?? 30_000, leaseMarginMs: options.leaseMarginMs ?? 5_000, maxOutputs: options.maxOutputs ?? 40, maxConflicts: options.maxConflicts ?? 20 })) {
      if (!Number.isFinite(value) || value < 1) throw new Error(`Invalid engine option: ${name}`);
    }
  }
  private now(): string { return (this.options.clock?.() ?? new Date()).toISOString(); }
  async snapshot(): Promise<Snapshot> { return clone(await this.store.read()); }
  async verifyAudit(): Promise<ReturnType<typeof verifyAudit>> { return verifyAudit((await this.store.read()).audit, this.options.auditKey); }
  private append(snapshot: Snapshot, type: string, references: string[], data: JsonObject = {}): void {
    const previous = snapshot.audit.at(-1);
    const body: Omit<AuditEntry, 'hash'> = { seq: (previous?.seq ?? 0) + 1, at: this.now(), appId: this.app.id, type, references, data } as Omit<AuditEntry, 'hash'>;
    body.prevHash = previous?.hash ?? '';
    snapshot.audit.push({ ...body, hash: auditHash(body, this.options.auditKey) });
  }
  private async update<T>(work: (snapshot: Snapshot) => { value: T; write: boolean }): Promise<T> {
    for (let retry = 0; retry < (this.options.maxConflicts ?? 20); retry++) {
      const snapshot = clone(await this.store.read());
      const revision = snapshot.revision;
      const result = work(snapshot);
      if (!result.write) return result.value;
      snapshot.revision = revision + 1;
      if (await this.store.compareAndSwap(revision, snapshot)) return clone(result.value);
    }
    throw new Error('Store conflict retry budget exhausted');
  }
  private async note(type: string, references: string[], data: JsonObject = {}): Promise<void> {
    await this.update(s => { this.append(s, type, references, data); return { value: null, write: true }; });
  }
  private view(snapshot: Snapshot, mark: Mark): StateView {
    const records = Object.values(snapshot.records).filter(r => r.appId === this.app.id).map(r => deepFreeze(clone(r)));
    const actions = Object.values(snapshot.actions).filter(a => a.appId === this.app.id).map(a => deepFreeze(clone(a)));
    const query = (q: RecordQuery = {}): readonly Readonly<RecordEntry>[] => {
      const results = records.filter(r => (!q.type || r.type === q.type) && (!q.key || r.key === q.key) && (q.includeUnconfirmed || (r.confirmation !== 'rejected' && !(r.sourcedBy.startsWith('llm:') && r.confirmation === 'none'))) && (!q.where || q.where(r)));
      for (const r of results) {
        mark.demo ||= r.demo;
        if (r.sourcedBy.startsWith('llm:') && r.confirmation === 'none') mark.sources.add(r.sourcedBy);
      }
      return Object.freeze(results);
    };
    return Object.freeze({ records: query, get: (type: string, key: string, options = {}) => query({ type, key, ...options })[0], actions: () => { for (const action of actions) mark.demo ||= action.demo; return Object.freeze(actions); } });
  }
  private evaluate(event: Event, snapshot: Snapshot): Evaluation {
    const mark: Mark = { sources: new Set((event.extracted ?? []).filter(e => !e.deterministic).map(e => `llm:${e.provider}/${e.model}`)), demo: event.demo };
    const ctx: RuleContext = Object.freeze({ clock: this.now(), state: this.view(snapshot, mark) });
    const result: Evaluation = { actions: [], records: [], trace: [], mark };
    for (const rule of this.app.rules) {
      const output = rule.evaluate(deepFreeze(clone(event)), ctx);
      const findings = (output.findings ?? []).map(f => ({ ...f, ruleId: rule.id }));
      result.trace.push({ ruleId: rule.id, findings, stop: !!output.stop });
      result.actions.push(...output.actions ?? []); result.records.push(...output.records ?? []);
      if (output.stop) break;
    }
    canonical({ actions: result.actions, records: result.records, trace: result.trace });
    return result;
  }
  private makeEvent(input: EventInput): Event {
    if (!input || !present(input.idempotencyKey) || !present(input.kind) || !present(input.source) || typeof input.subject !== 'string' || !input.data || !jsonObject(input.data)) throw new Error('Invalid event: identity, kind, source, subject and object data are required');
    if (input.occurredAt && !Number.isFinite(Date.parse(input.occurredAt))) throw new Error('Invalid event date');
    if (Buffer.byteLength(canonical(input)) > 256_000) throw new Error('Event exceeds 256 KB');
    return { idempotencyKey: input.idempotencyKey, source: input.source, kind: input.kind, subject: input.subject, data: clone(input.data), id: hash([this.app.id, 'event', input.idempotencyKey]), appId: this.app.id, occurredAt: input.occurredAt ?? this.now(), receivedAt: this.now(), demo: input.demo === true };
  }
  private async advice(event: Event, actions: readonly ActionCandidate[]): Promise<AdviceResult | undefined> {
    const advisor = this.app.advisor;
    if (!advisor) return;
    const prompt = advisor.prompt(deepFreeze(clone(event)), deepFreeze(clone(actions)));
    if (!prompt) return;
    let response: AdviceResult;
    if (this.options.advisorOff || !this.options.advisor) response = { provider: 'none', model: 'none', fallback: this.options.advisorOff ? 'advisor off' : 'provider none' };
    else {
      try { response = await this.options.advisor.complete(prompt, advisor.parse); }
      catch { response = { provider: 'none', model: 'none', fallback: 'adapter failure' }; }
    }
    if (response.fallback || response.value === undefined) response = { ...response, value: advisor.fallback(event, actions), fallback: response.fallback ?? 'empty reply' };
    // Audit metadata is safe by construction: the raw prompt and configured secrets are never persisted.
    await this.note(response.fallback ? 'advisor-fallback' : 'advisor-call', [event.id], { provider: response.provider, model: response.model, promptHash: hash(prompt), fallback: response.fallback ?? '' });
    return response;
  }
  async ingest(input: EventInput): Promise<{ event: Event; actions: Action[]; duplicate: boolean }> {
    const event = this.makeEvent(input);
    let initial = await this.store.read();
    if (initial.events[event.id]) return { event: initial.events[event.id], actions: Object.values(initial.actions).filter(a => a.eventId === event.id), duplicate: true };
    let extractedAdvice: AdviceResult | undefined;
    if (this.app.advisor?.mode === 'extract') {
      extractedAdvice = await this.advice(event, []);
      if (Array.isArray(extractedAdvice?.value)) {
        for (const proposal of extractedAdvice.value) {
          if (!jsonObject(proposal) || typeof proposal.quote !== 'string' || proposal.value === undefined) continue;
          let accepted = false;
          try { accepted = this.app.advisor.verify?.(proposal.value, proposal.quote, event) === true; } catch { /* invalid evidence */ }
          if (accepted) {
            // Deterministic fallbacks must be carried without LLM provenance.
            (event.extracted ??= []).push({ value: proposal.value, quote: proposal.quote, provider: extractedAdvice.provider, model: extractedAdvice.model, ...(extractedAdvice.fallback ? { deterministic: true } : {}) });
          } else await this.note('advisor-rejected', [event.id], { reason: 'Evidence could not reproduce value' });
        }
      }
    }
    let reword: AdviceResult | undefined;
    let rewordInputs: string | undefined;
    for (let retry = 0; retry < (this.options.maxConflicts ?? 20); retry++) {
      initial = await this.store.read();
      if (initial.events[event.id]) return { event: initial.events[event.id], actions: Object.values(initial.actions).filter(a => a.eventId === event.id), duplicate: true };
      const evaluation = this.evaluate(event, initial);
      if (this.app.advisor?.mode === 'reword') {
        const inputs = hash(evaluation.actions);
        if (inputs !== rewordInputs) { reword = await this.advice(event, evaluation.actions); rewordInputs = inputs; initial = await this.store.read(); }
      }
      let snapshot = clone(initial);
      if (snapshot.events[event.id]) continue;
      const startRevision = snapshot.revision;
      const beforeActions = new Set(Object.keys(snapshot.actions));
      // Guard against snapshots invalidated by an advisor metadata write.
      const evaluated = this.evaluate(event, snapshot);
      if (reword && hash(evaluated.actions) !== rewordInputs) continue;
      snapshot.events[event.id] = event;
      if (evaluated.actions.length + evaluated.records.length > (this.options.maxOutputs ?? 40)) {
        this.append(snapshot, 'event-output-cap', [event.id], { outputs: evaluated.actions.length + evaluated.records.length });
      } else {
        this.applyRecords(snapshot, event, evaluated);
        for (const candidate of evaluated.actions) this.propose(snapshot, candidate, hash([this.app.id, event.idempotencyKey, candidate.kind, candidate.target]), evaluated, event.id);
        if (reword) this.applyWording(snapshot, event.id, evaluated.actions, reword);
        this.append(snapshot, 'event-processed', [event.id], { rules: evaluated.trace.map(t => t.ruleId) });
        const changedItems = ['events', 'records', 'actions'].reduce((count, field) => {
          const name = field as 'events' | 'records' | 'actions';
          return count + Object.entries(snapshot[name]).filter(([id, value]) => !initial[name][id] || canonical(initial[name][id]) !== canonical(value)).length;
        }, 0) + snapshot.audit.length - initial.audit.length + 1;
        if (changedItems > 95) { snapshot = clone(initial); snapshot.events[event.id] = event; this.append(snapshot, 'event-output-cap', [event.id], { outputs: changedItems }); }
      }
      snapshot.revision++;
      if (await this.store.compareAndSwap(startRevision, snapshot)) return { event, actions: Object.values(snapshot.actions).filter(a => !beforeActions.has(a.id)), duplicate: false };
    }
    throw new Error('Event conflict retry budget exhausted');
  }
  private applyWording(snapshot: Snapshot, eventId: string, candidates: ActionCandidate[], advice: AdviceResult): void {
    let values = advice.value;
    const valid = Array.isArray(values) && values.length === candidates.length && values.every((v, i) => jsonObject(v) && v.index === i && typeof v.text === 'string' && Object.keys(v).every(k => ['index', 'text'].includes(k)));
    if (!valid) {
      this.append(snapshot, 'advisor-rejected', [eventId], { reason: 'Reword result must contain only matching indices and text' });
      values = this.app.advisor?.fallback(snapshot.events[eventId], candidates);
      if (!Array.isArray(values) || values.length !== candidates.length || !values.every((v, i) => jsonObject(v) && v.index === i && typeof v.text === 'string' && Object.keys(v).every(k => ['index', 'text'].includes(k)))) return;
      advice = { provider: 'none', model: 'none', value: values, fallback: 'invalid reword result' };
    }
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const action = Object.values(snapshot.actions).find(a => a.eventId === eventId && a.kind === candidate.kind && a.target === candidate.target);
      if (!action) continue;
      const value = (values as Json[])[i] as JsonObject;
      action.suggestion = { by: advice.fallback ? 'rules' : `llm:${advice.provider}/${advice.model}`, text: String(value.text), ...(advice.raw ? { raw: advice.raw } : {}), ...(advice.fallback ? { fallback: advice.fallback } : {}) };
    }
  }
  private propose(snapshot: Snapshot, candidate: ActionCandidate, key: string, evaluation: Evaluation, eventId?: string): Action | undefined {
    if (!present(candidate.kind) || !present(candidate.target) || !jsonObject(candidate.payload)) throw new Error('Invalid action candidate');
    const kind = Object.hasOwn(this.app.actions, candidate.kind) ? this.app.actions[candidate.kind] : undefined;
    if (!kind && candidate.kind !== 'confirm-record') { this.append(snapshot, 'action-kind-rejected', eventId ? [eventId] : [], { kind: candidate.kind }); return; }
    if (candidate.kind === 'confirm-record') {
      const record = snapshot.records[String(candidate.payload.recordId)];
      if (!record || record.appId !== this.app.id || candidate.payload.version !== record.version || candidate.payload.proposedValue === undefined) { this.append(snapshot, 'confirmation-rejected', [], { reason: 'Invalid record or version' }); return; }
      key = hash([this.app.id, 'confirm-record', record.id, record.version, candidate.payload.proposedValue]);
      if (!snapshot.actions[key]) this.supersede(snapshot, record.id, key);
    }
    if (snapshot.actions[key]) return snapshot.actions[key];
    const safe = kind?.safety === 'safe' && !!kind.reason;
    const llmSourced = evaluation.mark.sources.size > 0;
    const action: Action = {
      id: key, appId: this.app.id, idempotencyKey: key, ...(eventId ? { eventId } : {}), kind: candidate.kind, target: candidate.target, payload: clone(candidate.payload),
      preview: candidate.preview ?? (kind ? kind.describe(candidate.payload) : String(candidate.payload.reason ?? 'Confirm record')),
      safety: safe ? 'safe' : 'approval', ...(safe ? { safetyReason: kind?.reason } : {}), llmSourced,
      status: safe && !llmSourced ? 'auto-approved' : 'proposed', attempts: 0, totalAttempts: 0, createdAt: this.now(), demo: evaluation.mark.demo, trace: clone(evaluation.trace),
    };
    snapshot.actions[key] = action;
    this.append(snapshot, 'action-proposed', [key], { kind: action.kind, llmSourced, demo: action.demo });
    if (action.status === 'auto-approved') this.append(snapshot, 'auto-approved', [key], { reason: kind!.reason! });
    return action;
  }
  private applyRecords(snapshot: Snapshot, event: Event, evaluation: Evaluation): void {
    const merged = new Map<string, RecordUpsert>();
    for (const change of evaluation.records) {
      if (!present(change.type) || !present(change.key) || !Object.hasOwn(this.app.records ?? {}, change.type)) throw new Error(`Unknown record type: ${change.type}`);
      const id = recordId(this.app.id, change.type, change.key);
      const previous = merged.get(id);
      merged.set(id, { ...previous, ...change, data: { ...previous?.data, ...change.data } });
    }
    for (const [id, change] of merged) {
      const previous = snapshot.records[id];
      if (!previous && change.value === undefined) throw new Error('New record needs a value');
      const value = change.value === undefined ? previous.value : change.value;
      const changed = !previous || canonical(previous.value) !== canonical(value);
      const humanProtected = !!previous && previous.sourcedBy === 'human' && changed;
      const sourcedBy = [...evaluation.mark.sources].sort()[0] ?? 'rules';
      const next: RecordEntry = previous ? clone(previous) : { id, appId: this.app.id, type: change.type, key: change.key, value, data: {}, sourcedBy, confirmation: 'none', version: 0, updatedAt: this.now(), demo: event.demo };
      next.data = { ...next.data, ...change.data }; next.updatedAt = this.now(); next.demo ||= event.demo;
      if (changed && !humanProtected) { next.value = clone(value); next.version++; next.sourcedBy = sourcedBy; next.confirmation = 'none'; this.supersede(snapshot, id); }
      snapshot.records[id] = next;
      this.append(snapshot, 'record-upserted', [id], { version: next.version, sourcedBy: next.sourcedBy, valueChanged: changed && !humanProtected });
      const needsConfirmation = humanProtected || !!change.confirm || (next.sourcedBy.startsWith('llm:') && next.confirmation === 'none');
      if (needsConfirmation && (humanProtected || next.confirmation === 'none')) this.confirm(snapshot, next, value, change.confirm?.reason ?? (humanProtected ? 'Source proposes replacing your value' : 'AI-sourced value needs confirmation'), change.confirm?.candidates ?? [], evaluation, event.id);
    }
  }
  private supersede(snapshot: Snapshot, record: string, replacement?: string): void {
    for (const action of Object.values(snapshot.actions)) {
      if (action.appId === this.app.id && action.kind === 'confirm-record' && action.payload.recordId === record && ['proposed', 'approved'].includes(action.status) && action.id !== replacement) {
        action.status = 'superseded'; if (replacement) action.supersededBy = replacement;
        this.append(snapshot, 'action-superseded', [action.id], replacement ? { replacement } : {});
      }
    }
  }
  private confirm(snapshot: Snapshot, record: RecordEntry, value: Json, reason: string, candidates: Json[], evaluation: Evaluation, eventId: string): void {
    const key = hash([this.app.id, 'confirm-record', record.id, record.version, value]);
    if (snapshot.actions[key]) return;
    this.supersede(snapshot, record.id, key);
    this.propose(snapshot, { kind: 'confirm-record', target: record.id, payload: { recordId: record.id, version: record.version, proposedValue: value, candidates, reason, currentValue: record.value }, preview: reason }, key, evaluation, eventId);
  }
  async decide(id: string, decision: Decision, actor: string): Promise<Action> {
    if (!actor.trim()) throw new Error('An actor is required');
    return this.update(snapshot => {
      const action = snapshot.actions[id];
      if (!action || action.appId !== this.app.id) throw new Error('Action not found');
      if (decision.type === 'retry') {
        if (action.status !== 'dead') throw new Error('Only dead actions can be retried');
        action.status = 'approved'; action.attempts = 0; delete action.nextAttemptAt; delete action.leaseUntil;
        action.decidedBy = actor; action.decidedAt = this.now(); this.append(snapshot, 'manual-retry', [id], { actor, totalAttempts: action.totalAttempts });
        return { value: action, write: true };
      }
      if (action.status !== 'proposed') throw new Error(`Action is ${action.status}; decision was not applied`);
      if (decision.type === 'reject' && !decision.reason.trim()) throw new Error('A rejection reason is required');
      if (action.kind === 'confirm-record') {
        const record = snapshot.records[String(action.payload.recordId)];
        if (!record || record.appId !== this.app.id || record.version !== action.payload.version) throw new Error('Record changed; decision was not applied');
        if (decision.type === 'reject') {
          if (record.sourcedBy !== 'human') record.confirmation = 'rejected';
          action.status = 'rejected';
        } else {
          let value = action.payload.proposedValue;
          if (decision.type === 'edit') {
            const parser = this.app.records?.[record.type]?.parseValue;
            if (!parser) throw new Error('This record type cannot be edited');
            const parsed = parser(decision.value, deepFreeze(clone(record)));
            if ('error' in parsed) throw new Error(parsed.error);
            value = parsed.value;
          } else if (decision.type === 'pick') {
            const candidates = action.payload.candidates;
            if (!Array.isArray(candidates) || !Number.isInteger(decision.index) || decision.index < 0 || decision.index >= candidates.length) throw new Error('Candidate is not in the stored list');
            value = candidates[decision.index];
          }
          canonical(value);
          const changed = canonical(record.value) !== canonical(value);
          record.value = clone(value); record.confirmation = 'confirmed'; record.updatedAt = this.now();
          // Every explicit human choice wins against future source polls, including approval.
          record.sourcedBy = 'human'; if (changed) record.version++;
          action.status = 'approved'; this.append(snapshot, 'approved', [id], { actor });
          action.status = 'executing'; this.append(snapshot, 'executing', [id], { builtin: true });
          action.status = 'succeeded'; action.result = { recordId: record.id, value: record.value };
          this.supersede(snapshot, record.id, action.id);
        }
        this.append(snapshot, 'record-decided', [record.id, id], { confirmation: record.confirmation, version: record.version });
      } else {
        if (decision.type === 'edit' || decision.type === 'pick') throw new Error('Only confirm-record supports edits and candidate picks');
        action.status = decision.type === 'reject' ? 'rejected' : 'approved';
      }
      action.decidedBy = actor; action.decidedAt = this.now();
      this.append(snapshot, action.status, [id], { actor, ...(decision.type === 'reject' ? { reason: decision.reason } : {}) });
      return { value: action, write: true };
    });
  }
  async simulate(input: EventInput): Promise<{ event: Event; actions: ActionCandidate[]; records: RecordUpsert[]; trace: TraceEntry[]; simulation: true }> {
    const event = this.makeEvent(input); const evaluation = this.evaluate(event, await this.store.read());
    return { event, actions: evaluation.actions, records: evaluation.records, trace: evaluation.trace, simulation: true };
  }
  async accept(sourceId: string, raw: Parameters<NonNullable<App['sources'][number]['accept']>>[0]): Promise<Delivery> {
    const source = this.app.sources.find(s => s.id === sourceId);
    if (!source?.accept || source.type === 'poll') throw new Error('Source not found');
    const accepted = await source.accept(raw);
    if (!present(accepted.key)) throw new Error('Source returned an empty delivery key');
    canonical(accepted.payload);
    const id = hash([this.app.id, 'delivery', sourceId, accepted.key]);
    const delivery = await this.update(snapshot => {
      if (snapshot.deliveries[id]) return { value: snapshot.deliveries[id], write: false };
      const value: Delivery = { id, appId: this.app.id, source: sourceId, key: accepted.key, payload: accepted.payload, demo: accepted.demo === true, receivedAt: this.now(), status: 'accepted' };
      snapshot.deliveries[id] = value; this.append(snapshot, 'delivery-accepted', [id]); return { value, write: true };
    });
    if (source.type === 'cli' && delivery.status === 'accepted') await this.expand(delivery);
    return delivery;
  }
  private async expand(delivery: Delivery): Promise<void> {
    const source = this.app.sources.find(s => s.id === delivery.source);
    if (!source) throw new Error('Delivery source no longer configured');
    const expanded = source.expand ? await source.expand(clone(delivery.payload), { clock: this.now(), http: this.options.http ?? fetch, signal: AbortSignal.timeout(this.options.executeTimeoutMs ?? 30_000), validators: {} }) : [{ idempotencyKey: delivery.key, source: source.id, kind: source.id, subject: source.id, data: jsonObject(delivery.payload) ? delivery.payload : { value: delivery.payload }, demo: delivery.demo }];
    for (const event of Array.isArray(expanded) ? expanded : expanded.events) {
      if (!event.idempotencyKey) { await this.note('invalid-event-dropped', [delivery.id], { source: source.id }); continue; }
      await this.ingest({ ...event, demo: delivery.demo || event.demo });
    }
    await this.update(snapshot => {
      const current = snapshot.deliveries[delivery.id];
      if (!current || current.status === 'expanded') return { value: null, write: false };
      current.status = 'expanded'; delete current.lastError; this.append(snapshot, 'delivery-expanded', [delivery.id]); return { value: null, write: true };
    });
  }
  private policy(action: Action) { return { maxAttempts: 5, baseMs: 1_000, capMs: 60_000, ...this.app.actions[action.kind]?.retry }; }
  private async execute(id: string): Promise<boolean> {
    const claimed = await this.update(snapshot => {
      const action = snapshot.actions[id];
      if (!action || action.appId !== this.app.id || action.kind === 'confirm-record') return { value: undefined, write: false };
      if (!['approved', 'auto-approved', 'retry-wait'].includes(action.status) || (action.nextAttemptAt && action.nextAttemptAt > this.now())) return { value: undefined, write: false };
      if (action.attempts >= this.policy(action).maxAttempts) { action.status = 'dead'; this.append(snapshot, 'dead', [id], { reason: 'Attempt limit' }); return { value: undefined, write: true }; }
      action.status = 'executing'; action.attempts++; action.totalAttempts++; action.leaseUntil = addMs(this.now(), (this.options.executeTimeoutMs ?? 30_000) + (this.options.leaseMarginMs ?? 5_000));
      this.append(snapshot, 'executing', [id], { attempt: action.totalAttempts, lookup: action.unknownOutcome ? (this.app.actions[action.kind]?.lookup ? 'required' : 'unavailable') : 'not-needed' }); return { value: action, write: true };
    });
    if (!claimed) return false;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const task = (async () => {
      const kind = this.app.actions[claimed.kind];
      if (!kind) throw new ExecutionError('Action kind no longer configured', false);
      const ctx = { idempotencyKey: claimed.idempotencyKey, signal: controller.signal, clock: this.now(), http: this.options.http ?? fetch };
      if (claimed.unknownOutcome && kind.lookup) {
        let found: Json | undefined;
        try { found = await kind.lookup(clone(claimed.payload), ctx); } catch { throw new ExecutionError('Lookup failed; execution withheld', true, undefined, true); }
        if (found !== undefined) return found;
      }
      return await kind.execute(clone(claimed.payload), ctx);
    })();
    const finish = async (result: Json | undefined, error?: unknown): Promise<void> => {
      await this.update(snapshot => {
        const action = snapshot.actions[id];
        if (!action || action.status !== 'executing' || action.totalAttempts !== claimed.totalAttempts) { this.append(snapshot, 'late-result-ignored', [id], { attempt: claimed.totalAttempts }); return { value: null, write: true }; }
        delete action.leaseUntil;
        if (!error) { canonical(result); action.status = 'succeeded'; action.result = result; delete action.unknownOutcome; delete action.nextAttemptAt; delete action.lastError; this.append(snapshot, 'succeeded', [id]); }
        else {
          const policy = this.policy(action); const retryable = !(error instanceof ExecutionError) || error.retryable;
          action.unknownOutcome = timedOut || (error instanceof ExecutionError && error.unknownOutcome) || action.unknownOutcome;
          action.lastError = errorText(error).slice(0, 500);
          if (!retryable || action.attempts >= policy.maxAttempts) action.status = 'dead';
          else { action.status = 'retry-wait'; action.nextAttemptAt = addMs(this.now(), retryDelay(action.attempts, policy.baseMs, policy.capMs, this.options.random, error instanceof ExecutionError ? error.retryAfterMs : 0)); }
          this.append(snapshot, action.status, [id], { reason: action.lastError, lookupAvailable: !!this.app.actions[action.kind]?.lookup });
        }
        return { value: null, write: true };
      });
    };
    try {
      const result = await Promise.race([task, new Promise<never>((_, reject) => { timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new ExecutionError('Execution timed out', true, undefined, true)); }, this.options.executeTimeoutMs ?? 30_000); })]);
      await finish(result);
    } catch (error) { await finish(undefined, error); }
    finally { if (timer) clearTimeout(timer); }
    if (timedOut) void task.then(() => this.note('late-executor-completed', [id], { attempt: claimed.totalAttempts }), () => this.note('late-executor-failed', [id], { attempt: claimed.totalAttempts })).catch(() => undefined);
    return true;
  }
  async resetDemo(actor: string): Promise<{ removed: number }> {
    if (!actor.trim()) throw new Error('An actor is required');
    return this.update(snapshot => {
      if (Object.values(snapshot.actions).some(a => a.appId === this.app.id && a.demo && (a.status === 'executing' || a.unknownOutcome))) throw new Error('Cannot reset while demo actions are executing or have unknown outcomes');
      let removed = 0;
      for (const field of ['events', 'records', 'actions', 'deliveries'] as const) {
        for (const [id, item] of Object.entries(snapshot[field])) if (item.appId === this.app.id && item.demo) { delete snapshot[field][id]; removed++; }
      }
      for (const schedule of Object.keys(snapshot.schedules)) if (schedule.startsWith(`${this.app.id}:`)) delete snapshot.schedules[schedule];
      this.append(snapshot, 'demo-reset', [], { actor, removed, externalEffectsUndone: false });
      return { value: { removed }, write: true };
    });
  }
  async tick(): Promise<{ executed: number; errors: string[] }> {
    const errors: string[] = []; let executed = 0;
    for (const delivery of Object.values((await this.store.read()).deliveries)) if (delivery.appId === this.app.id && delivery.status === 'accepted') {
      try { await this.expand(delivery); } catch (error) { errors.push(errorText(error)); await this.update(s => { const current = s.deliveries[delivery.id]; if (!current || current.status === 'expanded') return { value: null, write: false }; current.lastError = errorText(error).slice(0, 500); this.append(s, 'delivery-failed', [delivery.id], { reason: current.lastError }); return { value: null, write: true }; }); }
    }
    for (const source of this.app.sources.filter(s => s.type === 'poll')) {
      const scheduleId = `${this.app.id}:poll:${source.id}`; const schedule = (await this.store.read()).schedules[scheduleId];
      if (schedule && schedule.nextAt > this.now()) continue;
      try {
        const output = await source.expand!(null, { clock: this.now(), http: this.options.http ?? fetch, validators: clone(schedule?.validators ?? {}), signal: AbortSignal.timeout(this.options.executeTimeoutMs ?? 30_000) });
        for (const event of Array.isArray(output) ? output : output.events) {
          if (!event.idempotencyKey) { await this.note('invalid-event-dropped', [], { source: source.id }); continue; }
          await this.ingest(event);
        }
        await this.update(s => { s.schedules[scheduleId] = { nextAt: addMs(this.now(), source.intervalMs ?? 60_000), validators: Array.isArray(output) ? {} : output.validators ?? {} }; this.append(s, 'poll-completed', [], { source: source.id }); return { value: null, write: true }; });
      } catch (error) {
        errors.push(errorText(error));
        await this.update(s => { s.schedules[scheduleId] = { nextAt: addMs(this.now(), source.intervalMs ?? 60_000), validators: s.schedules[scheduleId]?.validators ?? {} }; this.append(s, 'poll-failed', [], { source: source.id, reason: errorText(error).slice(0, 500) }); return { value: null, write: true }; });
      }
    }
    for (const aggregate of this.app.aggregates ?? []) {
      try {
        await this.update(snapshot => {
          const scheduleId = `${this.app.id}:aggregate:${aggregate.id}`;
          if (snapshot.schedules[scheduleId]?.nextAt > this.now()) return { value: null, write: false };
          const mark: Mark = { sources: new Set(), demo: false };
          const candidate = aggregate.evaluate(Object.freeze({ clock: this.now(), state: this.view(snapshot, mark) }));
          snapshot.schedules[scheduleId] = { nextAt: addMs(this.now(), aggregate.intervalMs ?? 1_000), validators: {} };
          if (candidate) {
            if (Array.isArray(candidate) || !present(candidate.key)) this.append(snapshot, 'aggregate-rejected', [], { aggregate: aggregate.id });
            else this.propose(snapshot, candidate, hash([this.app.id, 'aggregate', aggregate.id, candidate.key]), { actions: [], records: [], trace: [], mark });
          }
          this.append(snapshot, 'aggregate-evaluated', [], { aggregate: aggregate.id }); return { value: null, write: true };
        });
      } catch (error) { errors.push(errorText(error)); await this.note('aggregate-failed', [], { aggregate: aggregate.id, reason: errorText(error).slice(0, 500) }); }
    }
    await this.update(snapshot => {
      let write = false;
      for (const action of Object.values(snapshot.actions)) if (action.appId === this.app.id && action.status === 'executing' && action.leaseUntil && action.leaseUntil <= this.now()) {
        action.status = action.attempts >= this.policy(action).maxAttempts ? 'dead' : 'retry-wait'; action.unknownOutcome = true; action.nextAttemptAt = this.now(); delete action.leaseUntil;
        this.append(snapshot, 'lease-expired', [action.id], { attempt: action.totalAttempts }); write = true;
      }
      return { value: null, write };
    });
    for (const action of Object.values((await this.store.read()).actions)) if (action.appId === this.app.id) {
      try { if (await this.execute(action.id)) executed++; } catch (error) { errors.push(errorText(error)); }
    }
    return { executed, errors };
  }
}
