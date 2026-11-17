import { describe, expect, it } from 'vitest';
import { Script } from 'node:vm';
import { renderPage, enhancementScript, type UiModel } from '../src/ui/index.js';
import type { Action } from '../src/core/types.js';

const action = (overrides: Partial<Action> = {}): Action => ({
  id: 'action-one', appId: 'sample-app', idempotencyKey: 'one', kind: 'confirm-record',
  target: 'sample deadline', payload: {}, preview: 'Confirm the deadline\n5 December at 17:00',
  safety: 'approval', llmSourced: false, status: 'proposed', attempts: 0, totalAttempts: 0,
  createdAt: '2026-11-17T04:30:00Z', demo: true,
  trace: [{ ruleId: 'date-ambiguity', stop: false, findings: [{ ruleId: 'date-ambiguity', severity: 'warning', message: 'Two readings are possible.', evidence: '05/12' }] }],
  ...overrides,
});
const model = (overrides: Partial<UiModel> = {}): UiModel => ({
  page: 'action', app: { id: 'sample-app', name: 'Sample Agent', accent: 'amber' },
  action: action(), authenticated: true, csrfToken: 'test-csrf', demo: true,
  ...overrides,
});

describe('approval UI trust boundaries', () => {
  // Validates: approval-ui 1.5, 3.5, 11.1.
  it('escapes app, action, findings and source data in the real renderer', () => {
    const hostile = '<script>alert("unsafe")</script><img src=x onerror=alert(1)>';
    const page = renderPage(model({
      app: { id: 'sample-app', name: hostile },
      action: action({ target: hostile, preview: hostile, trace: [{ ruleId: hostile, stop: false, findings: [{ ruleId: hostile, severity: 'warning', message: hostile }] }] }),
      confirmation: { quote: hostile, reason: hostile, currentValue: hostile },
    }));
    expect(page).not.toContain(hostile);
    expect(page).toContain('&lt;script&gt;');
    expect(page).not.toContain('<img');
    expect(page).toContain('Demo data');
  });

  // Validates: approval-ui 1.3, 12.3, 12.5, 12.6.
  it('uses external assets and a CSRF token in every POST form', () => {
    for (const pageName of ['queue', 'action', 'settings', 'audit', 'login'] as const) {
      const page = renderPage(model({ page: pageName, confirmation: { canEdit: true, candidates: ['one', 'two'] } }));
      const forms = [...page.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)];
      expect(forms.length).toBeGreaterThan(0);
      for (const form of forms) expect(form[1]).toContain('name="csrf" value="test-csrf"');
      expect(page.match(/<script\b/g)).toHaveLength(1);
      expect(page).toContain('<script src="/assets/wraith.js" defer></script>');
      expect(page).not.toMatch(/\son[a-z]+=/i);
      expect(page).not.toContain('?token=');
    }
  });

  // Validates: approval-ui 5.2, 5.3, 5.4, 4.4.
  it('submits stored candidate indexes and retains an invalid edit as escaped text', () => {
    const page = renderPage(model({
      confirmation: { candidates: ['2026-12-05', '2026-05-12', { date: '2026-12-06', instant: null, timezone: 'Asia/Kolkata' }], currentValue: { date: '2026-12-05', instant: null }, canEdit: true },
      error: 'Invalid calendar date', editValue: '"><img src=x>',
    }));
    expect(page).toContain('name="candidate" value="0" required checked');
    expect(page).toContain('<span>2026-12-05</span>');
    expect(page).toContain('name="candidate" value="1" required');
    expect(page).toContain('<span>2026-05-12</span>');
    expect(page).not.toContain('value="2026-12-05"');
    expect(page).toContain('Date: 2026-12-06 · Timezone: Asia/Kolkata');
    expect(page).toContain('<dt>Date</dt><dd>2026-12-05</dd>');
    expect(page).not.toContain('Instant:');
    expect(page).toContain('value="&quot;&gt;&lt;img src=x&gt;"');
    expect(page).toContain('aria-invalid="true" aria-describedby="edit-error"');
    expect(page).toContain('Nothing was changed.');
    expect(renderPage(model({ confirmation: { canEdit: false } }))).not.toContain('id="edited-value"');
  });

  // Validates: approval-ui 4.3, 5.8, 14.5.
  it('offers no approval form for stale or unauthenticated actions', () => {
    const superseded = renderPage(model({ action: action({ status: 'superseded', supersededBy: 'replacement' }) }));
    expect(superseded).not.toContain('value="approve"');
    expect(superseded).toContain('/actions/replacement');
    const unauthenticated = renderPage(model({ authenticated: false }));
    expect(unauthenticated).not.toContain('value="approve"');
    expect(unauthenticated).toContain('Sign in before approving');
  });

  // Validates: approval-ui 15.1, 15.3.
  it('puts the outside-effect notice ahead of approval and labels dry-run', () => {
    const notice = 'Creates a real public issue in the configured sandbox.';
    const page = renderPage(model({ effectNotice: notice }));
    expect(page.indexOf(notice)).toBeLessThan(page.indexOf('data-approve '));
    expect(page).toContain('aria-describedby="effect-notice"');
    expect(renderPage(model({ dryRun: true }))).toContain('Dry-run: approving changes nothing outside this workspace.');
  });

  it('allows only same-origin absolute paths for output links and downloads', () => {
    const page = renderPage(model({
      app: { id: 'sample-app', name: 'Sample Agent', outputs: [{ label: 'Bad link', href: 'javascript:alert(1)' }, { label: 'Network link', href: '//example.com' }, { label: 'Digest', href: '/digest' }] },
      action: action({ status: 'succeeded' }), downloadUrl: '/\\example.com',
    }));
    expect(page).not.toContain('javascript:');
    expect(page).not.toContain('//example.com');
    expect(page).toContain('href="/digest"');
  });
});

