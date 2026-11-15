/* ══════════════════════════════════════════════════════════════
   RECYCLE HUB — registration drafts
   Saves what a partner has typed (never passwords, files, codes) to
   localStorage so a closed tab doesn't lose a half-filled wizard.
     rhDraft.bind({ form, key, skip, step, onRestore })
     rhDraft.clear(key)   call once the application is submitted
   collect/restore/fresh are exported for node tests.
   ══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const MAX_AGE = 7 * 864e5;
  const SECRET = new Set(['password', 'file', 'hidden', 'submit', 'button']);

  function collect(fields, skip = []) {
    const out = {};
    for (const el of fields) {
      if (!el.id || SECRET.has(el.type) || skip.includes(el.id)) continue;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) out[el.id] = true; continue; }
      if (String(el.value).trim()) out[el.id] = el.value;
    }
    return out;
  }

  function restore(fields, data) {
    let n = 0;
    for (const el of fields) {
      if (!el.id || !(el.id in data) || SECRET.has(el.type) || el.readOnly || el.disabled) continue;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = data[el.id] === true;
      else el.value = data[el.id];
      n++;
    }
    return n;
  }

  function fresh(raw, now = Date.now()) {
    let d;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || typeof d.t !== 'number' || now - d.t > MAX_AGE || !d.v || !Object.keys(d.v).length) return null;
    return d;
  }

  const api = { collect, restore, fresh };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' minutes ago';
    const h = Math.round(m / 60);
    return h < 24 ? h + (h === 1 ? ' hour ago' : ' hours ago') : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  api.clear = (key) => localStorage.removeItem(key);

  api.bind = ({ form, key, skip = [], step, onRestore }) => {
    const fields = () => [...form.elements];
    const d = fresh(localStorage.getItem(key));
    if (d) {
      restore(fields(), d.v);
      for (const el of fields()) if (el.id in d.v) el.dispatchEvent(new Event(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
      if (onRestore) onRestore(d);
      const note = document.createElement('div');
      note.className = 'rh-draft-note';
      note.setAttribute('role', 'status');
      note.innerHTML = '<span>Picked up where you left off (saved on this device ' + ago(d.t) + ').</span><button type="button">Start over</button>';
      note.querySelector('button').onclick = () => { api.clear(key); location.reload(); };
      form.prepend(note);
    }
    let timer = 0;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const v = collect(fields(), skip);
        if (!Object.keys(v).length) return api.clear(key);
        localStorage.setItem(key, JSON.stringify({ t: Date.now(), v, step: step ? step() : undefined }));
      }, 300);
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);
  };

  root.rhDraft = api;
})(typeof window !== 'undefined' ? window : globalThis);
