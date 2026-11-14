/* ══════════════════════════════════════════════════════════════
   RECYCLE HUB — fx layer (subtle)
     [data-reveal]  short fade-up when scrolled into view (data-d = delay ms)
     [data-count]   number ticks up when visible (data-dec = decimals)
     [data-marquee] children duplicated for a seamless CSS loop
   countFrame is exported for node tests.
   ══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function countFrame(target, t, dec) {
    const e = 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
    return (target * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  const api = { countFrame };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined' || root.__axFx) return;
  root.__axFx = api;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function count(n) {
    const target = parseFloat(n.dataset.count), dec = +(n.dataset.dec || 0);
    if (reduce) { n.textContent = countFrame(target, 1, dec); return; }
    const t0 = performance.now(), dur = 1400;
    const step = (now) => {
      const t = (now - t0) / dur;
      n.textContent = countFrame(target, t, dec);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function observe() {
    const targets = document.querySelectorAll('[data-reveal], [data-count], [data-split]');
    const show = (n) => {
      n.classList.add('ax-in');
      if (n.dataset.count && !n.dataset.counted) { n.dataset.counted = '1'; count(n); }
    };
    if (reduce || !('IntersectionObserver' in root)) { targets.forEach(show); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    targets.forEach((n) => {
      if (n.dataset.d) n.style.setProperty('--d', n.dataset.d);
      io.observe(n);
    });
  }

  function marquee() {
    document.querySelectorAll('[data-marquee]').forEach((m) => {
      [...m.children].forEach((c) => { const d = c.cloneNode(true); d.setAttribute('aria-hidden', 'true'); m.append(d); });
    });
  }

  function init() { marquee(); observe(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
