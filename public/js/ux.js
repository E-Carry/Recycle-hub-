/* ══════════════════════════════════════════════════════════════
   RECYCLE HUB — UX layer: toasts, command palette (Ctrl/⌘+K),
   skeleton loaders. Pure helpers are exported for node tests.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Pure helpers ─────────────────────────────────────────── */

  // Fuzzy subsequence score; null when q is not a subsequence of text.
  // Rewards word-start hits and runs of consecutive characters.
  function score(q, text) {
    q = q.toLowerCase(); text = String(text).toLowerCase();
    let s = 0, j = 0, run = 0;
    for (let i = 0; i < text.length && j < q.length; i++) {
      if (text[i] !== q[j]) { run = 0; continue; }
      const start = i === 0 || /[\s\-_/(]/.test(text[i - 1]);
      run++;
      s += 1 + (start ? 3 : 0) + (run > 1 ? 2 : 0);
      j++;
    }
    if (j < q.length) return null;
    return s - text.length * 0.01; // shorter labels win ties
  }

  function rank(q, items) {
    q = q.trim();
    if (!q) return items;
    return items
      .map((it, i) => {
        const a = score(q, it.label), b = it.hint ? score(q, it.hint) : null;
        const s = a !== null ? a + 100 : b !== null ? b : null;
        return { it, i, s };
      })
      .filter((x) => x.s !== null)
      .sort((x, y) => y.s - x.s || x.i - y.i)
      .map((x) => x.it);
  }

  // Other questions from the matched entry's category, for Rio's follow-up chips.
  function followUps(entries, entry, asked, n) {
    if (!entry) return [];
    const seen = new Set(asked);
    return entries
      .filter((e) => e.category === entry.category && e.id !== entry.id && !seen.has(e.question))
      .slice(0, n)
      .map((e) => e.question);
  }

  const api = { score, rank, followUps };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  if (window.rhUX) return;
  window.rhUX = api;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const icons = {
    success: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    error: '<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>',
    info: '<path d="M12 11v6M12 7.5v.5"/><circle cx="12" cy="12" r="9"/>',
  };

  /* ── Toasts ───────────────────────────────────────────────── */
  // Pending toasts live in sessionStorage until shown out, so a toast
  // followed by a redirect (alert(); location.href = ...) survives it.
  const QKEY = 'rh_toasts';
  const queue = () => { try { return JSON.parse(sessionStorage.getItem(QKEY)) || []; } catch (e) { return []; } };
  const setQueue = (q) => sessionStorage.setItem(QKEY, JSON.stringify(q));
  let tray;
  const shownIds = new Set();

  function guessType(msg) {
    if (/fail|error|invalid|incorrect|wrong|denied|must|please|required|not match|enter a|select|cannot|unable/i.test(msg)) return 'error';
    if (/success|registered|copied|sent|saved|verified|done|welcome/i.test(msg)) return 'success';
    return 'info';
  }

  function show(t) {
    if (shownIds.has(t.id)) return;
    shownIds.add(t.id);
    if (!tray) { tray = document.createElement('div'); tray.className = 'rh-toasts'; tray.setAttribute('aria-live', 'polite'); document.body.appendChild(tray); }
    const el = document.createElement('div');
    el.className = 'rh-toast ' + t.type;
    el.setAttribute('role', t.type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icons[t.type] || icons.info}</svg>
      <div class="rh-toast-msg">${esc(t.msg).replace(/\n/g, '<br>')}</div>
      <button class="rh-toast-x" aria-label="Dismiss">&times;</button>
      <i class="rh-toast-bar" style="animation-duration:${t.ms}ms"></i>`;
    tray.appendChild(el);
    while (tray.children.length > 4) tray.firstElementChild.remove();
    let timer;
    const close = () => {
      clearTimeout(timer);
      setQueue(queue().filter((x) => x.id !== t.id));
      if (reduce) return el.remove();
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    };
    const arm = () => { timer = setTimeout(close, t.ms); };
    el.addEventListener('mouseenter', () => { clearTimeout(timer); el.classList.add('paused'); });
    el.addEventListener('mouseleave', () => { el.classList.remove('paused'); arm(); });
    el.querySelector('.rh-toast-x').onclick = close;
    arm();
  }

  function toast(msg, type, ms) {
    msg = String(msg == null ? '' : msg);
    const t = { id: Date.now() + Math.random(), msg, type: type || guessType(msg), ms: ms || Math.min(7000, 3200 + msg.length * 30) };
    setQueue(queue().concat(t).slice(-4));
    if (document.body) show(t);
    else document.addEventListener('DOMContentLoaded', () => show(t));
  }
  window.rhToast = toast;
  // Native alert() blocks the page and looks dated; every call site in this
  // site is a fire-and-forget notice, so a toast is a safe stand-in.
  window.alert = (msg) => toast(msg);

  // In-app confirm dialog. Resolves true on confirm, false on cancel/Esc/backdrop.
  function confirmBox(msg, ok) {
    return new Promise((done) => {
      const o = document.createElement('div');
      o.className = 'rh-confirm';
      o.innerHTML = `<div class="rh-confirm-card" role="alertdialog" aria-modal="true">
        <p>${esc(msg)}</p>
        <div class="rh-confirm-row"><button class="rh-confirm-no">Cancel</button><button class="rh-confirm-ok">${esc(ok || 'Confirm')}</button></div></div>`;
      const end = (v) => { document.removeEventListener('keydown', key); o.remove(); done(v); };
      const key = (e) => { if (e.key === 'Escape') end(false); };
      o.onclick = (e) => { if (e.target === o) end(false); };
      o.querySelector('.rh-confirm-no').onclick = () => end(false);
      o.querySelector('.rh-confirm-ok').onclick = () => end(true);
      document.addEventListener('keydown', key);
      document.body.appendChild(o);
      o.querySelector('.rh-confirm-ok').focus();
    });
  }
  window.rhConfirm = confirmBox;

  /* ── Skeleton loaders ─────────────────────────────────────── */
  // Containers the pages fill from the API are marked with a comment.
  const PLACEHOLDER = /JS fills|Populated via API/;
  function skeletons() {
    const all = document.querySelectorAll('tbody, div, section');
    all.forEach((el) => {
      const kids = [...el.childNodes];
      if (!kids.some((n) => n.nodeType === 8 && PLACEHOLDER.test(n.data))) return;
      if (kids.some((n) => n.nodeType === 1 || (n.nodeType === 3 && n.data.trim()))) return;
      if (el.tagName === 'TBODY') {
        const cols = el.closest('table').querySelectorAll('thead th').length || 4;
        for (let r = 0; r < 4; r++) {
          const tr = document.createElement('tr');
          tr.className = 'rh-skel';
          tr.innerHTML = '<td><i class="rh-shimmer"></i></td>'.repeat(cols);
          el.appendChild(tr);
        }
      } else {
        const grid = /grid/.test(el.className);
        for (let r = 0; r < (grid ? 4 : 3); r++) {
          const b = document.createElement('div');
          b.className = 'rh-skel ' + (grid ? 'rh-skel-card' : 'rh-skel-line');
          b.innerHTML = '<i class="rh-shimmer"></i>';
          el.appendChild(b);
        }
      }
      // Pages either replace innerHTML (skeleton vanishes) or append; clear on first real child.
      const mo = new MutationObserver(() => {
        if ([...el.children].some((c) => !c.classList.contains('rh-skel'))) {
          el.querySelectorAll(':scope > .rh-skel').forEach((s) => s.remove());
          mo.disconnect();
        }
      });
      mo.observe(el, { childList: true });
      // Never shimmer forever if the fetch fails and nothing renders.
      setTimeout(() => { el.querySelectorAll(':scope > .rh-skel').forEach((s) => s.remove()); mo.disconnect(); }, 9000);
    });
  }

  /* ── Command palette ──────────────────────────────────────── */
  const user = (() => { try { return JSON.parse(sessionStorage.getItem('loggedInUser')) || {}; } catch (e) { return {}; } })();
  const here = location.pathname.split('/').pop() || 'index.html';
  const PAGES = [
    { label: 'Home', hint: 'landing page', href: 'index.html' },
    { label: 'Sign in', hint: 'login account', href: 'login.html' },
    { label: 'Create account', hint: 'register sign up', href: 'register.html' },
    { label: 'Sourcing dashboard', hint: 'pickups sell scrap partner', href: 'sourcing-dashboard.html' },
    { label: 'Industrial dashboard', hint: 'buy material orders catalog', href: 'industrial-dashboard.html' },
  ];
  if (user.isAdmin || user.type === 'admin') PAGES.push({ label: 'Admin console', hint: 'admin dashboard', href: 'admin-dashboard.html' });

  const txt = (el) => (el.getAttribute('aria-label') || el.title || el.textContent || '').replace(/\s+/g, ' ').trim();

  function collect() {
    const items = [], seen = new Set();
    const add = (it) => { const k = it.label.toLowerCase(); if (!it.label || seen.has(k)) return; seen.add(k); items.push(it); };
    document.querySelectorAll('.nav-btn, .nav-link, .tab-btn, .filter-pill').forEach((el) => {
      if (el.closest('.rio, .rh-cmdk') || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
      const label = txt(el).replace(/\s*\d+$/, ''); // drop trailing badge counts
      if (label.length > 1 && label.length < 40) add({ label, hint: 'Go to section', group: 'Navigate', icon: 'nav', run: () => el.click() });
    });
    document.querySelectorAll('section[id]').forEach((s) => {
      const h = s.querySelector('h1, h2');
      if (h) add({ label: txt(h).slice(0, 60), hint: 'Jump to section', group: 'On this page', icon: 'hash', run: () => s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }) });
    });
    PAGES.filter((p) => p.href !== here).forEach((p) => add({ label: p.label, hint: p.hint, group: 'Pages', icon: 'page', run: () => { location.href = p.href; } }));
    add({ label: 'Ask Rio AI', hint: 'assistant help chat question  Ctrl+/', group: 'Assistant', icon: 'rio', run: () => window.rioOpen && window.rioOpen() });
    return items;
  }

  const IC = {
    nav: '<path d="M4 6h16M4 12h10M4 18h7"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16"/>',
    page: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    rio: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  };

  let pal, input, list, items = [], shown = [], sel = 0, lastFocus;
  function build() {
    pal = document.createElement('div');
    pal.className = 'rh-cmdk';
    pal.innerHTML = `<div class="rh-cmdk-box" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="rh-cmdk-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input class="rh-cmdk-input" placeholder="Search pages, sections, or ask Rio…" aria-label="Search commands" autocomplete="off" spellcheck="false">
          <kbd>Esc</kbd>
        </div>
        <ul class="rh-cmdk-list" role="listbox"></ul>
        <div class="rh-cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>Ctrl</kbd><kbd>/</kbd> Rio AI</span></div>
      </div>`;
    document.body.appendChild(pal);
    input = pal.querySelector('input'); list = pal.querySelector('ul');
    pal.addEventListener('mousedown', (e) => { if (e.target === pal) close(); });
    input.addEventListener('input', () => { sel = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(shown.length, 1);
        mark();
      } else if (e.key === 'Enter') { e.preventDefault(); pick(shown[sel]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') e.preventDefault(); // keep focus in the dialog
    });
  }

  function draw() {
    const q = input.value.trim();
    shown = rank(q, items);
    if (q) shown = shown.concat({ label: `Ask Rio: “${q}”`, hint: '', group: 'Assistant', icon: 'rio', run: () => window.rioOpen && window.rioOpen(q) });
    let group = '';
    list.innerHTML = shown.map((it, i) => {
      const g = it.group !== group && !q ? `<li class="rh-cmdk-group" role="presentation">${esc(group = it.group)}</li>` : '';
      return `${g}<li class="rh-cmdk-item" role="option" data-i="${i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[it.icon]}</svg><span>${esc(it.label)}</span><em>${esc(it.group)}</em></li>`;
    }).join('');
    list.querySelectorAll('.rh-cmdk-item').forEach((li) => {
      li.addEventListener('mousemove', () => { if (sel !== +li.dataset.i) { sel = +li.dataset.i; mark(); } });
      li.addEventListener('click', () => pick(shown[+li.dataset.i]));
    });
    mark();
  }

  function mark() {
    list.querySelectorAll('.rh-cmdk-item').forEach((li) => {
      const on = +li.dataset.i === sel;
      li.classList.toggle('sel', on);
      li.setAttribute('aria-selected', String(on));
      if (on) li.scrollIntoView({ block: 'nearest' });
    });
  }

  function pick(it) { if (!it) return; close(); setTimeout(it.run, 60); }
  function open() {
    if (!pal) build();
    lastFocus = document.activeElement;
    items = collect(); input.value = ''; sel = 0; draw();
    pal.classList.add('on');
    setTimeout(() => input.focus(), 20);
  }
  function close() {
    if (!pal || !pal.classList.contains('on')) return;
    pal.classList.remove('on');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.rhPalette = { open, close };

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      pal && pal.classList.contains('on') ? close() : open();
    }
  });

  // A visible entry point, tucked into whichever top bar the page has.
  function trigger() {
    const bar = document.querySelector('.topbar-actions, .topbar-right, .nav-actions, .nav-right');
    if (!bar) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rh-kbtn';
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Search</span><kbd>${/Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd>`;
    b.onclick = open;
    bar.insertBefore(b, bar.firstChild);
  }

  function init() {
    queue().forEach(show);
    skeletons();
    trigger();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
