# Requirements: approval-ui

## Introduction

`approval-ui` is the small web UI where a person meets Wraith Kit: a queue of proposed actions (working name "Limbo"), an action detail with the full explanation and an exact preview, the decisions (approve, pick a listed candidate, edit then approve, reject, retry), the audit log with a chain-verified badge, and a settings screen. It is the skeleton's `ui` entry, shared by both apps and by app #3, and it runs in both runtimes.

**Status.** Requirements written on 16 Nov 2026 in Kiro CLI (driven by T3 Code), by hand in the format Kiro documents for feature specs ([Feature Specs](https://kiro.dev/docs/specs/feature-specs), EARS acceptance criteria). design.md and tasks.md are written in the CLI after `wraith-core`'s design exists (PLAN.md section 12).

**In scope.** Server-rendered pages and the progressive-enhancement script; the queue, action detail, `confirm-record` detail, audit log and settings screens; the decision forms; the theme; keyboard use and accessibility checks; DEMO labels; sessions (cookie, CSRF token, CSP), the local one-time link exchange, the hosted login form, public read-only pages on the hosted stacks, and the notice shown before an approval that has a real outside effect.

**Out of scope.** What a decision does to actions and records (`wraith-core`: approval gate, `parseValue`, version conditions, supersede); creating the one-time login link and storing secrets (`runtimes`); provider status and the privacy text (`llm-adapter`, shown here); the content of app views, the issue text and the daily issue cap (`todo-afterlife`); the digest and `.ics` content (`notice-ghoul`).

**Sources in PLAN.md.** Section 5.6 (approval UI), 5.4 (approval UI sessions, hosted demo with real issues), 1 (product honesty rules, "Limbo", plain button words), 11.3 (hosted demo mode and how judges get in) and 17.2 item 5 (the defaults kept: "Limbo", the colours).

**Dependencies.** `wraith-core` (decisions, the explanation in wraith-core 6.6, `confirm-record` in wraith-core 13.1 to 13.13, the `html` template in wraith-core 23.1 to 23.3, `wraith audit verify` in wraith-core 22.9 to 22.11), `runtimes` (the local server and one-time login link in runtimes 7.1 to 7.7, secrets in runtimes 8.4 and 8.5) and `llm-adapter` (provider status and privacy disclosure).

## Glossary

- **Approval UI:** the skeleton's `ui` entry and the pages it serves; the system these requirements describe.
- **Queue:** the list of actions, grouped by app; its working name is "Limbo".
- **Action detail:** the page for one action: its event, rules, suggestion, preview and decisions.
- **Decision:** approve, pick a listed candidate, edit then approve, reject with a reason, or retry a `dead` action.
- **Candidate:** one of the other values a `confirm-record` action lists (for example the other reading of an ambiguous date).
- **Audit log screen:** the page that lists audit entries and shows the chain-verified badge.
- **Chain-verified badge:** the mark that shows the result of `wraith audit verify` (wraith-core 22.9 to 22.11).
- **Settings screen:** the page that shows the LLM provider status, the privacy disclosure, demo mode and the shortcut setting.
- **Session:** a signed-in state held in a cookie after a one-time link or a login form.
- **CSRF token:** a per-session value sent with every POST, so that another site cannot submit a form as the person.
- **CSP:** the Content-Security-Policy response header.
- **Admin token:** a stack's owner token, never shared. **Demo access code:** the code judges use on the hosted stacks; it is not the admin token.
- **Hosted stack:** `todo-afterlife` or `notice-ghoul-demo` on AWS (`runtimes` spec).
- **Read-only page:** a page that shows data and offers no decision: queue, action detail, audit log and app outputs.
- **Real executor:** an executor whose effect happens outside Wraith Kit (on `todo-afterlife`, creating a real issue in the sandbox repo). **Dry-run:** an executor that shows the effect it would have and does nothing outside Wraith Kit.
- **Accent:** the one colour an app's `theme` adds to the shared dark theme.
- **DEMO label:** the visible mark on demo data.

## Requirements

### Requirement 1: Server-rendered pages with progressive enhancement

**User story:** As a developer adopting the skeleton, I want the UI rendered on the server with no frontend framework, so that it stays small and every decision still works without JavaScript.

#### Acceptance criteria

1. THE approval UI SHALL render every screen as HTML on the server, from the skeleton's `ui` entry.
2. THE approval UI SHALL use no frontend framework and need no UI build step.
3. THE approval UI SHALL load no script other than its own small progressive-enhancement script.
4. WHILE JavaScript is turned off in the browser, THE approval UI SHALL still let a signed-in person make every decision through plain HTML forms.
5. THE approval UI SHALL render all event text, record data and LLM output through the skeleton's `html` template (wraith-core 23.1).
6. THE approval UI SHALL apply every decision through the Wraith core and change no action or record by itself.

### Requirement 2: The queue ("Limbo")

**User story:** As a person approving actions, I want one queue grouped by app with pending items first, so that I can see at once what is waiting for me.

#### Acceptance criteria

1. THE approval UI SHALL show a queue of actions grouped by app, with pending actions first within each app.
2. THE approval UI SHALL title the queue screen "Limbo", the working name of the approval queue, unless the author changes it.
3. THE approval UI SHALL show for each queued action its app, its kind, a short preview, its status and, for demo data, its DEMO label.
4. THE approval UI SHALL label the decision buttons with the plain words "Approve" and "Reject" on every screen.

### Requirement 3: Action detail

**User story:** As a person deciding on an action, I want to see where it came from, why it was proposed and exactly what approving it will do, so that I can decide without guessing.

#### Acceptance criteria

1. WHEN a person opens an action, THE approval UI SHALL show the event the action came from.
2. WHEN a person opens an action, THE approval UI SHALL show the rules that ran, in evaluation order, with their findings.
3. WHEN a person opens an action, THE approval UI SHALL label its suggestion "Rule-based" when it came from the rules, or "AI-suggested: <provider>/<model>" when it came from an LLM.
4. WHEN a person opens an action whose advisor call fell back, THE approval UI SHALL show the fallback reason.
5. WHEN a person opens an action, THE approval UI SHALL show the exact preview of the effect that approving it would have, as the action kind's `describe` returns it (for example the issue title and body, or the digest).
6. WHEN a person opens an action of a safe kind, THE approval UI SHALL show the written reason that the kind declares.
7. WHEN a person opens an action that carries `llmSourced: true`, THE approval UI SHALL say that it needs approval because it carries unconfirmed LLM-sourced data.
8. WHEN a person opens an action, THE approval UI SHALL show its status, its attempts and, after a failed attempt, the last error.

### Requirement 4: Confirm-record detail

**User story:** As a student checking a deadline that Notice Ghoul is unsure of, I want the quote, the candidate dates and the reason in one place, so that I can confirm, correct or reject the date quickly.

#### Acceptance criteria

1. WHEN a person opens a `confirm-record` action, THE approval UI SHALL show the quoted source text, every candidate value and the reason a person is needed.
2. WHEN a person opens a `confirm-record` action for a record that holds a value with `sourcedBy: human`, THE approval UI SHALL show that value next to the proposed one.
3. WHEN a person opens a superseded action, THE approval UI SHALL say that it was replaced and link to the newer action when there is one.
4. WHERE a record type has no `parseValue`, THE approval UI SHALL show no edit field for its `confirm-record` actions.

### Requirement 5: Decisions

**User story:** As a person approving actions, I want approve, pick, edit, reject and retry to be safe to use, so that a typo or a stale page never changes data by mistake.

#### Acceptance criteria

1. WHEN a person approves an action, THE approval UI SHALL send the approval to the Wraith core and then show the action's new status.
2. WHEN a person picks a listed candidate, THE approval UI SHALL send only the candidate's position in the stored action, never a value.
3. WHEN a person submits an edited value, THE approval UI SHALL send it to the Wraith core, which checks it with the record type's `parseValue` on the server.
4. IF the Wraith core returns a `parseValue` error for an edited value, THEN THE approval UI SHALL show the error next to the field, keep the typed text in the field and say that nothing was changed.
5. WHEN a person rejects an action, THE approval UI SHALL ask for a reason and send it with the rejection.
6. IF a reject request has no reason, THEN THE approval UI SHALL return a form error and change nothing.
7. WHEN a person retries a `dead` action, THE approval UI SHALL send the retry to the Wraith core (wraith-core 16.4).
8. IF the Wraith core reports that an action was superseded or is no longer pending when a decision arrives, THEN THE approval UI SHALL say that the decision was not applied and link to the action's current state.

### Requirement 6: Audit log screen

**User story:** As a reviewer, I want to read the audit log and see whether the chain verifies, so that I can trust what the log says and know the limits of that trust.

#### Acceptance criteria

1. THE approval UI SHALL show the audit log in `seq` order, with each entry's type, time and references.
2. WHEN the audit log screen is shown, THE approval UI SHALL run the chain verification and show a "chain verified" badge only when it passes.
3. IF the chain verification fails, THEN THE approval UI SHALL show a failed badge that names the first `seq` that does not verify.
4. THE approval UI SHALL show next to the badge what a pass proves and what it does not prove (wraith-core 22.11).

### Requirement 7: Settings screen

**User story:** As a person running an app, I want to see which LLM provider is active and what data it sees, so that I know where event text goes.

#### Acceptance criteria

1. THE approval UI SHALL show on the settings screen the active LLM provider, its model and its status as the LLM adapter reports them.
2. THE approval UI SHALL show on the settings screen the privacy disclosure for the active provider, as the LLM adapter supplies it.
3. THE approval UI SHALL show on the settings screen whether demo mode is on.

### Requirement 8: Keyboard first

**User story:** As a person working through many approvals, I want to move and decide with the keyboard, so that a repetitive task is fast and possible without a mouse.

#### Acceptance criteria

1. THE approval UI SHALL let a person reach and use every control with the keyboard alone.
2. WHILE focus is on the queue or an action detail and not in a text field, THE approval UI SHALL move to the next action on `j` and to the previous action on `k` (proposed keys).
3. WHILE focus is on the queue or an action detail and not in a text field, THE approval UI SHALL treat `a` as the Approve control and `r` as the Reject control of the current action (proposed keys).
4. WHILE focus is in a text field, THE approval UI SHALL not treat `j`, `k`, `a` or `r` as shortcuts.
5. THE approval UI SHALL provide a setting that turns the single-key shortcuts off, as WCAG 2.2 success criterion 2.1.4 (Character Key Shortcuts) requires for shortcuts made of letter keys only.
6. THE approval UI SHALL show a visible focus indicator on every focusable control.

### Requirement 9: Accessibility checks

**User story:** As a person with low vision or motion sensitivity, I want readable contrast and no forced motion, so that I can use the UI comfortably.

#### Acceptance criteria

1. THE approval UI SHALL meet WCAG 2.2 success criterion 1.4.3 (Contrast (Minimum), level AA) for all text, including text in each app's accent colour, against the dark theme.
2. WHILE the browser reports `prefers-reduced-motion: reduce`, THE approval UI SHALL show no animation or motion transition.
3. THE approval UI SHALL pass the axe checks that `@axe-core/playwright` runs in the Playwright end-to-end flows of both apps, on every screen, with no violations.

### Requirement 10: One shared theme

**User story:** As a judge watching both apps, I want one coherent look with a different accent per app, so that it is clear the two apps share one skeleton.

#### Acceptance criteria

1. THE approval UI SHALL use one shared dark theme for every app.
2. THE approval UI SHALL take each app's accent colour from the app's `theme` extension point (proposed: spectral green for TODO Afterlife and candle amber for Notice Ghoul), and use the skeleton's base accent when an app has no theme.
3. THE approval UI SHALL use the system font stack and load no web font.
4. THE approval UI SHALL use only self-drawn SVG icons and load no icon pack.
5. THE approval UI SHALL request no font, icon, script or style from a third-party host.

### Requirement 11: DEMO labels

**User story:** As a judge or visitor, I want demo data marked on every screen, so that I never mistake it for real data.

#### Acceptance criteria

1. THE approval UI SHALL show a visible DEMO label on every demo event, record, action and output it shows.
2. WHERE demo mode is on, THE approval UI SHALL show on every page that the app is running on demo data.

### Requirement 12: Sessions and request safety

**User story:** As the owner of a stack, I want sessions and forms protected against common web attacks, so that another site or a leaked link cannot make decisions for me.

#### Acceptance criteria

1. THE approval UI SHALL keep a session in a cookie set with the `HttpOnly` and `SameSite=Strict` attributes.
2. WHERE the approval UI runs on AWS, THE approval UI SHALL also set the session cookie's `Secure` attribute.
3. THE approval UI SHALL put a CSRF token in every form that sends a POST.
4. IF a POST arrives without the valid CSRF token of its session, THEN THE approval UI SHALL refuse it and change nothing.
5. THE approval UI SHALL send on every page a Content-Security-Policy header that allows no inline script.
6. THE approval UI SHALL never carry a login token or session token in a URL query string after login.
7. WHEN a token in a URL has been exchanged for a session, THE approval UI SHALL redirect to a URL without the token.

### Requirement 13: Local sign-in

**User story:** As a developer running an app locally, I want to sign in with the one-time link the server opened for me, so that I never copy a token from the terminal.

#### Acceptance criteria

1. WHEN a person opens the one-time login link (runtimes 7.2 to 7.4), THE approval UI SHALL exchange its token once for a session cookie.
2. IF a one-time login link is opened after its token was already exchanged, THEN THE approval UI SHALL create no session and say that the link was already used.

### Requirement 14: Hosted sign-in and public read-only pages

**User story:** As a judge, I want to read everything on the hosted demo without signing in and to make decisions with the demo access code, so that I can test the apps freely without the owner's token.

#### Acceptance criteria

1. WHERE the approval UI runs on AWS, THE approval UI SHALL provide a login form that exchanges the stack's admin token or demo access code once for a session cookie.
2. IF the login form receives a token or code that is not valid for the stack, THEN THE approval UI SHALL create no session and show an error.
3. THE approval UI SHALL accept a stack's demo access code only on the stack it belongs to.
4. WHERE the approval UI runs on a hosted stack, THE approval UI SHALL serve the read-only pages (queue, action detail, audit log and the app's outputs, such as the digest and the `.ics` file) to anyone, without a session.
5. WHERE the approval UI runs on a hosted stack, THE approval UI SHALL require a session from the demo access code or the admin token for every decision.
6. IF a decision request arrives on a hosted stack without a valid session, THEN THE approval UI SHALL refuse it, change nothing and offer the login form.

### Requirement 15: Notice before an approval with a real outside effect

**User story:** As a judge on the `todo-afterlife` stack, I want to be told before I click that approving creates a real public issue, so that I never create one by surprise.

#### Acceptance criteria

1. WHERE an action's executor is real and its effect happens outside Wraith Kit, THE approval UI SHALL show, before the Approve control in both reading order and focus order, a notice that approving it performs that effect for real, with the text the action kind supplies.
2. WHERE the approval UI runs on the `todo-afterlife` stack, THE approval UI SHALL say before the Approve control of an "open issue" action that approving it creates a real public issue in the sandbox repo, which the demo reset cannot undo.
3. WHERE an action's executor runs in dry-run, THE approval UI SHALL say that approving it changes nothing outside Wraith Kit and show the exact effect it would have had.
4. WHEN the `a` shortcut is used on an action whose executor has a real outside effect, THE approval UI SHALL ask for a confirmation that repeats the notice before it sends the approval.

## Notes for the design phase

### Open design questions that PLAN.md leaves to this spec

1. **Defaults the author kept without an answer.** PLAN.md 17.2 item 5: "'Limbo' stays the working name of the approval queue (section 1); spectral green for TODO Afterlife and candle amber for Notice Ghoul (section 5.6)". PLAN.md 5.6 proposes the keys: "Keyboard first (proposed: j and k to move, a to approve, r to reject, visible focus)". Criteria: 2.2, 8.2, 8.3, 10.2.
2. None of the four spec-phase items in the plan reviews' list of remaining issues (task notes kept outside this repo) belongs to this spec.

### Other questions found while writing these requirements

- **Session lifetime and sign-out.** PLAN.md sets the cookie attributes but no lifetime, idle timeout or sign-out control.
- **Local read-only access.** PLAN.md makes read-only pages public on the hosted stacks only (14.4). Does the local server require a session for every page, including the digest and `.ics` URLs that a calendar app may fetch?
- **Admin token versus demo access code.** Both create a session (14.1). Which actions, if any, only the admin token may take (for example turning demo mode or the shortcuts setting on or off for everyone, or a manual retry).
- **Login attempts.** Whether the login form limits wrong attempts beyond the per-stack daily request cap (runtimes 12.2).
- **How an action kind declares a real outside effect** and supplies the notice text (15.1), without the skeleton naming any app.
- **The badge's cost.** Verifying the whole chain on every view of the audit log screen (6.2) grows with the chain. Decide whether to verify on each view or cache the last result with the head `seq` it covered.
- **axe scope.** Which axe rule tags and impact levels count as violations (9.3).
- **Contrast numbers.** The accent colours are proposed by name only. Their exact values, and the ratios measured against the dark background, come from design (9.1).
- **Cold start status.** How the settings screen shows "provider warming up" after a 503 is an open `llm-adapter` question (7.1).

### Properties and checks

PLAN.md section 9.1 has no property owned by this spec. P5 (approval gate) is enforced by the Wraith core, and the UI must not weaken it: criteria 1.6, 5.2, 5.3, 5.4 and 14.5 are checked by Playwright flows that try a stale decision, a bad edit and a candidate position outside the list. The accessibility criteria (8.1 to 8.6, 9.1 to 9.3) are checked by Playwright with `@axe-core/playwright` (PLAN.md 9.3), and the session criteria (12.1 to 14.6) by HTTP-level tests against both runtimes.

### Docs still to confirm (cite in design.md)

- WCAG 2.2 ([W3C Recommendation](https://www.w3.org/TR/WCAG22/), read 16 Nov 2026): success criterion 1.4.3 Contrast (Minimum), level AA, "a contrast ratio of at least 4.5:1", and 3:1 for large-scale text; 2.1.4 Character Key Shortcuts, level A: a letter-only shortcut needs a way to turn it off, a way to remap it, or to be active only on focus; 2.4.7 Focus Visible, level AA. The rest of the WCAG 2.2 AA list is checked in design.
- Cookie attributes `HttpOnly`, `Secure` and `SameSite=Strict` (the HTTP cookie specification and MDN).
- Content-Security-Policy `script-src` without `'unsafe-inline'` (CSP Level 3 and MDN).
- The `prefers-reduced-motion` media feature (Media Queries Level 5 and MDN).
- `@axe-core/playwright` and Playwright APIs, versions and licenses (README "Pre-existing work" lists them when they are installed).
- How Lambda Function URLs pass request cookies and `Set-Cookie` headers (through the `aws-docs` MCP server).
- Kiro: Analyze Requirements (`/spec analyze_requirements approval-ui`, per [Analyze Requirements](https://kiro.dev/docs/specs/analyze-requirements)) has not been run on this file yet; it needs a Kiro session started in `wraith-kit/`.
