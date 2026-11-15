/* ══════════════════════════════════════════════════════════════
   RECYCLE HUB — Figma-style motion layer
   Generic, markup-agnostic: watches the DOM and animates what pages
   already do (show a section, render rows/cards, update a metric).
   Uses Web Animations without lingering fill, so no transform is left
   behind to fight page styles or re-anchor position:fixed children.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__rhMotion) return;
  window.__rhMotion = true;

  // Cross-document view transitions (motion.css) reject with AbortError
  // "Transition was skipped" when the user navigates again mid-fade. Navigation
  // still succeeds, so only that expected abort is silenced; others surface.
  const quiet = (vt) => vt && ['ready', 'finished'].forEach((k) =>
    vt[k].catch((e) => { if (e.name !== 'AbortError') throw e; }));
  addEventListener('pageswap', (e) => quiet(e.viewTransition));
  addEventListener('pagereveal', (e) => quiet(e.viewTransition));

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!Element.prototype.animate) return;

  // Plain ease-out: no overshoot, reads as calm rather than bouncy.
  const EASE = 'cubic-bezier(.22,1,.36,1)';

  const CARD = [
    '.card', '.stat-card', '.metric-card', '.section-card', '.glass-panel',
    '.step-card', '.upload-card', '.rh-glass', '.v-step', '.store-card', '.product-card',
  ].join(',');
  const SECTION = '.section, .view-section';

  const visible = (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
  // Respect elements the page already animates on entry.
  const hasOwnAnim = (el) => getComputedStyle(el).animationName !== 'none';
  // Leaves only: animating a panel and its child cards would double-fade.
  const leaves = (els) => els.filter((el) => !el.querySelector(CARD));

  function enter(el, i, dist) {
    el.animate(
      [{ opacity: 0, transform: `translateY(${dist}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 450, delay: Math.min(i, 8) * 40, easing: EASE, fill: 'backwards' }
    );
  }

  // Off-screen cards reveal once on first scroll into view.
  const io = new IntersectionObserver((entries) => {
    let i = 0;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      enter(e.target, i++, 8);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  function stagger(scope) {
    const els = leaves([...scope.querySelectorAll(CARD)])
      .filter((el) => visible(el) && !hasOwnAnim(el) && !el.closest('.rh-reveal, .rio'));
    const vh = window.innerHeight;
    let i = 0;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) enter(el, i++, 8);
      else io.observe(el);
    });
  }

  /* Section switches (admin showSection / dashboards switchTab toggle .active) */
  function onSectionShown(sec) {
    sec.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 520, easing: EASE }
    );
    stagger(sec);
  }

  /* Newly rendered rows/cards (fetch -> innerHTML). Pages that poll re-render
     identical rows; key on text so only genuinely new items animate. */
  const seen = new Set();
  const key = (el) => el.textContent.replace(/\s+/g, ' ').trim().slice(0, 160);
  function onAdded(nodes) {
    const rows = [], cards = [];
    nodes.forEach((n) => {
      if (n.nodeType !== 1 || n.closest('.rio') || n.classList.contains('rh-skel')) return;
      if (n.matches('tr') && n.closest('tbody')) rows.push(n);
      else n.querySelectorAll && n.querySelectorAll('tbody tr').forEach((r) => rows.push(r));
      if (n.matches(CARD)) cards.push(n);
      n.querySelectorAll && n.querySelectorAll(CARD).forEach((c) => cards.push(c));
    });
    let i = 0;
    rows.forEach((r) => {
      const k = key(r);
      if (seen.has(k)) return;
      seen.add(k);
      if (!visible(r) || i > 14) return;
      r.animate([{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 480, delay: i++ * 30, easing: EASE, fill: 'backwards' });
    });
    i = 0;
    leaves(cards).forEach((c) => {
      const k = key(c);
      if (seen.has(k) || hasOwnAnim(c)) return;
      seen.add(k);
      if (visible(c)) enter(c, i++, 12);
    });
    if (seen.size > 2000) seen.clear();
  }

  /* Count-up for dashboard metrics. Tweens only the leading text node,
     so trailing markup like <small>Tons</small> is preserved. */
  const METRIC = '.metric-val, .stat-val, .stat-value';
  const NUM = /^(\s*[^\d\s-]*\s*)(-?[\d,]*\.?\d+)([\s\S]*)$/;
  const tweens = new WeakMap();
  function countUp(el) {
    const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.data.trim());
    if (!tn) return;
    const m = tn.data.match(NUM);
    if (!m) return;
    const raw = m[2], to = parseFloat(raw.replace(/,/g, ''));
    if (!isFinite(to) || to === 0) return;
    const dec = (raw.split('.')[1] || '').length;
    const locale = /^\d{1,2}(,\d{2})+,\d{3}/.test(raw) ? 'en-IN' : 'en-US';
    const fmt = (v) => raw.includes(',')
      ? v.toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : v.toFixed(dec);
    const from = tweens.get(el) || 0, t0 = performance.now(), dur = 900;
    tweens.set(el, to);
    (function step(now) {
      if (tweens.get(el) !== to || !tn.isConnected) return; // superseded by a newer write
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      tn.data = m[1] + fmt(from + (to - from) * e) + m[3];
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* Press feedback on all buttons. Uses the independent `scale` property so it
     composes with whatever transform the page applies on hover. */
  const PRESS = 'button, .btn, [role="button"], .nav-btn, .nav-link, .filter-pill, .tab-btn, .chip, input[type="submit"]';
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest(PRESS);
    if (!b || b.disabled || b.closest('.rio')) return;
    b.animate([{ scale: 1 }, { scale: 0.98 }], { duration: 120, easing: 'ease-out', fill: 'forwards' });
    const up = () => {
      b.getAnimations().forEach((a) => a.effect && a.effect.getKeyframes().some((k) => 'scale' in k) && a.cancel());
      b.animate([{ scale: 0.98 }, { scale: 1 }], { duration: 200, easing: EASE });
    };
    b.addEventListener('pointerup', up, { once: true });
    b.addEventListener('pointerleave', up, { once: true });
  }, { passive: true });


  /* Sliding active indicator (Framer layoutId-style): one pill per nav
     group glides between items instead of the highlight blinking across. */
  const NAV = '.nav-btn, .nav-link, .tab-btn';
  const hosts = new Map(); // host -> indicator
  function setupNav() {
    const groups = new Map();
    document.querySelectorAll(NAV).forEach((el) => {
      if (el.closest('.rio, .rh-cmdk')) return;
      const h = el.parentElement;
      groups.set(h, (groups.get(h) || []).concat(el));
    });
    groups.forEach((els, host) => {
      if (els.length < 2 || hosts.has(host)) return;
      host.classList.add('rh-ind-host');
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      els.forEach((el) => el.classList.add('rh-ind-item'));
      const ind = document.createElement('i');
      ind.className = 'rh-ind';
      ind.setAttribute('aria-hidden', 'true');
      host.insertBefore(ind, host.firstChild);
      hosts.set(host, ind);
      place(host, false);
    });
  }
  function place(host, animate) {
    const ind = hosts.get(host);
    const a = host.querySelector(':scope > .rh-ind-item.active');
    if (!a || !a.offsetWidth) { ind.style.opacity = '0'; return; }
    const items = host.querySelectorAll(':scope > .rh-ind-item');
    ind.classList.toggle('h', items.length > 1 && items[0].offsetTop === items[1].offsetTop);
    const was = ind.style.opacity === '1';
    ind.style.transition = animate && was
      ? `transform .3s ${EASE}, width .3s ${EASE}, height .3s ${EASE}` : 'opacity .2s ease';
    ind.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
    ind.style.width = a.offsetWidth + 'px';
    ind.style.height = a.offsetHeight + 'px';
    ind.style.opacity = '1';
  }
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => hosts.forEach((_, h) => place(h, false)), 120); });

  const SKIP = '.rio, .rh-cmdk, [data-rh-static], .rv';

  /* Headline reveal (Framer-style): each word of an h1 rises out of a blur in
     sequence. Text nodes are split in place, so child markup (spans, <br>) and
     textContent are preserved. Skipped for gradient text: background-clip:text
     does not paint into transformed inline-block children. */
  function words(h) {
    if (h.dataset.rhWords || h.closest(SKIP) || !visible(h) || hasOwnAnim(h)) return;
    const clipped = (el) => /text/.test(getComputedStyle(el).backgroundClip || getComputedStyle(el).webkitBackgroundClip || '');
    if (clipped(h) || [...h.querySelectorAll('*')].some(clipped)) return;
    h.dataset.rhWords = '1';
    const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
    let i = 0;
    nodes.forEach((tn) => {
      const parts = tn.data.split(/(\s+)/);
      if (parts.every((p) => !p.trim())) return;
      const frag = document.createDocumentFragment();
      parts.forEach((p) => {
        if (!p.trim()) { if (p) frag.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement('span');
        s.className = 'rh-w'; s.textContent = p; s.style.setProperty('--w', i++);
        frag.appendChild(s);
      });
      tn.replaceWith(frag);
    });
  }

  /* Cursor spotlight: a soft glow follows the pointer across cards. Painted as a
     background-image layer, so only cards with no background image of their own
     get it (never clobbers a page gradient); no DOM or position changes. */
  const SPOT_SEL = CARD + ', .rh-spot';
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !e.target.closest) return;
    const c = e.target.closest(SPOT_SEL);
    if (!c || c.closest(SKIP)) return;
    if (!c.classList.contains('rh-spot-on')) {
      if (c.__rhNoSpot || getComputedStyle(c).backgroundImage !== 'none') { c.__rhNoSpot = true; return; }
      c.classList.add('rh-spot-on');
    }
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  function init() {
    document.querySelectorAll('h1').forEach(words);
    stagger(document.body);
    setupNav();
    document.querySelectorAll(METRIC).forEach(countUp);

    new MutationObserver((muts) => {
      const added = [];
      muts.forEach((m) => {
        if (m.type === 'attributes') {
          const el = m.target;
          if (el.classList.contains('rh-ind-item') && hosts.has(el.parentElement)) place(el.parentElement, true);
          if (el.matches(SECTION) && el.classList.contains('active') && !(m.oldValue || '').split(/\s+/).includes('active')) onSectionShown(el);
          return;
        }
        const metric = m.target.nodeType === 1 && m.target.closest(METRIC);
        if (metric) { countUp(metric); return; }
        m.addedNodes.forEach((n) => added.push(n));
      });
      if (added.length) onAdded(added);
    }).observe(document.body, {
      subtree: true, childList: true,
      attributes: true, attributeFilter: ['class'], attributeOldValue: true,
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
