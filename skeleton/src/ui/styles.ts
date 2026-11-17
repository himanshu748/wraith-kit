// WRAITH-SKELETON
export const stylesheet = String.raw`
:root {
  color-scheme:dark;
  --bg:#111411;
  --surface:#181d18;
  --raised:#202620;
  --line:#343e34;
  --ink:#edf0e6;
  --muted:#aab5a7;
  --dim:#879783;
  --accent:#b8e28b;
  --accent-soft:#26341f;
  --danger:#ffaaa3;
  --font:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --serif:Georgia,"Times New Roman",serif;
  --mono:ui-monospace,SFMono-Regular,Consolas,monospace;
}
:root[data-accent=amber] {
  --accent:#edc184;
  --accent-soft:#352c1e;
}
* {
  box-sizing:border-box;
}
html {
  scroll-behavior:smooth;
  scroll-padding-top:24px;
}
body {
  margin:0;
  background:var(--bg);
  color:var(--ink);
  font-family:var(--font);
  font-size:15px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
}
a {
  color:inherit;
  text-decoration:none;
}
button,input,select,textarea {
  font:inherit;
}
button,a,input,textarea,select,summary {
  -webkit-tap-highlight-color:transparent;
}
button {
  cursor:pointer;
}
button:disabled {
  cursor:wait;
  opacity:.7;
}
button,input,select,textarea {
  max-width:100%;
}
button {
  border:0;
}
button,a {
  touch-action:manipulation;
}
a:hover {
  color:var(--accent);
}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible,[tabindex]:focus-visible {
  outline:2px solid var(--accent);
  outline-offset:5px;
}
::selection {
  background:var(--accent);
  color:var(--bg);
}
h1,h2,h3,p {
  margin-top:0;
}
h1,h2,h3 {
  font-weight:500;
  line-height:1.14;
}
h1 {
  font-size:clamp(40px,4.5vw,64px);
  letter-spacing:-2.3px;
  margin-bottom:20px;
}
h2 {
  font-size:24px;
  letter-spacing:-.6px;
}
h3 {
  font-size:17px;
}
p {
  color:var(--muted);
}
strong {
  font-weight:600;
  color:var(--ink);
}
pre,code,.mono {
  font-family:var(--mono);
}
pre {
  white-space:pre-wrap;
  overflow-wrap:anywhere;
  font-size:13px;
  line-height:1.8;
  max-width:100%;
  margin:0;
}
code {
  font-size:12px;
  overflow-wrap:anywhere;
}
svg {
  display:block;
  flex-shrink:0;
}
.icon {
  width:20px;
  height:20px;
}
.ghost-mark {
  width:44px;
  height:44px;
}
.brand {
  display:inline-flex;
  align-items:center;
  gap:10px;
  letter-spacing:-1px;
  font-size:25px;
  font-weight:600;
  line-height:1.2;
  color:var(--ink);
}
.brand:hover {
  color:var(--ink);
}
.brand .ghost-mark {
  color:var(--accent);
}
.brand-light {
  font-weight:350;
}
.brand small {
  font-size:9px;
  font-weight:400;
  letter-spacing:.3px;
  display:block;
  margin-top:6px;
  color:var(--muted);
}
.small-brand {
  font-size:18px;
}
.small-brand .ghost-mark {
  width:32px;
  height:32px;
}
.button {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  border:1px solid transparent;
  border-radius:5px;
  min-height:46px;
  padding:11px 18px;
  font-weight:600;
  font-size:13px;
  line-height:1.4;
  transition:background-color 100ms ease,color 100ms ease,transform 120ms cubic-bezier(.2,0,0,1);
  text-align:center;
}
.button:active {
  transform:translateY(1px);
}
.button-primary {
  background:var(--accent);
  color:#192015;
}
.button-primary:hover {
  background:#d1edb2;
  color:#111a0e;
}
.button-secondary {
  border-color:#4c5848;
  background:transparent;
  color:var(--ink);
}
.button-secondary:hover {
  border-color:var(--accent);
  background:var(--accent-soft);
  color:var(--accent);
}
.button-danger {
  background:#3f2826;
  border-color:#704743;
  color:#ffcbc6;
}
.button-danger:hover {
  background:#55302c;
}
.text-button {
  color:var(--muted);
  background:none;
  padding:8px 0;
  font-size:12px;
  text-decoration:underline;
  text-underline-offset:4px;
}
.text-button:hover {
  color:var(--ink);
}
.quiet-link {
  font-size:12px;
  color:var(--muted);
  display:inline-flex;
  align-items:center;
  gap:10px;
}
.quiet-link .icon {
  width:15px;
  height:15px;
}
.text-link {
  display:inline-flex;
  gap:9px;
  align-items:center;
  color:var(--accent);
  font-size:13px;
}
.text-link .icon {
  width:16px;
}
.inline-form {
  display:inline-flex;
  margin:0;
}
.eyebrow,.section-label,.nav-label {
  font-size:10px;
  letter-spacing:1.5px;
  text-transform:uppercase;
  font-weight:600;
  color:var(--muted);
}
.eyebrow {
  display:flex;
  align-items:center;
  gap:9px;
  margin:0 0 20px;
}
.label-dot {
  display:inline-block;
  width:6px;
  height:6px;
  border-radius:50%;
  background:var(--accent);
  flex-shrink:0;
}
.heading-period {
  color:var(--accent);
}
.badge {
  display:inline-flex;
  align-items:center;
  gap:7px;
  white-space:nowrap;
  font-size:10px;
  line-height:1.4;
  border-radius:4px;
  padding:5px 8px;
  border:1px solid var(--line);
  letter-spacing:.15px;
  font-weight:500;
}
.demo-badge {
  border-color:#5c654f;
  color:#d1d8bc;
  background:#242a20;
  font-size:9px;
  text-transform:uppercase;
  letter-spacing:.6px;
}
.subtle {
  color:var(--muted);
  background:#1c221c;
}
.status-badge {
  color:var(--muted);
  background:#1d231c;
  border-color:transparent;
}
.status-dot {
  width:5px;
  height:5px;
  border-radius:100%;
  background:currentColor;
}
.status-badge[data-status=proposed] {
  background:#302e1f;
  color:#e7d399;
}
.status-badge[data-status=succeeded],.status-badge[data-status=auto-approved] {
  background:#233322;
  color:#b8dcae;
}
.status-badge[data-status=dead] {
  background:#3a2523;
  color:#ffb2aa;
}
.status-badge[data-status=executing],.status-badge[data-status=approved] {
  background:#263238;
  color:#bed7e0;
}
.screen-reader-only {
  position:absolute;
  width:1px;
  height:1px;
  margin:-1px;
  overflow:hidden;
  clip:rect(0,0,0,0);
  white-space:nowrap;
}
.skip-link {
  position:fixed;
  left:16px;
  top:12px;
  z-index:100;
  background:var(--accent);
  color:var(--bg);
  padding:10px 16px;
  border-radius:4px;
  transform:translateY(-160%);
}
.skip-link:focus {
  transform:translateY(0);
}
.workspace {
  display:grid;
  grid-template-columns:238px minmax(0,1fr);
  min-height:100vh;
}
.sidebar {
  position:sticky;
  top:0;
  height:100vh;
  border-right:1px solid var(--line);
  background:#141914;
  padding:32px 24px;
  display:flex;
  flex-direction:column;
}
.sidebar .brand {
  font-size:24px;
  margin-left:-4px;
}
.workspace-label {
  margin:38px 0 25px;
  padding:15px 0;
  border-top:1px solid var(--line);
  border-bottom:1px solid var(--line);
  display:grid;
  grid-template-columns:8px 1fr;
  gap:4px 10px;
  align-items:center;
  font-size:12px;
  color:var(--ink);
}
.workspace-caption {
  grid-column:2;
  font-size:8px;
  letter-spacing:1.5px;
  color:var(--muted);
}
.nav-link {
  display:flex;
  align-items:center;
  gap:11px;
  min-height:45px;
  border-radius:5px;
  padding:10px 12px;
  margin:4px -10px;
  color:var(--muted);
  font-size:13px;
}
.nav-link .icon {
  width:17px;
  height:17px;
}
.nav-link:hover {
  background:#1b231a;
}
.nav-link.active {
  background:var(--accent-soft);
  color:var(--accent);
}
.nav-count {
  margin-left:auto;
  border:1px solid #566445;
  min-width:21px;
  padding:0 4px;
  text-align:center;
  border-radius:4px;
  font-size:10px;
}
.nav-label {
  margin:31px 2px 11px;
  font-size:9px;
  letter-spacing:1.4px;
}
.sidebar-bottom {
  margin-top:auto;
  padding-top:28px;
}
.provider-summary {
  display:flex;
  align-items:center;
  gap:10px;
  font-size:11px;
  border-bottom:1px solid var(--line);
  padding-bottom:20px;
  margin-bottom:18px;
}
.provider-summary small {
  display:block;
  font-size:10px;
  color:var(--muted);
  margin-top:3px;
}
.provider-summary .label-dot {
  background:#91ac7a;
}
.workspace-body {
  display:flex;
  flex-direction:column;
  min-width:0;
}
.topbar {
  min-height:76px;
  border-bottom:1px solid var(--line);
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 48px;
  gap:20px;
}
.topbar>p {
  font-size:11px;
  margin:0;
  color:var(--ink);
}
.topbar-muted {
  color:var(--muted);
  margin-right:8px;
}
.topbar-actions {
  display:flex;
  align-items:center;
  gap:20px;
}
.mode-indicator {
  font-size:10px;
  color:var(--muted);
  border:1px solid var(--line);
  padding:4px 8px;
  border-radius:4px;
}
.main-content {
  padding:30px 48px 70px;
  width:100%;
  max-width:1450px;
  margin:0 auto;
  flex:1;
}
.demo-banner {
  font-size:11px;
  padding:11px 0;
  display:flex;
  align-items:center;
  gap:9px;
  color:var(--muted);
  border-bottom:1px dashed #3c4636;
  margin-bottom:35px;
}
.demo-banner .label-dot {
  background:#d4c48d;
}
.page-heading {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:28px;
  margin:20px 0 30px;
}
.page-heading>div {
  min-width:0;
}
.page-heading p:not(.eyebrow) {
  font-size:14px;
  margin:0;
  max-width:640px;
}
.page-heading h1 {
  margin-bottom:14px;
}
.queue-summary {
  display:flex;
  align-items:center;
  gap:40px;
  border-top:1px solid var(--line);
  border-bottom:1px solid var(--line);
  padding:25px 0 28px;
  margin:34px 0 31px;
}
.queue-summary>div {
  display:flex;
  align-items:center;
  gap:18px;
  flex-shrink:0;
}
.summary-number {
  font-family:var(--serif);
  font-size:57px;
  line-height:1;
  color:var(--accent);
}
.queue-summary>div>span:last-child {
  font-size:11px;
  line-height:1.6;
  max-width:96px;
}
.queue-summary p {
  margin:0;
  font-size:12px;
  line-height:1.7;
}
.queue-summary>.icon {
  margin-left:auto;
  width:28px;
  height:28px;
  color:var(--dim);
}
.filter-tabs {
  display:flex;
  gap:25px;
  border-bottom:1px solid var(--line);
  margin-bottom:29px;
}
.filter-tabs a {
  display:flex;
  align-items:center;
  gap:9px;
  font-size:12px;
  color:var(--muted);
  padding:0 1px 15px;
  border-bottom:2px solid transparent;
  margin-bottom:-1px;
}
.filter-tabs a.selected {
  color:var(--ink);
  border-bottom-color:var(--accent);
}
.filter-tabs a>span {
  border-radius:4px;
  font-size:10px;
  min-width:19px;
  text-align:center;
  background:#252d23;
  padding:1px 4px;
  color:#b8c5ad;
}
.group-heading {
  display:flex;
  align-items:center;
  gap:10px;
  margin:0 0 12px;
}
.group-heading h2 {
  font-size:11px;
  font-weight:500;
  letter-spacing:0;
  margin:0;
}
.group-heading>span:last-child {
  margin-left:auto;
  font-size:10px;
  color:var(--muted);
}
.action-groups>section+section {
  margin-top:28px;
}
.action-list {
  border:1px solid var(--line);
  border-radius:7px;
  overflow:hidden;
  background:var(--surface);
}
.action-row {
  position:relative;
  display:grid;
  grid-template-columns:36px minmax(0,1fr) auto 22px;
  align-items:center;
  gap:17px;
  padding:23px 21px;
  border-bottom:1px solid var(--line);
  transition:background-color 100ms ease;
}
.action-row:last-child {
  border-bottom:0;
}
.action-row:hover,.action-row:focus-within {
  background:#20281e;
}
.row-symbol {
  width:34px;
  height:39px;
  background:#242e20;
  color:var(--accent);
  border:1px solid #3b4b31;
  border-radius:5px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.row-symbol>span {
  font-family:var(--serif);
  font-size:24px;
}
.row-symbol .icon {
  width:17px;
  height:17px;
}
.row-main {
  min-width:0;
}
.row-meta {
  display:flex;
  gap:10px;
  align-items:center;
  color:var(--muted);
  font-size:10px;
  margin-bottom:8px;
}
.row-main h3 {
  font-size:14px;
  line-height:1.5;
  letter-spacing:0;
  margin:0 0 5px;
  overflow-wrap:anywhere;
}
.row-target {
  font-family:var(--mono);
  font-size:11px;
  margin:0;
  white-space:nowrap;
  text-overflow:ellipsis;
  overflow:hidden;
  color:var(--muted);
}
.row-end {
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:10px;
}
.row-time {
  font-size:9px;
  color:var(--muted);
}
.row-open {
  display:flex;
  align-items:center;
  justify-content:center;
  min-width:24px;
  min-height:44px;
  color:var(--muted);
}
.row-open .icon {
  width:17px;
  height:17px;
}
.queue-footnote {
  display:flex;
  align-items:flex-start;
  gap:9px;
  margin-top:24px;
  color:var(--muted);
}
.queue-footnote .icon {
  width:15px;
  height:15px;
  margin-top:2px;
  color:var(--dim);
}
.queue-footnote p {
  font-size:10px;
  margin:0;
}
.queue-footnote>a {
  margin-left:auto;
  font-size:10px;
  white-space:nowrap;
  text-decoration:underline;
  text-underline-offset:3px;
}
.workspace-footer {
  display:flex;
  justify-content:space-between;
  gap:15px;
  border-top:1px solid var(--line);
  padding:20px 48px;
  font-size:9px;
  color:var(--dim);
}
.workspace-footer span span {
  margin:0 10px;
}
.empty-state {
  text-align:center;
  border:1px dashed #414d39;
  border-radius:7px;
  padding:55px 25px;
  margin:20px 0;
}
.empty-ghost {
  margin:0 auto 25px;
  display:flex;
  align-items:center;
  justify-content:center;
  width:76px;
  height:76px;
  border:1px solid #3d4a33;
  border-radius:50%;
  background:#1c2519;
  color:var(--accent);
}
.empty-ghost .ghost-mark {
  width:43px;
  height:43px;
}
.empty-ghost .icon {
  width:29px;
  height:29px;
}
.empty-state .eyebrow {
  justify-content:center;
}
.empty-state h2 {
  font-family:var(--serif);
  font-size:30px;
}
.empty-state p {
  font-size:13px;
  max-width:450px;
  margin:0 auto 25px;
}
.empty-state .button {
  margin-top:3px;
}
.feedback {
  padding:15px 18px;
  border-radius:5px;
  margin:0 0 22px;
  font-size:12px;
  display:flex;
  align-items:center;
  gap:10px;
}
.feedback.success {
  border:1px solid #45623b;
  background:#23331f;
  color:#cfebbf;
}
.feedback.error {
  border:1px solid #785049;
  background:#37231f;
  color:#ffbdb2;
  flex-wrap:wrap;
}
.feedback.error>span:last-child {
  font-size:11px;
}
.back-link {
  display:inline-flex;
  align-items:center;
  gap:9px;
  color:var(--muted);
  font-size:11px;
  margin:5px 0 8px;
}
.detail-heading {
  align-items:flex-end;
}
.detail-heading h1 {
  font-size:clamp(32px,3.4vw,47px);
  letter-spacing:-1.7px;
}
.detail-heading>div>p {
  overflow-wrap:anywhere;
  font-family:var(--mono);
  font-size:11px;
}
.detail-heading .eyebrow {
  margin-bottom:17px;
}
.detail-layout {
  display:grid;
  grid-template-columns:minmax(0,1fr) 305px;
  gap:25px;
  align-items:start;
}
.detail-main {
  min-width:0;
}
.panel {
  padding:25px;
  border:1px solid var(--line);
  background:var(--surface);
  border-radius:6px;
  margin-bottom:22px;
  min-width:0;
}
.panel-top {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  margin-bottom:22px;
}
.panel-top h2 {
  font-size:17px;
  margin:0;
  letter-spacing:-.2px;
}
.panel-top .icon {
  color:var(--accent);
}
.panel p {
  font-size:12px;
}
.action-preview {
  border-left:2px solid var(--accent);
  background:#111710;
  padding:20px;
  color:#e0e8d7;
}
.preview-panel>.button {
  margin-top:20px;
}
.source-quote {
  margin-top:26px;
}
.source-quote blockquote {
  border-left:2px solid #56604d;
  padding-left:16px;
  margin:12px 0 0;
  font-family:var(--serif);
  font-size:19px;
  line-height:1.6;
  color:#d8decd;
}
.reason-line {
  margin:18px 0 0;
  color:var(--accent);
}
.current-value {
  margin-top:23px;
  padding-top:20px;
  border-top:1px solid var(--line);
}
.record-value {
  margin:14px 0 0;
}
.record-value>div {
  display:grid;
  grid-template-columns:minmax(70px,.7fr) minmax(0,1.5fr);
  gap:16px;
  padding:7px 0;
}
.record-value dt {
  color:var(--muted);
  font-size:12px;
}
.record-value dd,.record-plain {
  margin:0;
  color:var(--accent);
  font-size:13px;
  overflow-wrap:anywhere;
}
.candidate-options {
  border:0;
  margin:0;
  padding:0;
  min-width:0;
}
.candidate-options legend {
  font-size:12px;
  margin-bottom:12px;
}
.candidate-option {
  display:flex;
  align-items:flex-start;
  gap:10px;
  padding:12px;
  border:1px solid #5a6850;
  border-radius:4px;
  background:#10170e;
  cursor:pointer;
  line-height:1.65;
}
.candidate-option span {
  overflow-wrap:anywhere;
  min-width:0;
}
.candidate-option input {
  padding:0;
  border:0;
  background:transparent;
  width:15px;
  height:15px;
  margin:3px 0 0;
  flex-shrink:0;
  accent-color:var(--accent);
}
.advice-note {
  padding:12px 15px;
  background:#222c1e;
  border-left:2px solid #6a8551;
}
.rule-trace {
  list-style:none;
  padding:0;
  margin:0;
}
.rule-trace>li {
  display:flex;
  gap:16px;
  padding:19px 0;
  border-bottom:1px solid var(--line);
}
.rule-trace>li:first-child {
  padding-top:0;
}
.rule-trace>li:last-child {
  padding-bottom:0;
  border:0;
}
.trace-index {
  font-family:var(--mono);
  color:var(--accent);
  font-size:10px;
  padding-top:3px;
}
.rule-trace h3 {
  font-size:12px;
  margin:0 0 7px;
  line-height:1.5;
}
.rule-trace p {
  margin:0 0 8px;
  font-size:12px;
}
.rule-trace code {
  display:inline-block;
  background:#10170e;
  border:1px solid #34452b;
  padding:5px 8px;
  color:#c9d6bd;
}
.rule-trace .badge {
  margin-top:9px;
}
.metadata {
  margin:0;
}
.metadata>div {
  display:grid;
  grid-template-columns:88px minmax(0,1fr);
  gap:14px;
  margin:12px 0;
  font-size:11px;
  line-height:1.6;
}
.metadata dt {
  color:var(--muted);
}
.metadata dd {
  margin:0;
  overflow-wrap:anywhere;
}
.source-panel details {
  margin-top:20px;
}
.source-panel details pre {
  padding:15px;
  margin-top:12px;
  background:#111710;
}
.decision-panel {
  padding:24px;
  background:#20291c;
  border:1px solid #4d6040;
  border-radius:6px;
}
.decision-panel h2 {
  font-family:var(--serif);
  font-size:25px;
  line-height:1.25;
  margin:13px 0;
}
.decision-panel p {
  font-size:12px;
  margin-bottom:20px;
  line-height:1.7;
}
.decision-panel .section-label {
  color:#b7c8a7;
}
.approve-form .button {
  width:100%;
}
.decision-panel .effect-notice {
  background:#342c1b;
  border:1px solid #6e5b34;
  border-radius:4px;
  color:#e6d7ae;
  padding:13px;
  font-size:11px;
  margin:20px 0;
}
.effect-notice strong {
  color:#f0dca6;
}
.effect-notice p {
  margin:7px 0 0;
  color:#e6d7ae;
  font-size:11px;
}
.alternative-form {
  margin:21px 0 0;
  padding:20px 0 0;
  border-top:1px solid #445139;
}
.alternative-form .button {
  margin-top:13px;
  font-size:11px;
  width:100%;
}
label {
  display:block;
  font-size:12px;
  margin:0 0 9px;
  color:var(--ink);
}
input,select,textarea {
  display:block;
  width:100%;
  background:#10170e;
  border:1px solid #5a6850;
  border-radius:4px;
  color:var(--ink);
  padding:11px 12px;
  line-height:1.5;
  font-size:12px;
}
textarea {
  resize:vertical;
  min-height:90px;
}
input::placeholder,textarea::placeholder {
  color:#95a28c;
}
input[aria-invalid=true] {
  border-color:var(--danger);
}
.field-error {
  color:var(--danger);
  font-size:11px;
  margin:8px 0 0;
}
.field-hint {
  font-size:10px!important;
  color:#b3c0a8;
  margin:8px 0 0;
}
.reject-details {
  border-top:1px solid #445139;
  padding-top:18px;
  margin-top:20px;
}
.reject-details summary {
  font-size:11px;
  color:#d9c9b4;
  cursor:pointer;
}
.reject-details form {
  margin-top:18px;
}
.reject-details button {
  margin-top:13px;
  width:100%;
}
.execution-info {
  padding:26px 4px;
}
.execution-info h2 {
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:var(--muted);
}
.execution-info .metadata>div {
  grid-template-columns:80px 1fr;
  font-size:10px;
}
.execution-info .text-link {
  font-size:11px;
  margin-top:15px;
}
.resolved {
  display:flex;
  gap:15px;
  align-items:flex-start;
}
.resolved>.icon {
  margin-top:16px;
  color:var(--accent);
}
.resolved h2 {
  font-size:23px;
}
.resolved p {
  margin-bottom:0;
}
.resolved .text-link {
  margin-top:12px;
}
.verification {
  border:1px solid var(--line);
  border-radius:6px;
  background:var(--surface);
  padding:24px 27px;
  margin:32px 0;
}
.verification>div {
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:16px;
}
.verification h2 {
  font-size:16px;
  margin:0;
}
.verification>div>.badge {
  margin-left:auto;
}
.verification .icon {
  color:var(--accent);
}
.verification p {
  font-size:12px;
  margin:9px 0 0;
}
.verification .fine-print {
  font-size:10px;
  max-width:780px;
}
.unverified {
  border-color:#785943;
}
.unverified .icon {
  color:var(--danger);
}
.audit-list-heading,.audit-row {
  display:grid;
  grid-template-columns:155px minmax(0,1fr) 180px;
  gap:20px;
  padding:18px 10px;
  border-bottom:1px solid var(--line);
  align-items:start;
}
.audit-list-heading {
  font-size:9px;
  letter-spacing:1.4px;
  color:var(--muted);
  padding-top:0;
}
.audit-seq>span {
  display:block;
  font-family:var(--mono);
  font-size:11px;
  color:var(--accent);
  margin-bottom:8px;
}
.audit-seq time {
  font-size:9px;
  color:var(--muted);
}
.audit-row h3 {
  font-size:13px;
  margin:0 0 9px;
  line-height:1.5;
}
.audit-row p {
  margin:0;
  font-size:9px;
  overflow-wrap:anywhere;
}
.audit-row summary,details>summary {
  font-size:11px;
  cursor:pointer;
  color:var(--muted);
}
.audit-row details pre {
  margin-top:14px;
  font-size:10px;
}
.audit-row dl {
  font-size:9px;
  color:var(--muted);
}
.audit-row dd {
  margin:5px 0 12px;
}
.hash {
  overflow-wrap:anywhere;
  font-family:var(--mono);
}
.settings-layout {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:22px;
  margin-top:37px;
}
.settings-layout .panel {
  margin:0;
}
.full-width {
  grid-column:1/-1;
}
.settings-list {
  margin:0;
}
.settings-list>div {
  display:flex;
  justify-content:space-between;
  gap:18px;
  border-bottom:1px solid var(--line);
  padding:14px 0;
  font-size:11px;
}
.settings-list dt {
  color:var(--muted);
}
.settings-list dd {
  margin:0;
  text-align:right;
  overflow-wrap:anywhere;
}
.privacy-note {
  border-left:2px solid var(--accent);
  padding-left:15px;
  margin:25px 0;
}
.privacy-note h3 {
  font-size:12px;
  margin-bottom:9px;
}
.privacy-note p {
  margin:0;
  font-size:12px;
}
.fine-print {
  font-size:10px!important;
  line-height:1.8;
  color:var(--muted);
}
.shortcut-toggle {
  display:flex;
  align-items:center;
  gap:11px;
  margin:24px 0 10px;
  padding:16px;
  background:#111710;
  border-radius:4px;
  border:1px solid #3e4a36;
}
.shortcut-toggle input {
  width:17px;
  height:17px;
  accent-color:var(--accent);
  margin:0;
  padding:0;
}
.shortcut-toggle>span {
  font-size:12px;
}
.shortcut-list {
  margin:23px 0 0;
}
.shortcut-list>div {
  display:flex;
  align-items:center;
  gap:20px;
  margin-top:16px;
  font-size:11px;
}
.shortcut-list dt {
  min-width:68px;
}
.shortcut-list dd {
  margin:0;
  color:var(--muted);
}
kbd {
  font-family:var(--mono);
  display:inline-block;
  min-width:23px;
  text-align:center;
  border:1px solid #536049;
  border-bottom-width:2px;
  border-radius:4px;
  padding:2px 6px;
  background:#1e281a;
  font-size:11px;
}
.login-wrap {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:50px;
  align-items:center;
  min-height:65vh;
}
.login-intro h1 {
  font-size:56px;
}
.login-intro p:not(.eyebrow) {
  max-width:300px;
  font-size:15px;
}
.login-panel {
  border:1px solid var(--line);
  border-radius:7px;
  background:var(--surface);
  padding:35px;
  max-width:440px;
}
.login-panel h2 {
  font-family:var(--serif);
  font-size:28px;
}
.login-panel p {
  font-size:12px;
}
.login-panel .button {
  margin-top:20px;
  width:100%;
}
.login-panel .fine-print {
  margin:18px 0 0;
}
.login-mark {
  color:var(--accent);
  margin-bottom:22px;
}
.login-mark .ghost-mark {
  width:45px;
  height:45px;
}
.error-page h1 {
  font-size:38px;
  letter-spacing:-1px;
}
.landing {
  max-width:1440px;
  margin:auto;
  padding:0 70px;
}
.landing-header {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:25px;
  padding:32px 0;
  border-bottom:1px solid var(--line);
}
.landing-header nav {
  display:flex;
  align-items:center;
  gap:35px;
  font-size:12px;
}
.landing-header nav>a:first-child {
  color:var(--muted);
}
.landing-header .button {
  font-size:12px;
  min-height:42px;
}
.hero {
  min-height:620px;
  display:grid;
  grid-template-columns:1.2fr 1fr;
  align-items:center;
  padding:62px 0 78px;
  gap:10px;
  border-bottom:1px solid var(--line);
}
.hero h1 {
  font-size:clamp(48px,5.2vw,76px);
  font-weight:450;
  line-height:1.08;
  letter-spacing:-3.5px;
  margin:28px 0;
}
.hero h1 em,.section-intro h2 em {
  font-family:var(--serif);
  font-weight:400;
  color:var(--accent);
  letter-spacing:-3px;
}
.hero-description {
  max-width:410px;
  font-size:16px;
  line-height:1.8;
}
.hero-actions {
  display:flex;
  align-items:center;
  gap:25px;
  margin-top:31px;
}
.hero-actions .text-link {
  font-size:11px;
  color:var(--muted);
}
.hero-note {
  font-size:10px;
  margin:22px 0 0;
}
.hero-art {
  position:relative;
  min-height:390px;
  display:flex;
  align-items:center;
  justify-content:center;
  isolation:isolate;
}
.ghost-large {
  color:var(--accent);
  opacity:.8;
  transform:rotate(-8deg);
}
.ghost-large .ghost-mark {
  width:205px;
  height:205px;
  stroke-width:1px;
}
.orbit {
  position:absolute;
  border:1px solid #3c4934;
  border-radius:50%;
  width:330px;
  height:330px;
  z-index:-1;
}
.orbit-one {
  transform:rotate(-25deg) scaleX(.85);
}
.orbit-two {
  width:385px;
  height:220px;
  transform:rotate(35deg);
  border-style:dashed;
  border-color:#35422d;
}
.signal-note {
  position:absolute;
  display:flex;
  align-items:center;
  gap:9px;
  font-size:11px;
  background:#1d251a;
  border:1px solid #4b5e3b;
  border-radius:5px;
  padding:15px 17px;
  box-shadow:0 12px 36px #090c0940;
}
.signal-note small {
  position:absolute;
  top:-21px;
  left:0;
  font-family:var(--mono);
  font-size:8px;
  letter-spacing:1.4px;
  color:var(--muted);
  white-space:nowrap;
}
.note-in {
  left:0;
  top:55px;
  transform:rotate(-4deg);
}
.note-out {
  right:0;
  bottom:65px;
  transform:rotate(3deg);
}
.note-out .icon {
  color:var(--accent);
  width:17px;
  height:17px;
}
.note-out small {
  top:auto;
  bottom:-22px;
  left:auto;
  right:0;
}
.art-caption {
  position:absolute;
  bottom:0;
  font-family:var(--mono);
  font-size:8px;
  letter-spacing:2px;
  color:var(--dim);
  text-align:center;
}
.mechanism {
  padding:76px 0 68px;
  display:grid;
  grid-template-columns:.85fr 1.3fr;
  gap:70px;
  border-bottom:1px solid var(--line);
}
.section-intro h2 {
  font-size:37px;
  line-height:1.2;
  font-weight:400;
  letter-spacing:-1.4px;
}
.section-intro h2 em {
  letter-spacing:-1.2px;
}
.section-intro p:not(.eyebrow) {
  font-size:13px;
  max-width:300px;
}
.pipeline {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:30px 35px;
  margin:0;
  padding:0;
  list-style:none;
}
.pipeline li {
  border-top:1px solid var(--line);
  padding-top:17px;
}
.step-index {
  font-family:var(--mono);
  color:var(--accent);
  font-size:10px;
  display:block;
  margin-bottom:16px;
}
.pipeline h3 {
  font-size:19px;
  margin-bottom:10px;
}
.pipeline p {
  font-size:12px;
  line-height:1.8;
  margin:0;
}
.app-feature {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:50px;
  padding:62px 0;
  border-bottom:1px solid var(--line);
}
.app-feature .eyebrow {
  margin-bottom:14px;
}
.app-feature h2 {
  font-size:32px;
  letter-spacing:-1px;
  margin-bottom:12px;
}
.app-feature p {
  font-size:13px;
  max-width:540px;
  margin:0;
}
.app-feature>div:last-child {
  flex-shrink:0;
}
.app-feature .fine-print {
  margin-top:12px;
}
.landing-footer {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:25px;
  padding:28px 0;
  font-size:9px;
  color:var(--muted);
}
.landing-footer p {
  font-family:var(--serif);
  font-size:14px;
  font-style:italic;
  margin:0;
}
/* App-authored, escaped output documents share the workspace typography. */
.digest-document main {
  width:min(100%,980px);
  margin:0 auto;
  padding:clamp(24px,5vw,64px);
}
.digest-document header {
  width:min(100%,980px);
  margin:0 auto;
  padding:28px clamp(24px,5vw,64px);
  border-bottom:1px solid var(--line);
  display:flex;
  flex-wrap:wrap;
  justify-content:space-between;
  align-items:center;
  gap:18px 24px;
  font-size:13px;
}
.digest-document header nav {
  margin:0;
}
.digest-document nav {
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:14px 24px;
  margin-bottom:44px;
  font-size:13px;
}
.digest-document h1 {
  font-size:clamp(36px,5vw,60px);
  line-height:1.08;
  letter-spacing:-.045em;
  margin:0 0 20px;
}
.digest-document h2 {
  font-size:22px;
  line-height:1.3;
  margin:42px 0 0;
  padding-bottom:14px;
  border-bottom:1px solid var(--line);
}
.digest-document h3 {
  font-size:18px;
  line-height:1.4;
  margin:12px 0;
}
.digest-document p,.digest-document li {
  color:var(--muted);
  line-height:1.75;
  overflow-wrap:anywhere;
}
.digest-document a {
  color:var(--accent);
  text-underline-offset:4px;
  text-decoration-thickness:1px;
}
.digest-document a:hover {
  text-decoration:underline;
}
.digest-document article {
  padding:24px 0 28px;
  border-bottom:1px solid var(--line);
}
.digest-document article>p:first-child,.digest-document .digest-meta {
  color:var(--accent);
  font-family:var(--mono);
  font-size:12px;
  line-height:1.8;
  margin-top:0;
}
.digest-document blockquote {
  margin:20px 0;
  padding:4px 0 4px 18px;
  border-left:2px solid var(--accent);
  color:var(--muted);
  line-height:1.75;
  overflow-wrap:anywhere;
}
.digest-document table {
  width:100%;
  border-collapse:collapse;
  text-align:left;
  font-size:14px;
}
.digest-document th,.digest-document td {
  padding:14px 12px;
  border-bottom:1px solid var(--line);
  vertical-align:top;
  overflow-wrap:anywhere;
}
.digest-document footer {
  margin-top:44px;
  padding-top:20px;
  color:var(--muted);
  font-size:12px;
  border-top:1px solid var(--line);
}

@media(min-width:1500px) {
  .main-content {
    padding-top:38px;
  }
  .page-heading {
    margin-top:30px;
  }
  .detail-layout {
    grid-template-columns:minmax(0,1fr) 340px;
  }
}
@media(max-width:1150px) {
  .workspace {
    grid-template-columns:208px minmax(0,1fr);
  }
  .sidebar {
    padding:27px 20px;
  }
  .main-content {
    padding-left:30px;
    padding-right:30px;
  }
  .topbar,.workspace-footer {
    padding-left:30px;
    padding-right:30px;
  }
  .detail-layout {
    grid-template-columns:minmax(0,1fr) 270px;
    gap:18px;
  }
  .panel,.decision-panel {
    padding:20px;
  }
  .row-end {
    max-width:145px;
  }
  .row-time {
    font-size:8px;
  }
  .action-row {
    gap:12px;
    padding:20px 16px;
  }
  .queue-summary {
    gap:24px;
  }
  .queue-summary p {
    font-size:11px;
  }
  .landing {
    padding:0 40px;
  }
  .hero {
    grid-template-columns:1.15fr 1fr;
  }
  .hero-art {
    transform:scale(.88);
    transform-origin:center right;
  }
  .hero h1 {
    font-size:57px;
  }
  .hero-actions {
    gap:18px;
  }
  .mechanism {
    gap:45px;
  }
  .audit-list-heading,.audit-row {
    grid-template-columns:135px minmax(0,1fr) 125px;
  }
  .login-wrap {
    gap:30px;
  }
  .login-panel {
    padding:25px;
  }
  .login-intro h1 {
    font-size:46px;
  }
}
@media(max-width:950px) {
  .detail-layout {
    grid-template-columns:1fr;
  }
  .detail-aside {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:22px;
    align-items:start;
  }
  .execution-info {
    padding:24px 10px;
  }
  .hero {
    grid-template-columns:1fr 1fr;
    min-height:560px;
  }
  .hero h1 {
    font-size:49px;
    letter-spacing:-2.5px;
  }
  .hero-description {
    font-size:14px;
  }
  .hero-actions {
    align-items:flex-start;
    flex-direction:column;
    gap:20px;
  }
  .hero-art {
    transform:scale(.74);
    min-width:330px;
    margin-left:-35px;
  }
  .queue-summary p br {
    display:none;
  }
  .queue-summary>div {
    gap:12px;
  }
  .summary-number {
    font-size:48px;
  }
  .queue-summary>.icon {
    display:none;
  }
  .action-row {
    grid-template-columns:30px minmax(0,1fr) 20px;
    gap:12px;
  }
  .row-end {
    grid-column:2;
    align-items:flex-start;
    flex-direction:row;
    max-width:none;
    gap:14px;
    align-items:center;
  }
  .row-open {
    grid-column:3;
    grid-row:1/3;
  }
  .row-symbol {
    grid-row:1/3;
    width:30px;
    height:35px;
  }
  .action-row .row-main {
    grid-column:2;
  }
  .row-meta {
    gap:7px;
  }
  .row-time {
    font-size:9px;
  }
  .settings-layout {
    grid-template-columns:1fr;
  }
  .full-width {
    grid-column:auto;
  }
  .audit-list-heading,.audit-row {
    grid-template-columns:110px minmax(0,1fr);
  }
  .audit-list-heading>span:last-child {
    display:none;
  }
  .audit-row details {
    grid-column:2;
  }
  .login-wrap {
    grid-template-columns:1fr;
    gap:25px;
    min-height:0;
    padding:20px 0;
  }
  .login-panel {
    max-width:none;
  }
  .login-intro p:not(.eyebrow) {
    max-width:450px;
  }
  .queue-footnote>a {
    display:none;
  }
}
@media(max-width:760px) {
  .workspace {
    display:block;
  }
  .sidebar {
    position:static;
    width:100%;
    height:auto;
    padding:18px 22px;
    border-right:0;
    border-bottom:1px solid var(--line);
    display:grid;
    grid-template-columns:1fr auto;
    align-items:center;
    gap:14px;
  }
  .sidebar .brand {
    font-size:22px;
    margin:0;
  }
  .sidebar .brand small {
    display:none;
  }
  .sidebar .ghost-mark {
    width:34px;
    height:34px;
  }
  .workspace-label {
    margin:0;
    border:0;
    padding:0;
    display:flex;
    font-size:10px;
    gap:7px;
  }
  .workspace-caption {
    display:none;
  }
  .sidebar nav {
    grid-column:1/-1;
    display:flex;
    align-items:center;
    gap:5px;
    flex-wrap:wrap;
    overflow-x:visible;
    padding:2px 2px 6px;
    margin-bottom:-5px;
  }
  .nav-link {
    margin:0;
    padding:9px 11px;
    white-space:nowrap;
    font-size:11px;
    min-height:38px;
  }
  .nav-link .icon {
    width:15px;
    height:15px;
  }
  .nav-count {
    font-size:9px;
    min-width:18px;
  }
  .nav-label,.sidebar-bottom {
    display:none;
  }
  .output-link {
    font-size:10px;
  }
  .topbar {
    min-height:51px;
    padding:0 22px;
    gap:12px;
  }
  .topbar>p {
    font-size:10px;
  }
  .topbar-actions {
    gap:14px;
  }
  .mode-indicator {
    font-size:8px;
  }
  .text-button {
    font-size:10px;
  }
  .main-content {
    padding:20px 22px 45px;
  }
  .demo-banner {
    font-size:10px;
    line-height:1.7;
    margin-bottom:24px;
    padding:8px 0 14px;
  }
  .page-heading {
    margin:17px 0 22px;
    gap:18px;
  }
  .page-heading h1 {
    font-size:48px;
    letter-spacing:-2px;
  }
  .page-heading p:not(.eyebrow) {
    font-size:12px;
  }
  .page-heading .eyebrow {
    font-size:9px;
    letter-spacing:1.2px;
    margin-bottom:16px;
  }
  .page-heading .button {
    font-size:11px;
    padding:10px 12px;
    min-height:42px;
  }
  .page-heading .button .icon {
    width:16px;
    height:16px;
  }
  .queue-summary {
    margin:26px 0;
    padding:22px 0;
    gap:30px;
  }
  .queue-summary p {
    font-size:11px;
    max-width:300px;
  }
  .filter-tabs {
    gap:24px;
    margin-bottom:24px;
  }
  .filter-tabs a {
    font-size:11px;
  }
  .action-row {
    padding:20px 15px;
  }
  .row-main h3 {
    font-size:14px;
  }
  .workspace-footer {
    padding:18px 22px;
    font-size:8px;
  }
  .workspace-footer>span:last-child {
    display:none;
  }
  .detail-heading {
    display:block;
  }
  .detail-heading h1 {
    font-size:36px;
    letter-spacing:-1.3px;
  }
  .detail-heading>.status-badge {
    margin-top:19px;
  }
  .detail-aside {
    grid-template-columns:1fr;
  }
  .decision-panel .approve-form .button {
    min-height:48px;
  }
  .execution-info {
    padding:14px 4px;
  }
  .execution-info .metadata>div {
    grid-template-columns:100px 1fr;
    font-size:11px;
  }
  .panel {
    padding:20px;
  }
  .panel-top h2 {
    font-size:16px;
  }
  .landing {
    padding:0 24px;
  }
  .landing-header {
    padding:22px 0;
  }
  .landing-header .brand {
    font-size:23px;
  }
  .landing-header .ghost-mark {
    width:35px;
    height:35px;
  }
  .landing-header nav {
    gap:15px;
  }
  .landing-header nav>a:first-child {
    display:none;
  }
  .landing-header .button {
    font-size:10px;
    min-height:38px;
    padding:8px 10px;
    gap:7px;
  }
  .landing-header .button .icon {
    width:15px;
    height:15px;
  }
  .hero {
    grid-template-columns:1fr;
    padding:48px 0 35px;
    gap:10px;
  }
  .hero h1 {
    font-size:clamp(43px,8vw,65px);
    letter-spacing:-2.5px;
    line-height:1.09;
    margin:24px 0;
  }
  .hero .eyebrow {
    font-size:9px;
    letter-spacing:1.2px;
  }
  .hero-description {
    font-size:15px;
    max-width:450px;
  }
  .hero-actions {
    flex-direction:row;
    align-items:center;
    gap:25px;
    margin-top:26px;
  }
  .hero-note {
    font-size:9px;
  }
  .hero-art {
    min-height:330px;
    min-width:0;
    transform:scale(.82);
    transform-origin:center center;
    max-width:430px;
    width:100%;
    margin:0 auto;
  }
  .hero-art .note-in {
    left:0;
    top:35px;
  }
  .hero-art .note-out {
    bottom:50px;
    right:0;
  }
  .art-caption {
    bottom:-10px;
  }
  .mechanism {
    grid-template-columns:1fr;
    gap:28px;
    padding:46px 0;
  }
  .section-intro h2 {
    font-size:34px;
  }
  .section-intro p:not(.eyebrow) {
    max-width:400px;
  }
  .pipeline {
    gap:25px;
  }
  .pipeline li {
    padding-top:15px;
  }
  .pipeline p {
    font-size:11px;
  }
  .step-index {
    margin-bottom:13px;
  }
  .app-feature {
    display:block;
    padding:42px 0;
  }
  .app-feature>div:last-child {
    margin-top:24px;
  }
  .app-feature h2 {
    font-size:28px;
  }
  .landing-footer {
    flex-wrap:wrap;
    padding:23px 0;
    gap:17px;
  }
  .landing-footer p {
    display:none;
  }
  .landing-footer>span {
    font-size:8px;
  }
  .settings-layout {
    margin-top:26px;
  }
  .verification {
    padding:20px;
    margin:25px 0;
  }
  .verification>div {
    flex-wrap:wrap;
  }
  .verification>div>.badge {
    margin-left:0;
  }
  .verification h2 {
    font-size:14px;
  }
  .audit-list-heading,.audit-row {
    grid-template-columns:95px minmax(0,1fr);
    gap:15px;
    padding-left:0;
    padding-right:0;
  }
  .audit-seq time {
    font-size:8px;
  }
  .audit-row h3 {
    font-size:12px;
  }
  .audit-row p {
    font-size:9px;
  }
  .login-wrap {
    padding:10px 0;
  }
  .login-intro h1 {
    font-size:48px;
  }
  .login-panel {
    padding:28px;
  }
  .error-page h1 {
    font-size:31px;
    letter-spacing:-1px;
  }
}
@media(max-width:420px) {
  .sidebar {
    padding:16px;
  }
  .main-content {
    padding-left:16px;
    padding-right:16px;
  }
  .topbar {
    padding-left:16px;
    padding-right:16px;
  }
  .topbar-muted {
    display:none;
  }
  .sidebar .brand {
    font-size:20px;
  }
  .workspace-label {
    font-size:9px;
  }
  .page-heading {
    align-items:flex-start;
    flex-direction:column;
  }
  .page-heading>div:last-child {
    align-self:flex-start;
  }
  .queue-summary {
    gap:20px;
  }
  .summary-number {
    font-size:47px;
  }
  .queue-summary>div>span:last-child {
    font-size:10px;
    max-width:74px;
  }
  .queue-summary p {
    font-size:10px;
  }
  .filter-tabs {
    gap:19px;
  }
  .filter-tabs a {
    gap:6px;
  }
  .row-main h3 {
    font-size:13px;
  }
  .row-meta {
    font-size:9px;
  }
  .row-target {
    font-size:9px;
  }
  .row-end {
    gap:9px;
    flex-wrap:wrap;
  }
  .status-badge {
    font-size:9px;
    padding:4px 6px;
  }
  .row-time {
    font-size:8px;
  }
  .hero-actions {
    align-items:flex-start;
    flex-direction:column;
    gap:20px;
  }
  .hero-art {
    transform:scale(.77);
    margin-left:-8px;
    width:calc(100% + 16px);
  }
  .hero h1 {
    font-size:43px;
  }
  .pipeline {
    gap:24px 20px;
  }
  .panel-top {
    align-items:flex-start;
    gap:10px;
  }
  .panel-top .badge {
    font-size:8px;
    white-space:normal;
  }
  .login-panel {
    padding:23px;
  }
  .demo-banner>span:last-child {
    max-width:280px;
  }
  .workspace-footer {
    padding:17px 16px;
  }
  .landing-footer .brand {
    font-size:16px;
  }
}
@media(prefers-reduced-motion:reduce) {
  *,*::before,*::after {
    animation:none!important;
    transition:none!important;
    scroll-behavior:auto!important;
  }
  .button:active {
    transform:none;
  }
}
`;