describe('approval UI usable states', () => {
  // Validates: approval-ui 2.1, 2.3.
  it('shows actual counts, pending-first groups and a meaningful empty state', () => {
    const actions = [action({ id: 'done', status: 'succeeded' }), action({ id: 'pending' })];
    const page = renderPage(model({ page: 'queue', actions, filter: 'all' }));
    expect(page.indexOf('href="/actions/pending"')).toBeLessThan(page.indexOf('href="/actions/done"'));
    expect(page).toContain('<span class="summary-number">01</span>');
    const empty = renderPage(model({ page: 'queue', actions: [] }));
    expect(empty).toContain('Nothing is waiting on you.');
    expect(empty).toContain('action="/demo"');
  });

  // Validates: approval-ui 6.2, 6.3, 6.4.
  it('never claims verification unless a successful verification result is supplied', () => {
    const unchecked = renderPage(model({ page: 'audit' }));
    expect(unchecked).toContain('Chain not checked');
    expect(unchecked).not.toContain('Chain verified');
    const failed = renderPage(model({ page: 'audit', verification: { valid: false, message: 'Hash mismatch', seq: 3 } }));
    expect(failed).toContain('Chain verification failed');
    expect(failed).toContain('Sequence 3');
    expect(failed).toContain('Anyone with that key can rewrite it');
  });

  // Validates: approval-ui 3.3, 3.4, 3.7, 3.8, 7.1, 7.2.
  it('shows provenance, provider failure and execution failure without success language', () => {
    const page = renderPage(model({ action: action({ llmSourced: true, status: 'dead', lastError: 'Request timed out', suggestion: { by: 'llm:local/test', text: 'A proposal', fallback: 'provider warming up' } }) }));
    expect(page).toContain('AI-suggested: local/test');
    expect(page).toContain('unconfirmed AI-sourced data');
    expect(page).toContain('provider warming up');
    expect(page).toContain('Request timed out');
    expect(page).toContain('value="retry"');
    const settings = renderPage(model({ page: 'settings', provider: { name: 'none', status: 'Offline rules available', disclosure: 'Nothing sent to a provider.' } }));
    expect(settings).toContain('Offline rules available');
    expect(settings).toContain('Nothing sent to a provider.');
  });

});

describe('keyboard enhancement', () => {
  const setup = (enabled: boolean) => {
    class ElementStub {
      editing = false;
      focused = false;
      closest() { return this.editing ? this : null; }
      focus() { this.focused = true; }
    }
    class InputStub extends ElementStub {
      checked = false;
      change = () => {};
      addEventListener(_name: string, handler: () => void) { this.change = handler; }
    }
    class ButtonStub extends ElementStub {}
    class FormStub extends ElementStub {
      dataset = { effect: 'Creates a real public item.' };
      submitted: ButtonStub[] = [];
      requestSubmit(button: ButtonStub) { this.submitted.push(button); }
    }
    class DetailsStub extends ElementStub {
      open = false;
      reason = new ElementStub();
      querySelector() { return this.reason; }
    }
    const toggle = new InputStub();
    const button = new ButtonStub();
    const form = new FormStub();
    const details = new DetailsStub();
    const confirmations: string[] = [];
    let confirmResult = false;
    let keydown: (event: object) => void = () => {};
    const nodes: Record<string, ElementStub> = {
      '[data-shortcut-toggle]': toggle, '[data-approve]': button,
      '[data-approve-form]': form, '[data-reject-details]': details,
    };
    new Script(enhancementScript).runInNewContext({
      Element: ElementStub, HTMLInputElement: InputStub, HTMLButtonElement: ButtonStub,
      HTMLFormElement: FormStub, HTMLDetailsElement: DetailsStub,
      document: {
        querySelector: (selector: string) => nodes[selector] ?? null,
        querySelectorAll: () => [], getElementById: () => null,
        addEventListener: (_name: string, handler: (event: object) => void) => { keydown = handler; },
      },
      localStorage: { getItem: () => enabled ? 'on' : null, setItem: () => {} },
      window: { addEventListener: () => {}, confirm: (text: string) => { confirmations.push(text); return confirmResult; } },
    });
    const press = (key: string, editing = false, modifier = false) => {
      const target = new ElementStub(); target.editing = editing;
      let prevented = false;
      keydown({ key, target, ctrlKey: modifier, preventDefault: () => { prevented = true; } });
      return prevented;
    };
    return { toggle, button, form, details, confirmations, press, allow: () => { confirmResult = true; } };
  };

  // Validates: approval-ui 8.5, 15.4.
  it('starts disabled and asks before shortcut approval of a real effect', () => {
    const state = setup(false);
    expect(state.press('a')).toBe(false);
    expect(state.form.submitted).toHaveLength(0);
    state.toggle.checked = true; state.toggle.change();
    expect(state.press('a')).toBe(true);
    expect(state.confirmations).toHaveLength(1);
    expect(state.form.submitted).toHaveLength(0);
    state.allow(); state.press('a');
    expect(state.form.submitted).toEqual([state.button]);
  });

  // Validates: approval-ui 8.3, 8.4.
  it('ignores typing and modified keys, and opens the rejection field without submitting', () => {
    const state = setup(true);
    expect(state.press('a', true)).toBe(false);
    expect(state.press('a', false, true)).toBe(false);
    expect(state.confirmations).toHaveLength(0);
    expect(state.press('r')).toBe(true);
    expect(state.details.open).toBe(true);
    expect(state.details.reason.focused).toBe(true);
    expect(state.form.submitted).toHaveLength(0);
  });
});
