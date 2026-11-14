/* ══════════════════════════════════════════════════════════════
   RECYCLE HUB — fx layer (dark aurora)
   Injects the aurora background, cursor spotlight, scroll progress and
   page-transition curtain on every page, and drives opt-in effects:
     [data-split]   headline words rise in one by one
     [data-reveal]  fade/blur up when scrolled into view (data-d = delay ms)
     [data-count]   number ticks up when visible (data-dec = decimals)
     [data-tilt]    3D tilt toward the pointer
     [data-marquee] children duplicated for a seamless CSS loop
   Cards (.card, .stat-card, … , [data-glow]) get a border glow that
   follows the pointer. Pure helpers are exported for node tests.
   ══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function splitWords(text) {
    let i = 0;
    return text.trim().split(/(\s+)/).filter(Boolean)
      .map((s) => (/^\s+$/.test(s) ? ' ' : { w: s, i: i++ }));
  }

  function countFrame(target, t, dec) {
    const e = 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
    return (target * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function tiltAngles(x, y, w, h, max) {
    return { rx: (0.5 - y / h) * 2 * max + 0, ry: (x / w - 0.5) * 2 * max + 0 };
  }

  function progress(scrollY, scrollH, viewH) {
    const range = scrollH - viewH;
    return range <= 0 ? 0 : Math.min(Math.max(scrollY / range, 0), 1);
  }

  const api = { splitWords, countFrame, tiltAngles, progress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined' || root.__axFx) return;
  root.__axFx = api;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const docEl = document.documentElement;

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }

  function chrome() {
    if (document.querySelector('.ax-sky')) return;
    document.body.prepend(
      el('div', 'ax-sky', '<div class="ax-blob b1"></div><div class="ax-blob b2"></div><div class="ax-blob b3"></div><div class="ax-grid"></div><div class="ax-noise"></div>'),
      el('div', 'ax-spot'),
      el('div', 'ax-progress'),
      el('div', 'ax-curtain'),
    );
  }

  /* One rAF-batched writer for pointer + scroll driven CSS variables. */
  let px = -999, py = -999, queued = false;
  function flush() {
    queued = false;
    docEl.style.setProperty('--sx', px + 'px');
    docEl.style.setProperty('--sy', py + 'px');
    docEl.style.setProperty('--p', progress(scrollY, docEl.scrollHeight, innerHeight).toFixed(4));
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(flush); } }

  function split(node) {
    const out = document.createDocumentFragment();
    let k = 0;
    const word = (child) => {
      const w = el('span', 'ax-w'), i = document.createElement('i');
      i.style.setProperty('--i', k++);
      i.append(child);
      w.append(i);
      return w;
    };
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const t = c.textContent;
        if (/^\s/.test(t) && out.childNodes.length) out.append(' ');
        splitWords(t).forEach((p) => out.append(p === ' ' ? ' ' : word(document.createTextNode(p.w))));
        if (/\S\s+$/.test(t)) out.append(' ');
      } else if (c.nodeName === 'BR') {
        out.append(c);
      } else {
        out.append(word(c)); // spacing comes from the neighbouring text nodes
      }
    });
    node.replaceChildren(out);
    node.setAttribute('aria-label', node.textContent.replace(/\s+/g, ' ').trim());
  }

  function count(n) {
    const target = parseFloat(n.dataset.count), dec = +(n.dataset.dec || 0);
    if (reduce) { n.textContent = countFrame(target, 1, dec); return; }
    const t0 = performance.now(), dur = 1800;
    const step = (now) => {
      const t = (now - t0) / dur;
      n.textContent = countFrame(target, t, dec);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function observe() {
    const targets = document.querySelectorAll('[data-split], [data-reveal], [data-count]');
    const show = (n) => {
      n.classList.add('ax-in');
      if (n.dataset.count && !n.dataset.counted) { n.dataset.counted = '1'; count(n); }
    };
    if (reduce || !('IntersectionObserver' in root)) { targets.forEach(show); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((n) => {
      if (n.dataset.d) n.style.setProperty('--d', n.dataset.d);
      io.observe(n);
    });
  }

  const GLOW = '.card, .stat-card, .metric-card, .section-card, .glass-panel, .rh-glass, .step-card, .store-card, .product-card, [data-glow]';
  function glowFor(t) {
    const host = t.closest && t.closest(GLOW);
    if (!host) return null;
    let g = host.querySelector(':scope > .ax-glow');
    if (!g) {
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      g = el('span', 'ax-glow');
      host.append(g);
    }
    return { host, g };
  }

  function pointerFx() {
    let cur = null;
    document.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY; queue();
      const hit = glowFor(e.target);
      if (cur && (!hit || hit.host !== cur.host)) cur.g.classList.remove('on');
      cur = hit;
      if (hit) {
        const r = hit.host.getBoundingClientRect();
        hit.g.style.setProperty('--mx', e.clientX - r.left + 'px');
        hit.g.style.setProperty('--my', e.clientY - r.top + 'px');
        hit.g.classList.add('on');
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { if (cur) cur.g.classList.remove('on'); cur = null; });

    document.querySelectorAll('[data-tilt]').forEach((n) => {
      const max = +(n.dataset.tilt || 8);
      n.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
      n.addEventListener('pointermove', (e) => {
        const r = n.getBoundingClientRect(), a = tiltAngles(e.clientX - r.left, e.clientY - r.top, r.width, r.height, max);
        n.style.transition = 'transform .12s linear';
        n.style.transform = `perspective(900px) rotateX(${a.rx}deg) rotateY(${a.ry}deg) translateZ(0)`;
      });
      n.addEventListener('pointerleave', () => {
        n.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
        n.style.transform = '';
      });
    });
  }

  function transitions() {
    const curtain = document.querySelector('.ax-curtain');
    addEventListener('pageshow', () => curtain.classList.remove('on'));
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // hash / same page
      e.preventDefault();
      curtain.classList.add('on');
      setTimeout(() => { location.href = url.href; }, 260);
    });
  }

  function marquee() {
    document.querySelectorAll('[data-marquee]').forEach((m) => {
      [...m.children].forEach((c) => { const d = c.cloneNode(true); d.setAttribute('aria-hidden', 'true'); m.append(d); });
    });
  }

  function init() {
    chrome();
    document.querySelectorAll('[data-split]').forEach(split);
    marquee();
    observe();
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    queue();
    if (finePointer && !reduce) pointerFx();
    if (!reduce) transitions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
