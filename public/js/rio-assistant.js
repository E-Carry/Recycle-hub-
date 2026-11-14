/* ══════════════════════════════════════════════════════════════
   RIO AI — site-wide assistant
   Lazily loads the Rio engine (/rio/*.js) on first open and talks to
   window.rioEngine. Full admin console lives at /rio/.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__rioAssistant) return;
  window.__rioAssistant = true;

  const ENGINE = ['/rio/knowledge-base.js', '/rio/email-alert.js', '/rio/rio-engine.js'];
  const STORE = 'rio_chat_v1';
  const CHIPS = [
    // Verified to hit their KB entries (engine is keyword-matched; paraphrases can miss).
    'How do I book a pickup?',
    'What plastic items do you collect?',
    'When do I get paid?',
    'Where can I check the current rates?',
  ];

  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem('loggedInUser')) || {}; }
    catch (e) { return {}; }
  })();
  const isAdmin = !!(user.isAdmin || user.type === 'admin');

  const ic = {
    chat: '<svg class="rio-ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.1A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>',
    x: '<svg class="rio-ic-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  };

  const root = document.createElement('div');
  root.className = 'rio';
  root.innerHTML = `
    <div class="rio-hint" role="status">Need help? Ask Rio AI</div>
    <section class="rio-panel" role="dialog" aria-label="Rio AI assistant" aria-hidden="true">
      <header class="rio-head">
        <img class="rio-ava" src="/rio/assets/rio_logo.png" alt="" loading="lazy">
        <div>
          <div class="rio-title">Rio AI</div>
          <div class="rio-status">Recycle Hub assistant</div>
        </div>
        <div class="rio-head-actions">
          ${isAdmin ? `<a class="rio-icon-btn" href="/rio/" title="Open Rio console (knowledge base, alerts)">${ic.open}</a>` : ''}
          <button class="rio-icon-btn" data-act="reset" title="New conversation">${ic.reset}</button>
        </div>
      </header>
      <div class="rio-body" aria-live="polite"></div>
      <div class="rio-chips"></div>
      <form class="rio-foot">
        <input class="rio-input" placeholder="Ask about pickups, payments, rates…" autocomplete="off" maxlength="500">
        <button class="rio-send" type="submit" title="Send" disabled>${ic.send}</button>
      </form>
    </section>
    <button class="rio-launch" aria-label="Open Rio AI assistant" aria-expanded="false">${ic.chat}${ic.x}</button>`;

  const $ = (s) => root.querySelector(s);
  const panel = $('.rio-panel'), body = $('.rio-body'), chips = $('.rio-chips');
  const form = $('.rio-foot'), input = $('.rio-input'), send = $('.rio-send');
  const launch = $('.rio-launch'), hint = $('.rio-hint');

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE)) || []; } catch (e) { history = []; }
  const save = () => sessionStorage.setItem(STORE, JSON.stringify(history.slice(-60)));

  // Escape first, then apply the engine's tiny markdown subset (**bold**, newlines).
  const fmt = (t) => String(t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  function render(m) {
    const el = document.createElement('div');
    el.className = 'rio-msg ' + m.who + (m.alert ? ' alert' : '');
    el.innerHTML = fmt(m.text) + (m.time ? `<span class="rio-time">${fmt(m.time)}</span>` : '');
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }
  function push(m) { history.push(m); save(); render(m); }

  function renderChips() {
    chips.innerHTML = '';
    CHIPS.forEach((q, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'rio-chip'; b.textContent = q;
      b.style.animationDelay = (0.05 * i + 0.15) + 's';
      b.onclick = () => ask(q);
      chips.appendChild(b);
    });
  }

  function greet() {
    const first = (user.fullName || '').split(' ')[0];
    push({ who: 'bot', text: `Hi${first ? ' ' + first : ''}! I'm **Rio AI**, the Recycle Hub assistant. Ask me about pickups, accepted materials, payments, rates or your account.` });
  }

  let engine = null;
  function loadEngine() {
    if (engine) return engine;
    engine = ENGINE.reduce((p, src) => p.then(() => new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok;
      s.onerror = () => fail(new Error('failed to load ' + src));
      document.head.appendChild(s);
    })), Promise.resolve()).then(() => {
      if (!window.rioEngine) throw new Error('rioEngine missing after load');
      return window.rioEngine;
    });
    engine.catch(() => { engine = null; }); // allow retry on next ask
    return engine;
  }

  // LLM reply via the server (key never reaches the browser). null = use the engine's answer.
  let llmOff = false;
  async function llm(text, prior) {
    if (llmOff) return null;
    const m = window.rioKB && window.rioKB.findBestMatch(text);
    try {
      const r = await fetch('/api/rio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          facts: m ? [{ q: m.entry.question, a: m.entry.answer }] : [],
          history: prior.filter((h) => !h.alert).map((h) => ({ role: h.who === 'user' ? 'user' : 'assistant', content: h.text })),
        }),
      });
      if (r.status === 503) llmOff = true; // not configured on this server
      if (!r.ok) return null;
      return (await r.json()).reply || null;
    } catch (e) {
      console.warn('[Rio] LLM unavailable, using built-in answers', e);
      return null;
    }
  }

  let busy = false;
  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; input.value = ''; send.disabled = true;
    chips.innerHTML = '';
    const prior = history.slice(-8);
    push({ who: 'user', text });

    const typing = document.createElement('div');
    typing.className = 'rio-msg bot rio-typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(typing); body.scrollTop = body.scrollHeight;

    try {
      const rio = await loadEngine();
      const [res] = await Promise.all([
        rio.processMessage(text, { name: user.fullName, email: user.email }),
        new Promise((r) => setTimeout(r, 450)), // let the typing dots read as "thinking"
      ]);
      // Alerts keep the engine's reply: it carries the incident reference.
      const reply = res.flaggedAlert ? null : await llm(text, prior);
      typing.remove();
      push({ who: 'bot', alert: !!res.flaggedAlert, text: reply || res.botMsg.text, time: res.botMsg.time });
    } catch (err) {
      typing.remove();
      console.error('[Rio]', err);
      push({ who: 'bot', alert: true, text: `Sorry, I couldn't reach the assistant engine (${err.message}). Please try again, or email **recycle.hub.pvt.ltd@gmail.com**.` });
    } finally {
      busy = false;
      send.disabled = !input.value.trim();
    }
  }

  function setOpen(open) {
    root.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    launch.setAttribute('aria-expanded', String(open));
    launch.setAttribute('aria-label', open ? 'Close Rio AI assistant' : 'Open Rio AI assistant');
    hint.classList.remove('on');
    if (open) {
      if (!body.childElementCount) {
        if (history.length) history.forEach(render); else greet();
        if (history.length <= 1) renderChips();
      }
      setTimeout(() => input.focus(), 250);
      loadEngine().catch(() => {}); // warm up; errors surface on ask()
    }
  }

  launch.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', () => { send.disabled = busy || !input.value.trim(); });
  $('[data-act="reset"]').addEventListener('click', () => {
    history = []; save(); body.innerHTML = '';
    if (window.rioEngine) window.rioEngine.sessionHistory = [];
    greet(); renderChips(); input.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('open')) { setOpen(false); launch.focus(); }
  });

  function mount() {
    document.body.appendChild(root);
    // One-time nudge per session, after the page has settled.
    if (!sessionStorage.getItem('rio_hinted')) {
      setTimeout(() => {
        if (root.classList.contains('open')) return;
        hint.classList.add('on');
        sessionStorage.setItem('rio_hinted', '1');
        setTimeout(() => hint.classList.remove('on'), 4500);
      }, 2200);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
