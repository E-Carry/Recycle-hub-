// Account layer shared by the three dashboards: notification bell, account
// drawer (profile / security / preferences), partner analytics with CSV and
// printable statement, and the onboarding tour. Needs ux.js (rhMe, rhToast)
// and report.js (rhReport). Identity always comes from /api/me.
(function () {
  const R = window.rhReport;
  const esc = R.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const toast = (m, t) => window.rhToast(m, t);
  const ICON = {
    bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
    pickup: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/>',
    order: '<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 016 0"/>',
    audit: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
    welcome: '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>',
  };
  const svg = (p, s) => `<svg width="${s || 16}" height="${s || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

  async function api(method, url, body) {
    const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || data.message || 'Request failed (' + res.status + ')');
    return data;
  }

  const ago = (ts) => {
    const s = (Date.now() - Date.parse(ts)) / 1000;
    if (!(s >= 0)) return '';
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  };
  const money = (v) => '$' + (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const num = (v, d) => (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: d == null ? 1 : d });

  /* ── Notifications ────────────────────────────────────────── */
  function bell(host) {
    const wrap = document.createElement('div');
    wrap.className = 'rh-bell-wrap';
    wrap.innerHTML = `<button class="rh-bell" id="rh-bell" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">${svg(ICON.bell, 17)}<span class="rh-badge" hidden></span></button>
      <div class="rh-pop" role="dialog" aria-label="Notifications" hidden>
        <div class="rh-pop-h"><strong>Notifications</strong><button class="rh-link" data-read>Mark all read</button></div>
        <div class="rh-pop-list"><div class="rh-empty">Loading…</div></div>
      </div>`;
    host.prepend(wrap);
    const btn = $('.rh-bell', wrap), badge = $('.rh-badge', wrap), pop = $('.rh-pop', wrap), list = $('.rh-pop-list', wrap);
    let seen = 0;

    const render = (d) => {
      badge.hidden = !d.unread;
      badge.textContent = d.unread > 9 ? '9+' : d.unread;
      if (d.unread > seen && seen !== 0) btn.classList.add('ring');
      seen = d.unread;
      list.innerHTML = d.items.length ? d.items.map((n, i) => `
        <div class="rh-note${i < d.unread ? ' new' : ''}">
          <span class="rh-note-ic k-${esc(n.kind)}">${svg(ICON[n.kind] || ICON.audit, 15)}</span>
          <div><div class="rh-note-t">${esc(n.title)}</div><div class="rh-note-b">${esc(n.body)}</div><div class="rh-note-ts">${esc(ago(n.ts))}</div></div>
        </div>`).join('') : '<div class="rh-empty">You\'re all caught up.</div>';
    };
    const load = () => api('GET', '/api/notifications').then(render).catch(() => {});
    const markRead = () => api('POST', '/api/notifications/read').then(() => { badge.hidden = true; seen = 0; $$('.rh-note.new', list).forEach((e) => e.classList.remove('new')); }).catch((e) => toast(e.message, 'error'));
    const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };

    btn.onclick = (e) => {
      e.stopPropagation();
      btn.classList.remove('ring');
      const open = pop.hidden;
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) load();
    };
    $('[data-read]', wrap).onclick = markRead;
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    load();
    setInterval(() => { if (!document.hidden) load(); }, 60000);
  }

  /* ── Account drawer ───────────────────────────────────────── */
  function drawer(user, role, onUser) {
    const d = document.createElement('div');
    d.className = 'rh-drawer-bg';
    d.hidden = true;
    const p = user.prefs || {};
    const field = (k, label, extra) => `<label class="rh-f"><span>${label}</span><input name="${k}" value="${esc(user[k] || '')}" maxlength="120" ${extra || ''}></label>`;
    const pref = (k, t, s) => `<label class="rh-switch"><input type="checkbox" name="${k}" ${p[k] ? 'checked' : ''}><i></i><span><b>${t}</b><small>${s}</small></span></label>`;
    d.innerHTML = `<aside class="rh-drawer" role="dialog" aria-modal="true" aria-label="Account">
      <header class="rh-dr-h">
        <div class="rh-dr-ava">${esc((user.fullName || user.companyName || user.email || '?')[0].toUpperCase())}</div>
        <div class="rh-dr-id"><strong data-name>${esc(user.fullName || user.companyName || 'Your account')}</strong><small>${esc(user.email)}</small>
          <span class="rh-chip">${esc(role)}${user.partnerCode ? ' · ' + esc(user.partnerCode) : ''}</span></div>
        <button class="rh-x" aria-label="Close">&times;</button>
      </header>
      <nav class="rh-tabs" role="tablist">
        <button role="tab" aria-selected="true" data-tab="profile">Profile</button>
        <button role="tab" aria-selected="false" data-tab="security">Security</button>
        <button role="tab" aria-selected="false" data-tab="prefs">Preferences</button>
      </nav>
      <form class="rh-pane" data-pane="profile">
        ${field('fullName', 'Full name', 'autocomplete="name"')}
        ${field('companyName', 'Company', 'autocomplete="organization"')}
        ${field('designation', 'Designation')}
        ${field('mobile', 'Mobile', 'autocomplete="tel" inputmode="tel"')}
        <label class="rh-f"><span>Email</span><input value="${esc(user.email)}" disabled><small>Sign-in email can't be changed here. Contact support.</small></label>
        <button class="rh-btn">Save profile</button>
      </form>
      <form class="rh-pane" data-pane="security" hidden>
        <label class="rh-f"><span>Current password</span><input type="password" name="current" autocomplete="current-password" required></label>
        <label class="rh-f"><span>New password</span><input type="password" name="next" autocomplete="new-password" minlength="8" required><small>At least 8 characters.</small></label>
        <label class="rh-f"><span>Confirm new password</span><input type="password" name="confirm" autocomplete="new-password" required></label>
        <button class="rh-btn">Update password</button>
      </form>
      <form class="rh-pane" data-pane="prefs" hidden>
        ${pref('emailUpdates', 'Status emails', 'Pickup and order status changes')}
        ${pref('weeklyDigest', 'Weekly digest', 'Volumes, earnings and CO₂ summary')}
        ${pref('priceAlerts', 'Price alerts', 'When raw-material rates move')}
        <button class="rh-btn">Save preferences</button>
      </form>
      <footer class="rh-dr-f">
        <button class="rh-link" data-tour>Replay product tour</button>
        <a class="rh-link danger" href="/logout">Sign out</a>
      </footer>
    </aside>`;
    document.body.appendChild(d);
    const close = () => { d.classList.remove('open'); setTimeout(() => { d.hidden = true; }, 220); };
    const open = (tab) => { d.hidden = false; requestAnimationFrame(() => d.classList.add('open')); show(tab || 'profile'); };
    const show = (t) => {
      $$('[data-tab]', d).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
      $$('[data-pane]', d).forEach((f) => { f.hidden = f.dataset.pane !== t; });
      const first = $(`[data-pane="${t}"] input:not([disabled])`, d);
      if (first) first.focus();
    };
    $$('[data-tab]', d).forEach((b) => { b.onclick = () => show(b.dataset.tab); });
    $('.rh-x', d).onclick = close;
    d.onclick = (e) => { if (e.target === d) close(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !d.hidden) close(); });
    $('[data-tour]', d).onclick = () => { close(); setTimeout(() => tour(role, true), 250); };

    const busy = async (form, fn) => {
      const b = $('.rh-btn', form);
      b.disabled = true;
      try { await fn(); } catch (e) { toast(e.message, 'error'); } finally { b.disabled = false; }
    };
    $('[data-pane="profile"]', d).onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      busy(f, async () => {
        const body = {};
        for (const k of ['fullName', 'companyName', 'designation', 'mobile']) body[k] = f[k].value;
        const { user: u } = await api('PATCH', '/api/me', body);
        $('[data-name]', d).textContent = u.fullName || u.companyName || 'Your account';
        onUser(u);
        toast('Profile saved', 'success');
      });
    };
    $('[data-pane="security"]', d).onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.next.value !== f.confirm.value) return toast('New passwords do not match', 'error');
      busy(f, async () => {
        await api('POST', '/api/me/password', { current: f.current.value, next: f.next.value });
        f.reset();
        toast('Password updated', 'success');
      });
    };
    $('[data-pane="prefs"]', d).onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      busy(f, async () => {
        const prefs = {};
        for (const k of ['emailUpdates', 'weeklyDigest', 'priceAlerts']) prefs[k] = f[k].checked;
        await api('PATCH', '/api/me', { prefs });
        toast('Preferences saved', 'success');
      });
    };
    return open;
  }

  /* ── Analytics + exports ──────────────────────────────────── */
  // worldsteel's commonly cited figure: each tonne of steel scrap recycled
  // avoids about 1.5 t CO2. Shown as an estimate for all materials.
  const CO2_PER_KG = 1.5;

  const SPEC = {
    sourcing: {
      url: '/api/sourcing/pickups', key: 'pickups', date: (r) => r.createdAt, title: 'Pickup statement',
      kpis: (rs) => {
        const kg = rs.reduce((s, r) => s + (Number(r.weightKg) || 0), 0);
        return [['Material collected', num(kg, 0) + ' kg'], ['Net earnings', money(rs.reduce((s, r) => s + (Number(r.netPayout) || 0), 0))], ['CO₂ avoided (est.)', num(kg * CO2_PER_KG / 1000, 2) + ' t'], ['Pickups', rs.length]];
      },
      charts: [['Collected per month (kg)', (r) => r.weightKg, (v) => num(v, 0) + ' kg'], ['Net earnings per month', (r) => r.netPayout, money]],
      cols: [['Pickup ID', 'id'], ['Date', 'pickupDate'], ['Material', 'materialName'], ['Weight (kg)', 'weightKg'], ['Rate/kg (USD)', 'ratePerKg'], ['Gross (USD)', 'payoutGross'], ['CGST', 'cgst'], ['SGST', 'sgst'], ['IGST', 'igst'], ['Net payout (USD)', 'netPayout'], ['Bill no.', 'billNumber'], ['Status', 'status']],
      total: 'netPayout',
    },
    industrial: {
      url: '/api/industrial/orders', key: 'orders', date: (r) => r.orderedAt, title: 'Purchase statement',
      kpis: (rs) => {
        const t = rs.reduce((s, r) => s + (Number(r.quantityTons) || 0), 0);
        return [['Material procured', num(t) + ' t'], ['Total spend', money(rs.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0))], ['CO₂ avoided (est.)', num(t * CO2_PER_KG) + ' t'], ['Orders', rs.length]];
      },
      charts: [['Procured per month (t)', (r) => r.quantityTons, (v) => num(v) + ' t'], ['Spend per month', (r) => r.totalAmount, money]],
      cols: [['Order ID', 'id'], ['Ordered', 'orderedAt'], ['Material', 'materialName'], ['HSN', 'hsnCode'], ['Qty (t)', 'quantityTons'], ['Rate/t (USD)', 'ratePerTon'], ['Subtotal', 'subtotal'], ['CGST', 'cgst'], ['SGST', 'sgst'], ['IGST', 'igst'], ['Freight', 'freightCharge'], ['Total (USD)', 'totalAmount'], ['Invoice no.', 'invoiceNumber'], ['Payment', 'paymentStatus'], ['Delivery', 'deliveryStatus']],
      total: 'totalAmount',
    },
  };

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);

  // Print a statement by swapping in a print-only sheet; @media print hides the app.
  function printSheet(title, user, cols, rows, totalKey) {
    const sheet = document.createElement('div');
    sheet.className = 'rh-print';
    const total = rows.reduce((s, r) => s + (Number(r[totalKey]) || 0), 0);
    sheet.innerHTML = `<header><div><h1>Recycle Hub</h1><p>Recycle Hub Pvt. Ltd.</p></div>
        <div class="rh-print-meta"><h2>${esc(title)}</h2><p>${esc(user.companyName || user.fullName || '')}<br>${esc(user.email)}${user.partnerCode ? '<br>Partner ' + esc(user.partnerCode) : ''}<br>Issued ${esc(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))}</p></div></header>
      <table><thead><tr>${cols.map((c) => `<th>${esc(c[0])}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c[1]] == null ? '' : r[c[1]])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">No records.</td></tr>`}</tbody></table>
      <p class="rh-print-total">Total: <strong>${esc(money(total))}</strong> across ${rows.length} record${rows.length === 1 ? '' : 's'}</p>
      <footer>Computer-generated statement; GST invoices for each record are issued separately.</footer>`;
    document.body.appendChild(sheet);
    document.body.classList.add('rh-printing');
    const done = () => { document.body.classList.remove('rh-printing'); sheet.remove(); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    window.print();
  }

  async function analytics(user, role) {
    const spec = SPEC[role];
    if (!spec) return;
    const anchor = role === 'sourcing' ? $('#tab-dashboard') : $('#ordersSectionAnchor');
    if (!anchor) return;
    const card = document.createElement('section');
    card.className = 'rh-ana';
    card.id = 'rh-analytics';
    card.innerHTML = `<div class="rh-ana-h"><div><h2>Your impact & performance</h2><p>Last 6 months, from your own ${spec.key}.</p></div>
      <div class="rh-ana-act"><button class="rh-btn ghost" data-csv>${svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', 15)} Export CSV</button><button class="rh-btn ghost" data-print>${svg('<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>', 15)} Print statement</button></div></div>
      <div class="rh-kpis"><div class="rh-kpi sk"></div><div class="rh-kpi sk"></div><div class="rh-kpi sk"></div><div class="rh-kpi sk"></div></div>
      <div class="rh-charts"></div>`;
    if (role === 'sourcing') anchor.prepend(card); else anchor.before(card);

    let rows = [];
    try { rows = (await api('GET', spec.url))[spec.key] || []; } catch (e) { $('.rh-kpis', card).innerHTML = `<div class="rh-empty">${esc(e.message)}</div>`; return; }
    rows.sort((a, b) => Date.parse(spec.date(b)) - Date.parse(spec.date(a)));
    $('.rh-kpis', card).innerHTML = spec.kpis(rows).map(([k, v]) => `<div class="rh-kpi"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');
    $('.rh-charts', card).innerHTML = spec.charts.map(([t, val, fmt]) => {
      const m = R.monthly(rows, spec.date, val, 6);
      return `<figure class="rh-chart"><figcaption>${esc(t)}<b>${esc(fmt(m[m.length - 1].v))}</b><small>this month</small></figcaption>${R.bars(m, fmt)}${m.some((x) => x.v) ? '' : `<div class="rh-chart-empty">No ${spec.key} in the last 6 months yet.<br>Your first one will show up here.</div>`}</figure>`;
    }).join('');
    $('[data-csv]', card).onclick = () => {
      if (!rows.length) return toast('Nothing to export yet', 'info');
      download(`recyclehub-${spec.key}-${stamp()}.csv`, R.csv(rows, spec.cols));
      toast(`Exported ${rows.length} ${spec.key}`, 'success');
    };
    $('[data-print]', card).onclick = () => printSheet(spec.title, user, spec.cols.filter((c) => !/GST|Rate|HSN|Freight|Payment|Delivery|Subtotal|Gross/.test(c[0])), rows, spec.total);
  }

  // Admin: one-click CSV exports of every collection that matters to ops.
  async function adminExports() {
    const host = $('#sec-overview .sec-header');
    if (!host) return;
    const bar = document.createElement('div');
    bar.className = 'rh-ana-act';
    bar.id = 'rh-analytics';
    bar.innerHTML = ['pickups', 'orders', 'transactions', 'users'].map((k) => `<button class="rh-btn ghost" data-x="${k}">${svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', 14)} ${k[0].toUpperCase() + k.slice(1)} CSV</button>`).join('');
    host.appendChild(bar);
    const pick = { pickups: 'sourcingPickups', orders: 'industrialOrders', transactions: 'transactions', users: 'users' };
    bar.onclick = async (e) => {
      const b = e.target.closest('[data-x]');
      if (!b) return;
      try {
        const { data } = await api('GET', '/api/admin/data');
        const rows = data[pick[b.dataset.x]] || [];
        if (!rows.length) return toast('Nothing to export', 'info');
        const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => typeof rows.find((r) => r[k] != null)[k] !== 'object');
        download(`recyclehub-${b.dataset.x}-${stamp()}.csv`, R.csv(rows, keys.map((k) => [k, k])));
        toast(`Exported ${rows.length} ${b.dataset.x}`, 'success');
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  /* ── Onboarding tour ──────────────────────────────────────── */
  // Targets are selectors or functions; nav(i) is the i-th sidebar link, counting links only.
  const nav = (i) => () => $$('.sidebar .nav-link, .sidebar .nav-btn')[i - 1];
  const find = (t) => (typeof t === 'function' ? t() : $(t));
  const STEPS = {
    sourcing: [
      ['#rh-analytics', 'Your impact at a glance', 'Kilograms collected, net earnings and estimated CO₂ avoided, updated from your real pickups. Export them as CSV or print a statement.'],
      [nav(2), 'Schedule a pickup', 'Pick a material, weight and slot. An EV hauler is assigned and the GST bill is generated for you.'],
      [nav(3), 'Live rates', 'Today\'s per-kg rates for every material we buy.'],
      ['#rh-bell', 'Notifications', 'Status changes on your pickups land here.'],
      ['.partner-profile', 'Your account', 'Edit your profile, change your password, set email preferences, or replay this tour.'],
      ['.rio', 'Ask Rio', 'Rio answers questions about rates, pickups and payouts.'],
    ],
    industrial: [
      ['#tab-catalog', 'Procurement catalog', 'Browse certified secondary materials with live stock and per-ton pricing.'],
      ['#rh-analytics', 'Spend & impact', 'Tonnage procured, total spend and estimated CO₂ avoided. Export CSV for your ERP or print a purchase statement.'],
      [nav(3), 'Track deliveries', 'Follow your EV freight in real time.'],
      ['#rh-bell', 'Notifications', 'Order and delivery updates land here.'],
      ['.partner-profile', 'Your account', 'Profile, security and preferences; replay this tour from here any time.'],
    ],
    admin: [
      ['#overviewStats', 'Operations overview', 'Live revenue, volume and partner metrics.'],
      ['#rh-analytics', 'Exports', 'Download pickups, orders, transactions or users as CSV.'],
      ['.sidebar', 'Control centre', 'Store, deliveries, pickup slots, accounts, fleet and the audit log.'],
      ['#rh-bell', 'Activity feed', 'Every new pickup, order and audit entry across the platform.'],
      ['#adminAvatar', 'Your account', 'Security settings and this tour.'],
    ],
  };

  function tour(role, force) {
    const KEY = 'rh_tour_' + role;
    if (!force && localStorage.getItem(KEY)) return;
    const steps = (STEPS[role] || []).filter((s) => { const el = find(s[0]); return el && el.getClientRects().length; });
    if (!steps.length) return;
    const ring = document.createElement('div'); ring.className = 'rh-tour-ring';
    const tip = document.createElement('div'); tip.className = 'rh-tour-tip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-live', 'polite');
    const shade = document.createElement('div'); shade.className = 'rh-tour-shade';
    document.body.append(shade, ring, tip);
    let i = 0;
    const end = () => { localStorage.setItem(KEY, '1'); [shade, ring, tip].forEach((e) => e.remove()); removeEventListener('resize', place); document.removeEventListener('keydown', key); };
    const place = () => {
      const el = find(steps[i][0]);
      if (!el) return end();
      const r = el.getBoundingClientRect(), m = 6;
      Object.assign(ring.style, { top: r.top - m + 'px', left: r.left - m + 'px', width: r.width + 2 * m + 'px', height: Math.min(r.height, innerHeight - 40) + 2 * m + 'px' });
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let top = r.bottom + 14, left = Math.min(Math.max(12, r.left), innerWidth - tw - 12);
      if (top + th > innerHeight - 12) top = Math.max(12, r.top - th - 14);
      if (r.width < 120 && r.left < 260) { left = r.right + 16; top = Math.min(Math.max(12, r.top), innerHeight - th - 12); }
      Object.assign(tip.style, { top: top + 'px', left: left + 'px' });
    };
    const go = (n) => {
      i = n;
      const [sel, title, body] = steps[i];
      find(sel).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      tip.innerHTML = `<small>Step ${i + 1} of ${steps.length}</small><h3>${esc(title)}</h3><p>${esc(body)}</p>
        <div class="rh-tour-row"><button class="rh-link" data-skip>Skip tour</button><span>${i ? '<button class="rh-btn ghost" data-back>Back</button>' : ''}<button class="rh-btn" data-next>${i === steps.length - 1 ? 'Finish' : 'Next'}</button></span></div>`;
      $('[data-skip]', tip).onclick = end;
      $('[data-next]', tip).onclick = () => (i === steps.length - 1 ? end() : go(i + 1));
      if (i) $('[data-back]', tip).onclick = () => go(i - 1);
      setTimeout(place, 320);
      place();
      $('[data-next]', tip).focus();
    };
    const key = (e) => { if (e.key === 'Escape') end(); if (e.key === 'ArrowRight') $('[data-next]', tip).click(); if (e.key === 'ArrowLeft' && i) go(i - 1); };
    addEventListener('resize', place);
    document.addEventListener('keydown', key);
    shade.onclick = end;
    go(0);
  }
  window.rhTour = tour;

  /* ── Boot ─────────────────────────────────────────────────── */
  async function boot() {
    const user = await window.rhMe();
    const role = user.type;
    const host = $('.topbar-actions') || $('.topbar-right');
    if (!host) return;
    // The admin page shipped a decorative bell; the real one replaces it.
    const stale = $('.top-btn[title="Notifications"]', host);
    if (stale) stale.remove();
    bell(host);
    const profile = $('.partner-profile') || $('#adminAvatar');
    const open = drawer(user, role, (u) => {
      const name = $('#partnerDisplayName') || $('#partnerCompanyName');
      if (name) name.textContent = u.fullName || u.companyName || name.textContent;
    });
    if (profile) {
      profile.classList.add('rh-clickable');
      profile.setAttribute('role', 'button');
      profile.tabIndex = 0;
      profile.title = 'Account settings';
      profile.onclick = () => open();
      profile.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    }
    if (role === 'admin') await adminExports(); else await analytics(user, role);
    setTimeout(() => tour(role), 900);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
