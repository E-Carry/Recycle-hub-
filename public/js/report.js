// Pure helpers for partner analytics and exports. Loaded in the browser as
// window.rhReport and in Node for tests.
(function () {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Excel/Sheets run cells starting with = + - @ as formulas; prefix a quote.
  function cell(v) {
    if (v == null) return '';
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // cols: [[header, key | (row) => value], ...]
  function csv(rows, cols) {
    const get = (r, k) => (typeof k === 'function' ? k(r) : r[k]);
    return [cols.map((c) => cell(c[0])).join(',')]
      .concat(rows.map((r) => cols.map((c) => cell(get(r, c[1]))).join(',')))
      .join('\r\n');
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Sum value(r) per UTC month for the n months ending at `now`, oldest first.
  function monthly(recs, date, value, n, now) {
    now = now || new Date();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
      out.push({ key, label: MONTHS[d.getUTCMonth()], v: 0 });
    }
    const at = new Map(out.map((m) => [m.key, m]));
    for (const r of recs) {
      const t = Date.parse(date(r));
      if (!t) continue;
      const d = new Date(t);
      const m = at.get(d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'));
      if (m) m.v += Number(value(r)) || 0;
    }
    return out;
  }

  // Inline SVG bar chart. Colour comes from CSS (currentColor) so it themes.
  function bars(pts, fmt) {
    fmt = fmt || ((v) => String(Math.round(v * 100) / 100));
    const W = 520, H = 150, pad = 20, gap = 14;
    const max = Math.max(1e-9, ...pts.map((p) => p.v));
    const bw = (W - gap * (pts.length - 1)) / pts.length;
    const body = pts.map((p, i) => {
      const h = p.v > 0 ? Math.max(2, (p.v / max) * (H - pad - 4)) : 0;
      const x = i * (bw + gap), y = H - pad - h;
      return `<g><title>${esc(p.label)}: ${esc(fmt(p.v))}</title>` +
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="currentColor" opacity="${i === pts.length - 1 ? 1 : 0.55}"/>` +
        `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#64748b">${esc(p.label)}</text></g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly chart">` +
      `<line x1="0" y1="${H - pad}" x2="${W}" y2="${H - pad}" stroke="#e2e8f0"/>${body}</svg>`;
  }

  const api = { csv, monthly, bars, esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.rhReport = api;
})();
