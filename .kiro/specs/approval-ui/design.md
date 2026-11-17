# Design: approval UI

Authored by Codex on 17 Nov 2026 after the user instructed implementation to proceed. This is not a Kiro IDE Correctness run. The UI is a rendering module; the HTTP runtime owns sessions and request validation, and the core owns every state change.

## Product direction and page map

The audience alternates between a developer reviewing a code task and a student resolving a deadline. The shared experience should feel considered and quiet: a dark green-black canvas, cream text, spectral green or candle amber accents and a compact navigation rail. The Halloween character comes from an original line-drawn ghost and language about forgotten work, not distracting movement. This composition is an original design from the approved brief, not a claim of having reproduced external reference screens.

The public `/` page introduces the event → rules → review → audit journey and links to the active workspace. `/queue` is Limbo, with actual pending counts and filtered action rows. `/actions/:id` puts the exact preview and evidence before the decision form. `/audit` shows sequence order, verification state and verification limits. `/settings` explains provider privacy and enables optional keyboard shortcuts. `/login` exchanges an access code; `/digest`, calendar and patch download links are supplied as generic app metadata. The skeleton contains no app identifiers. App-authored HTML output documents can opt into the shared `digest-document` styles; the app still owns content and escaping. No raw-HTML interpolation path is added to the renderer.

System typography is deliberate: the platform UI sans serif for controls and dense lists, Georgia for brief editorial statements, and the platform monospace for source excerpts and audit identifiers. No font is downloaded. Body text is 15 px on desktop; supplementary data ranges from 10 to 13 px. Main headings use a narrow line length, restrained negative tracking and an accent period. Forms and detailed previews remain readable on narrow screens.

_Validates: Requirements 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2_

## Rendering contract

`renderPage(UiModel): string` uses the core's `html` template for all dynamic text and attributes. Nested trusted template fragments are composed without raw HTML escape hatches. The only assets are `/assets/wraith.css` and `/assets/wraith.js`, exported as strings from the UI entry and served by both runtimes. There is no UI framework, build step, inline script or third-party request.

`UiModel` contains page, app metadata, actions, optional selected action/event/record, source events for readable queue context, audit entries, provider disclosure, authentication/CSRF state and feedback. `confirmation` supplies evidence quote, reason, candidate values, current recorded value and whether the registered record parser allows editing. The renderer does not infer editing permission from a record type name. Output links are restricted to same-origin absolute paths. Action IDs are encoded as path segments.

Every decision is a normal POST form to `/actions/:id/decision`. The submitter carries `decision=approve|reject|retry|edit|pick`; editable text uses `value`, rejection uses `reason`, and a candidate uses its numeric position. A hidden `csrf` is included in every POST, including login, logout and demo loading. Forms remain operational without the enhancement script. Unauthenticated details offer sign-in, terminal/stale actions offer no approval, and invalid edits retain escaped input and identify the error beside the field.

_Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

## Evidence and the decision boundary

The detail page shows exact preview, source event, ordered rule trace and findings, suggestion provenance, fallback reason, safety reason, unconfirmed-AI warning, attempt count and last error. A successful result is displayed separately from the original preview. A superseded action links to its replacement. A patch download is shown only for a succeeded action when the runtime supplies an allowed path.

The runtime supplies a truthful `effectNotice` for a real external executor or `dryRun` for an executor that only records its intended effect. The notice appears before the Approve control in reading and focus order. The single-key approval shortcut also repeats it using a browser confirmation. The UI never infers real side effects from a display label. It cannot change safety or execute an action directly.

Audit verification must be performed by the runtime against the same snapshot rendered on the page. Missing verification renders "Chain not checked". Failed verification shows the reported sequence and reason. Success still explains that possession of the audit key allows rewriting, and that a valid audit does not prove an external effect succeeded. The runtime may cache a result only with the exact snapshot head it verified.

_Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.1, 6.2, 6.3, 6.4, 15.1, 15.2, 15.3, 15.4_

## Runtime security integration

The runtime checks session and CSRF before reading a decision form into the core. Sessions use HttpOnly and SameSite=Strict cookies, with Secure when served over HTTPS. Core version checks remain authoritative if a page becomes stale. The runtime exchanges a local one-time login token once, then redirects to a clean URL; hosted access codes and admin tokens are never copied into navigation links. Login is a normal token/CSRF POST. The UI requires an anonymous CSRF token on that form as well.

Local private data is session-only; the landing and login pages are public. Hosted read-only visibility is permitted for explicit demo configuration only, avoiding accidental exposure of configured real repositories or notices. Admin-only provider configuration is kept in server configuration; a demo session cannot alter it. Session lifetime, login-rate limits, signed cookie handling and public-demo mode enforcement belong to the runtime design and its HTTP tests, not to renderer assertions.

_Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 13.1, 13.2, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

## Keyboard, responsive layout and motion

The layout changes from a 238 px sidebar and main column to a wrapping top navigation at 760 px. Details collapse to a single column before controls become cramped. Long sources, hashes and JSON wrap rather than forcing horizontal page scrolling. There is one h1 per page, a skip link, explicit form labels and visible focus outlines. Feedback uses role=status or role=alert.

Single-key shortcuts start off, can be enabled in Settings, and are saved in localStorage when available. They ignore typing controls, contenteditable, modifiers, composition and already-handled events. `j`/`k` move focus through proposal links. `a` uses `requestSubmit` with the actual named button, preserving native validation and the decision field; `r` opens rejection and focuses its textarea. Submission marks the form busy but does not disable the named submitter, because that would omit its value.

The motion-design skill and its context-adaptation guidance informed only short hover/press feedback (100-120 ms). Continuous decorative motion is omitted for the approval task. Reduced-motion removes all transitions, animation and smooth scrolling. Browser verification must measure contrast and run axe on actual pages; these CSS and renderer tests do not establish that outcome alone.

_Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3_

## Validation and primary references

Renderer regression tests exercise hostile text, escaped edit retention, numeric candidate submission, terminal and unauthenticated states, effect notice order, same-origin links, actual counts, audit honesty and provider failures. Script behavior is exercised in Node's VM with DOM stubs for opt-in, text-field suppression, confirmation cancellation and named-submit-button preservation. The parent integration performs desktop/mobile browser, keyboard, reduced-motion, no-JavaScript and axe checks against both app journeys. Those checks must be reported from actual results before being called complete.

API references checked 17 Nov 2026: [HTML forms](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form), [requestSubmit](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/requestSubmit), [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). These establish native form submission/validation and the media-query mechanism; they do not establish this implementation's accessibility conformance.
