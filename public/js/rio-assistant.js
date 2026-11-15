/* ══════════════════════════════════════════════════════════════
   RIO AI — site-wide assistant
   Lazily loads the Rio engine (/rio/*.js) on first open and talks to
   window.rioEngine. Full admin console lives at /rio/.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__rioAssistant) return;
  window.__rioAssistant = true;

  const ENGINE = ['/rio/voice-engine.js', '/rio/knowledge-base.js', '/rio/email-alert.js', '/rio/rio-engine.js'];
  const STORE = 'rio_chat_v1';
  const SPEAK = 'rio_speak'; // localStorage: '1' = read every reply aloud
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

  // Rio mark: emerald squircle with a white AI sparkle and a small companion star.
  // Gradient ids must be unique per instance.
  let markN = 0;
  const mark = (cls) => {
    const g = 'rioG' + (++markN);
    return `<svg class="rio-mark ${cls}" viewBox="0 0 40 40" aria-hidden="true">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#059669"/><stop offset="1" stop-color="#047857"/></linearGradient></defs>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#${g})"/>
      <rect x="2.5" y="2.5" width="35" height="35" rx="10.5" fill="none" stroke="#fff" stroke-opacity=".14"/>
      <path class="rio-mark-core" d="M18 9c.9 5.6 3.9 8.6 9.5 9.5-5.6.9-8.6 3.9-9.5 9.5-.9-5.6-3.9-8.6-9.5-9.5C14.1 17.6 17.1 14.6 18 9z" fill="#fff"/>
      <path class="rio-mark-spark" d="M28.5 24.5c.35 2 1.5 3.15 3.5 3.5-2 .35-3.15 1.5-3.5 3.5-.35-2-1.5-3.15-3.5-3.5 2-.35 3.15-1.5 3.5-3.5z" fill="#d1fae5"/>
    </svg>`;
  };

  const ic = {
    x: '<svg class="rio-ic-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="rio-wave" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="rio-mute" d="M16 9l6 6M22 9l-6 6"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  };

  const root = document.createElement('div');
  root.className = 'rio';
  root.innerHTML = `
    <div class="rio-hint" role="status">Need help? Ask Rio AI</div>
    <section class="rio-panel" role="dialog" aria-label="Rio AI assistant" aria-hidden="true">
      <header class="rio-head">
        <span class="rio-ava">${mark('')}</span>
        <div>
          <div class="rio-title">Rio AI</div>
          <div class="rio-status">Recycle Hub assistant</div>
        </div>
        <div class="rio-head-actions">
          ${isAdmin ? `<a class="rio-icon-btn" href="/rio/" title="Open Rio console (knowledge base, alerts)">${ic.open}</a>` : ''}
          <button class="rio-icon-btn rio-speak-toggle" data-act="speak" aria-pressed="false" title="Read replies aloud">${ic.vol}</button>
          <button class="rio-icon-btn" data-act="reset" title="New conversation">${ic.reset}</button>
        </div>
      </header>
      <div class="rio-body" aria-live="polite"></div>
      <div class="rio-chips"></div>
      <form class="rio-foot">
        <input class="rio-input" placeholder="Ask about pickups, payments, rates…" autocomplete="off" maxlength="500">
        <button class="rio-mic" type="button" title="Speak to Rio" aria-label="Speak to Rio" aria-pressed="false">${ic.mic}</button>
        <button class="rio-send" type="submit" title="Send" disabled>${ic.send}</button>
      </form>
    </section>
    <button class="rio-launch" aria-label="Open Rio AI assistant" aria-expanded="false">${mark('rio-ic-chat')}${ic.x}</button>`;

  const $ = (s) => root.querySelector(s);
  const panel = $('.rio-panel'), body = $('.rio-body'), chips = $('.rio-chips');
  const form = $('.rio-foot'), input = $('.rio-input'), send = $('.rio-send');
  const launch = $('.rio-launch'), hint = $('.rio-hint'), mic = $('.rio-mic');

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE)) || []; } catch (e) { history = []; }
  const save = () => sessionStorage.setItem(STORE, JSON.stringify(history.slice(-60)));

  // Escape first, then apply the engine's tiny markdown subset (**bold**, newlines).
  const fmt = (t) => String(t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copyIc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>';

  function copy(text) {
    const plain = String(text).replace(/\*\*/g, '');
    const done = () => window.rhToast && window.rhToast('Copied to clipboard', 'success', 1800);
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(plain).then(done, () => fallback(plain, done));
    fallback(plain, done);
  }
  function fallback(plain, done) {
    const t = document.createElement('textarea');
    t.value = plain; t.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy'); t.remove();
    if (ok) done(); else console.error('[Rio] copy failed');
  }

  // Word-by-word reveal; an unclosed ** mid-reveal would render literally, so drop it.
  function typewrite(el, m) {
    const words = String(m.text).split(/(\s+)/);
    let i = 0;
    return new Promise((done) => {
      const tick = () => {
        i = Math.min(words.length, i + 2);
        let part = words.slice(0, i).join('');
        if ((part.match(/\*\*/g) || []).length % 2) part = part.replace(/\*\*(?!.*\*\*)/, '');
        el.firstChild.innerHTML = fmt(part);
        body.scrollTop = body.scrollHeight;
        if (i < words.length) setTimeout(tick, 28); else done();
      };
      tick();
    });
  }

  function render(m, animate) {
    const el = document.createElement('div');
    el.className = 'rio-msg ' + m.who + (m.alert ? ' alert' : '');
    el.innerHTML = '<span class="rio-txt"></span>' + (m.time ? `<span class="rio-time">${fmt(m.time)}</span>` : '');
    if (m.who === 'bot') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'rio-copy'; b.title = 'Copy'; b.setAttribute('aria-label', 'Copy reply');
      b.innerHTML = copyIc; b.onclick = () => copy(m.text);
      el.appendChild(b);
      const v = document.createElement('button');
      v.type = 'button'; v.className = 'rio-copy rio-say'; v.title = 'Read aloud'; v.setAttribute('aria-label', 'Read reply aloud');
      v.innerHTML = ic.vol; v.onclick = () => say(m.text);
      el.appendChild(v);
    }
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    if (animate && !reduced && m.who === 'bot') return typewrite(el, m);
    el.firstChild.innerHTML = fmt(m.text);
    return Promise.resolve();
  }
  function push(m, animate) { history.push(m); save(); return render(m, animate); }

  function renderChips(list = CHIPS) {
    chips.innerHTML = '';
    list.forEach((q, i) => {
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

  // ── Voice (Web Speech API via /rio/voice-engine.js) ──
  let speakOn = localStorage.getItem(SPEAK) === '1';
  const voiceErr = {
    'not-allowed': 'Microphone access is blocked. Allow it from the address-bar icon and try again.',
    'service-not-allowed': 'Microphone access is blocked. Allow it from the address-bar icon and try again.',
    'no-speech': "I didn't hear anything. Tap the mic and speak again.",
    'audio-capture': 'No microphone was found on this device.',
    network: 'Voice recognition needs an internet connection (and Chrome or Edge).',
  };
  const toast = (m, t) => (window.rhToast ? window.rhToast(m, t || 'info', 4200) : console.warn('[Rio]', m));
  async function say(text) {
    try { await loadEngine(); } catch (e) { return toast('Voice is unavailable right now.', 'error'); }
    if (!window.rioVoice.synthesis) return toast('This browser cannot read text aloud.', 'error');
    window.rioVoice.speak(String(text).replace(/\*\*/g, ''));
  }
  function setSpeak(on) {
    speakOn = on;
    localStorage.setItem(SPEAK, on ? '1' : '0');
    const b = $('[data-act="speak"]');
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? 'Reading replies aloud (click to mute)' : 'Read replies aloud';
    if (!on && window.rioVoice) window.rioVoice.stopSpeaking();
  }
  async function listen() {
    try { await loadEngine(); } catch (e) { return toast('Voice is unavailable right now.', 'error'); }
    const v = window.rioVoice;
    if (v.isListening) return v.stopListening();
    if (!v.recognition) return toast('Voice input needs Chrome, Edge or Safari. You can still type your question.', 'error');
    v.onErrorCallback = (code) => toast(voiceErr[code] || 'Voice input stopped (' + code + ').', 'error');
    let heard = '';
    v.startListening((t, final) => {
      heard = t; input.value = t; send.disabled = !t.trim();
      if (final) { ask(t, true); v.stopListening(); } // ask clears the input, so the idle fallback below won't re-send
    }, (state) => {
      const on = state === 'listening';
      root.classList.toggle('listening', on);
      mic.setAttribute('aria-pressed', String(on));
      input.placeholder = on ? 'Listening…' : 'Ask about pickups, payments, rates…';
      if (!on && heard && input.value === heard && !busy) ask(heard, true); // ended without a final result
      if (!on) heard = '';
    });
  }

  let busy = false;
  async function ask(text, viaVoice) {
    text = String(text).trim();
    if (!text || busy) return;
    busy = true; input.value = ''; send.disabled = true;
    chips.innerHTML = ''; root.classList.add('thinking');
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
      root.classList.remove('thinking');
      const answer = reply || res.botMsg.text;
      if (viaVoice || speakOn) say(answer); // speak while the text types out
      await push({ who: 'bot', alert: !!res.flaggedAlert, text: answer, time: res.botMsg.time }, true);
      const hit = window.rioKB && window.rioKB.findBestMatch(text);
      const asked = history.filter((h) => h.who === 'user').map((h) => h.text);
      const next = window.rhUX && hit ? window.rhUX.followUps(window.rioKB.getAll(), hit.entry, asked, 3) : [];
      if (next.length) renderChips(next);
    } catch (err) {
      typing.remove();
      console.error('[Rio]', err);
      push({ who: 'bot', alert: true, text: `Sorry, I couldn't reach the assistant engine (${err.message}). Please try again, or email **recycle.hub.pvt.ltd@gmail.com**.` });
    } finally {
      root.classList.remove('thinking');
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
    if (!open && window.rioVoice) { window.rioVoice.stopListening(); window.rioVoice.stopSpeaking(); }
    if (open) {
      if (!body.childElementCount) {
        if (history.length) history.forEach((m) => render(m)); else greet();
        if (history.length <= 1) renderChips();
      }
      setTimeout(() => input.focus(), 250);
      loadEngine().catch(() => {}); // warm up; errors surface on ask()
    }
  }

  launch.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  mic.addEventListener('click', listen);
  $('[data-act="speak"]').addEventListener('click', () => setSpeak(!speakOn));
  setSpeak(speakOn);
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', () => { send.disabled = busy || !input.value.trim(); });
  $('[data-act="reset"]').addEventListener('click', () => {
    history = []; save(); body.innerHTML = '';
    if (window.rioEngine) window.rioEngine.sessionHistory = [];
    greet(); renderChips(); input.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('open')) { setOpen(false); launch.focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); setOpen(!root.classList.contains('open')); }
  });

  // Used by the command palette: open Rio, optionally asking q straight away.
  window.rioOpen = (q) => {
    setOpen(true);
    if (q && q.trim()) ask(q);
  };

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
