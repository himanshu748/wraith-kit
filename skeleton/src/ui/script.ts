// WRAITH-SKELETON
export const enhancementScript = String.raw`
(() => {
  'use strict';
  const preferenceKey = 'wraith.shortcuts';
  let shortcuts = false;
  try { shortcuts = localStorage.getItem(preferenceKey) === 'on'; } catch { /* Storage may be disabled. */ }
  const toggle = document.querySelector('[data-shortcut-toggle]');
  if (toggle instanceof HTMLInputElement) {
    toggle.checked = shortcuts;
    toggle.addEventListener('change', () => {
      shortcuts = toggle.checked;
      try { localStorage.setItem(preferenceKey, shortcuts ? 'on' : 'off'); } catch { /* Preference applies for this page only. */ }
      const live = document.getElementById('interaction-status');
      if (live) live.textContent = shortcuts ? 'Single-key shortcuts enabled.' : 'Single-key shortcuts disabled.';
    });
  }
  let activeRow = -1;
  document.addEventListener('keydown', event => {
    if (!shortcuts || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented || event.isComposing) return;
    const target = event.target;
    if (target instanceof Element && (target.closest('input,textarea,select,[contenteditable]') || target.closest('[role="textbox"]'))) return;
    const key = event.key.toLowerCase();
    if (key === 'j' || key === 'k') {
      const links = [...document.querySelectorAll('[data-action-link]')];
      if (!links.length) return;
      const focused = links.indexOf(document.activeElement);
      if (focused >= 0) activeRow = focused;
      activeRow = key === 'j' ? Math.min(activeRow + 1, links.length - 1) : Math.max(activeRow - 1, 0);
      event.preventDefault();
      links[activeRow].focus();
      return;
    }
    if (key === 'a') {
      const button = document.querySelector('[data-approve]');
      const form = document.querySelector('[data-approve-form]');
      if (!(button instanceof HTMLButtonElement) || !(form instanceof HTMLFormElement)) return;
      event.preventDefault();
      if (form.dataset.effect && !window.confirm(form.dataset.effect + '\n\nApprove this real action?')) return;
      form.requestSubmit(button);
    }
    if (key === 'r') {
      const details = document.querySelector('[data-reject-details]');
      if (!(details instanceof HTMLDetailsElement)) return;
      event.preventDefault();
      details.open = true;
      const reason = details.querySelector('textarea');
      if (reason) reason.focus();
    }
  });
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', () => {
      // Keep the named submitter enabled: disabling it would drop its decision value.
      form.setAttribute('aria-busy', 'true');
      const live = document.getElementById('interaction-status');
      if (live) live.textContent = 'Sending your request. Please wait.';
    });
  });
  window.addEventListener('pageshow', () => document.querySelectorAll('form[aria-busy]').forEach(form => form.removeAttribute('aria-busy')));
})();
`;
