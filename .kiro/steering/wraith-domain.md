---
inclusion: fileMatch
fileMatchPattern: ["skeleton/src/**", "apps/*/src/**"]
---

# Wraith domain invariants

These hold in every line of skeleton and app source. Each one comes from the PLAN.md section named after it. If a change would break one, stop and change the spec first.

1. **Approval by default.** Every action kind needs a human approval unless it declares `safety: "safe"` with a written `reason`, which the UI and the audit log show. Omitted safety means "needs approval". (PLAN.md 5.1 item 4, 5.4)
2. **Deterministic idempotency keys.** Event, action and delivery keys are derived from the source identity (and a content hash where the content can change), never from random values or the clock. The same event twice gives the same action key, so one action. (PLAN.md 5.2, 5.3)
3. **Pure rules.** A rule's `evaluate(event, ctx)` does no I/O, reads time only from `ctx.clock`, and reads other events' data only through `ctx.state`, a read-only snapshot taken before evaluation. Rules run in (priority, id) order, and rule ids are unique. (PLAN.md 5.1 item 2, 9.1 P3 and P4)
4. **Who writes records.** Records change only through rule upserts and the built-in `confirm-record` action. `expand`, the advisor, app `execute` functions and aggregates never write records. (PLAN.md 5.1, "Who writes records")
5. **`sourcedBy` moves only with the value.** `sourcedBy` is the provenance of `value` alone and is written only when the value is written. A change to the rest of a record's `data` never touches it, so a value a person entered stays `sourcedBy: human` and a rule upsert never overwrites it. (PLAN.md 5.1, 5.2)
6. **Typed values are checked on the server.** A value typed into a `confirm-record` edit is checked with the record type's `parseValue` on the server and stored in normal form; an invalid value changes nothing. A candidate pick sends the candidate's position in the stored action, never a typed value. (PLAN.md 5.1 extension point 8 and "The built-in confirm-record action")
7. **One store write per event.** An event, its record changes, the `confirm-record` actions it supersedes, its proposed actions and their audit entries are written in one store write, so a crash leaves all of them or none. (PLAN.md 5.3)
8. **LLM output is untrusted and verified.** In `reword` mode the LLM may change only the wording of actions the rules proposed, never kinds, targets or safety. In `extract` mode the app's deterministic `verify` must reproduce each proposed value from its evidence quote before the core accepts it. LLM output never decides safety, and it is escaped wherever it is shown. (PLAN.md 5.1 item 3, 5.4)
9. **Unconfirmed LLM-sourced data always needs approval.** The core, not the app, marks an evaluation that used accepted `extract` data or an unconfirmed LLM-sourced record; every action from it gets `llmSourced: true` and needs approval whatever its kind declares, and every new value it sets gets its own `confirm-record` request. (PLAN.md 5.1 "Who writes records", 5.4)
10. **Every transition is audited in the same write.** Every state change and every LLM call has an audit entry, written in the same store write as the change. LLM entries record provider, model, a prompt hash and any fallback reason, never keys. (PLAN.md 5.3 "Audit chain")
11. **Untrusted text is escaped in every output.** Event text (TODO comments, notice titles, quotes, LLM output) is escaped in HTML through the skeleton's `html` template, in Markdown by escaping its special characters, and in `.ics` with RFC 5545 text escaping and line folding. (PLAN.md 5.4, 7)
12. **Demo data is labelled.** Demo events, records, actions, digests, `.ics` files, fixtures and any issue created from demo data carry a visible "DEMO" label. (PLAN.md 1 "Product honesty rules", 5.4)
