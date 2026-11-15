/* RECYCLE HUB -- light/dark theme. Load in <head> (not deferred) so the theme is set
   before first paint. Not loaded on index.html by design: the landing page stays light.
   Choice lives in localStorage 'rh-theme'; with no choice we follow the OS setting. */
(function () {
  const KEY = 'rh-theme';
  const pickTheme = (stored, prefersDark) =>
    stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
  const flip = t => (t === 'dark' ? 'light' : 'dark');

  if (typeof module !== 'undefined' && module.exports) { module.exports = { pickTheme, flip }; return; }

  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  // localStorage throws in some locked-down/private contexts; then we just follow the OS.
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { console.warn('rh-theme: storage unavailable', e); return null; } };
  const save = t => { try { localStorage.setItem(KEY, t); } catch (e) { console.warn('rh-theme: storage unavailable', e); } };

  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  let btn = null;
  function apply(t) {
    root.dataset.theme = t;
    if (!btn) return;
    const dark = t === 'dark';
    btn.innerHTML = dark ? SUN : MOON;
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = btn.getAttribute('aria-label');
  }
  apply(pickTheme(read(), mq.matches));
  mq.addEventListener('change', e => { if (!read()) apply(pickTheme(null, e.matches)); });

  function mount() {
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'rh-theme-btn';
    btn.onclick = () => { const t = flip(root.dataset.theme); save(t); apply(t); };
    const bar = document.querySelector('.topbar-actions, .topbar-right');
    const nav = document.querySelector('.nav-actions'); // sticky headers on terms / register-industrial
    if (bar) bar.insertBefore(btn, bar.firstChild);
    else if (nav) nav.appendChild(btn);
    else { btn.classList.add('fab'); document.body.appendChild(btn); }
    apply(root.dataset.theme);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
