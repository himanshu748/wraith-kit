// WRAITH-SKELETON
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export interface EventInput { idempotencyKey: string; source: string; kind: string; subject: string; data: JsonObject; occurredAt?: string; demo?: boolean }
export interface Event extends EventInput { id: string; appId: string; occurredAt: string; receivedAt: string; demo: boolean; extracted?: { value: Json; quote: string; provider: string; model: string; deterministic?: boolean }[] }
export interface Finding { ruleId: string; severity: 'info' | 'warning' | 'error'; message: string; evidence?: string }
export interface RecordEntry { id: string; appId: string; type: string; key: string; value: Json; data: JsonObject; sourcedBy: string; confirmation: 'none' | 'confirmed' | 'rejected'; version: number; updatedAt: string; demo: boolean }
export interface RecordQuery { type?: string; key?: string; includeUnconfirmed?: boolean; where?: (record: Readonly<RecordEntry>) => boolean }
export interface StateView { records(query?: RecordQuery): readonly Readonly<RecordEntry>[]; actions(): readonly Readonly<Action>[]; get(type: string, key: string, options?: { includeUnconfirmed?: boolean }): Readonly<RecordEntry> | undefined }
export interface RuleContext { clock: string; state: StateView }
export interface Confirmation { reason: string; candidates?: Json[] }
export interface RecordUpsert { type: string; key: string; value?: Json; data?: JsonObject; confirm?: Confirmation }
export interface ActionCandidate { kind: string; target: string; payload: JsonObject; preview?: string }
export interface RuleResult { findings?: Omit<Finding, 'ruleId'>[]; actions?: ActionCandidate[]; records?: RecordUpsert[]; stop?: boolean }
export interface Rule { id: string; priority: number; description: string; evaluate(event: Readonly<Event>, ctx: RuleContext): RuleResult }
export interface RetryPolicy { maxAttempts: number; baseMs: number; capMs: number }
export interface ExecuteContext { idempotencyKey: string; signal: AbortSignal; clock: string; http: typeof fetch }
export interface ActionKind { describe(payload: JsonObject): string; execute(payload: JsonObject, ctx: ExecuteContext): Promise<Json> | Json; lookup?(payload: JsonObject, ctx: ExecuteContext): Promise<Json | undefined>; safety?: 'safe' | 'approval'; effect?: 'external'; reason?: string; retry?: Partial<RetryPolicy> }
export interface RawInput { body: string; headers: Record<string, string>; path: string; method?: string }
export interface AcceptedInput { key: string; payload: Json; demo?: boolean }
export interface ExpandContext { clock: string; http: typeof fetch; validators: JsonObject; signal: AbortSignal }
export interface ExpandedInput { events: EventInput[]; validators?: JsonObject }
export interface Source { id: string; type: 'webhook' | 'cli' | 'poll'; path?: string; intervalMs?: number; accept?(raw: RawInput): AcceptedInput | Promise<AcceptedInput>; expand?(payload: Json, ctx: ExpandContext): Promise<EventInput[] | ExpandedInput> | EventInput[] | ExpandedInput }
export interface Aggregate { id: string; intervalMs?: number; evaluate(ctx: RuleContext): (ActionCandidate & { key: string }) | undefined }
export interface RecordType { parseValue?(text: string, record: Readonly<RecordEntry>): { value: Json } | { error: string } }
export interface AdviceResult { provider: string; model: string; value?: Json; raw?: string; fallback?: string }
export interface AdvisorClient { complete(prompt: string, parse: (input: unknown) => Json): Promise<AdviceResult> }
export interface Advisor { mode: 'extract' | 'reword'; prompt(event: Readonly<Event>, actions: readonly ActionCandidate[]): string | undefined; parse(input: unknown): Json; fallback(event: Readonly<Event>, actions: readonly ActionCandidate[]): Json; verify?(value: Json, quote: string, event: Readonly<Event>): boolean }
export interface AppDefinition { id: string; sources: readonly Source[]; rules: readonly Rule[]; actions: Readonly<Record<string, ActionKind>>; records?: Readonly<Record<string, RecordType>>; aggregates?: readonly Aggregate[]; advisor?: Advisor; theme?: { name?: string; accent?: string; icon?: string; description?: string }; views?: Readonly<Record<string, (data: Json) => string>> }
export type App = Readonly<AppDefinition>;
export type ActionStatus = 'proposed' | 'approved' | 'auto-approved' | 'executing' | 'succeeded' | 'retry-wait' | 'dead' | 'rejected' | 'superseded';
export interface TraceEntry { ruleId: string; findings: Finding[]; stop: boolean }
export interface Action { id: string; appId: string; idempotencyKey: string; eventId?: string; kind: string; target: string; payload: JsonObject; preview: string; safety: 'safe' | 'approval'; safetyReason?: string; llmSourced: boolean; status: ActionStatus; attempts: number; totalAttempts: number; createdAt: string; leaseUntil?: string; nextAttemptAt?: string; decidedBy?: string; decidedAt?: string; result?: Json; lastError?: string; unknownOutcome?: boolean; demo: boolean; trace: TraceEntry[]; suggestion?: { by: string; text: string; raw?: string; fallback?: string }; supersededBy?: string }
export interface Delivery { id: string; appId: string; source: string; key: string; payload: Json; demo: boolean; receivedAt: string; status: 'accepted' | 'expanded'; lastError?: string }
export interface AuditEntry { seq: number; at: string; appId: string; type: string; references: string[]; data: JsonObject; prevHash: string; hash: string }
export interface Snapshot { meta?: JsonObject; revision: number; events: Record<string, Event>; records: Record<string, RecordEntry>; actions: Record<string, Action>; deliveries: Record<string, Delivery>; schedules: Record<string, { nextAt: string; validators: JsonObject }>; audit: AuditEntry[] }
export interface Store { read(): Promise<Snapshot>; compareAndSwap(expectedRevision: number, next: Snapshot): Promise<boolean> }
export interface EngineOptions { auditKey: string; clock?: () => Date; random?: () => number; http?: typeof fetch; advisor?: AdvisorClient; advisorOff?: boolean; executeTimeoutMs?: number; leaseMarginMs?: number; maxOutputs?: number; maxConflicts?: number }
export type Decision = { type: 'approve' } | { type: 'reject'; reason: string } | { type: 'edit'; value: string } | { type: 'pick'; index: number } | { type: 'retry' };
