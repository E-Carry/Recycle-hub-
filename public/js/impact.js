// Environmental impact of a sourcing partner's pickups: kg recycled, estimated
// CO2e avoided per material, and the printable green certificate.
// Loaded in the browser as window.rhImpact and in Node for tests.
(function () {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // US EPA Waste Reduction Model (WARM) v16, December 2023. `t` is WARM's
  // "Net Recycling Emissions" in MTCO2E per short ton, sign flipped (WARM
  // prints reductions as negatives). We use the recycling factor alone, not
  // recycling-minus-landfill, so no disposal baseline is assumed.
  //   CPND = "Documentation for GHG Emission and Energy Factors Used in WARM:
  //          Containers, Packaging, and Non-Durable Goods Materials",
  //          EPA-530-R-23-021, Dec 2023:
  //          https://www.epa.gov/system/files/documents/2023-12/warm_containers_packaging_and_non-durable_goods_materials_v16_dec.pdf
  //   ELEC = same series, "Electronics", EPA-530-R-23-022, Dec 2023:
  //          https://www.epa.gov/system/files/documents/2023-12/warm_electronics_v16_dec.pdf
  // Keys are catalogue codes (GET /api/raw-materials/prices). A code missing
  // here is "unrated": no CO2e is claimed for it.
  const CPND = 'https://www.epa.gov/system/files/documents/2023-12/warm_containers_packaging_and_non-durable_goods_materials_v16_dec.pdf';
  const ELEC = 'https://www.epa.gov/system/files/documents/2023-12/warm_electronics_v16_dec.pdf';
  const FACTORS = {
    // WARM "Copper Wire" (CPND Exhibit 2-7, 2023): 4.49
    'CU-W01': { t: 4.49, warm: 'Copper Wire', ref: 'Exhibit 2-7', url: CPND },
    // WARM "Steel Cans" (CPND Exhibit 2-7, 2023): 1.83. WARM's only steel
    // factor; used as a proxy for heavy melting steel scrap.
    'FE-HMS1': { t: 1.83, warm: 'Steel Cans (proxy for HMS)', ref: 'Exhibit 2-7', url: CPND },
    // WARM "Aluminum Ingot" (CPND Exhibit 2-7, 2023): 7.20. Closer to
    // extrusion scrap than "Aluminum Cans" (9.13).
    'AL-6063': { t: 7.2, warm: 'Aluminum Ingot', ref: 'Exhibit 2-7', url: CPND },
    // WARM "PET" (CPND Exhibit 5-3, 2023): 1.04
    'PET-CLR': { t: 1.04, warm: 'PET', ref: 'Exhibit 5-3', url: CPND },
    // WARM "Corrugated Containers" (CPND Exhibit 3-7, 2023): 3.14
    'PPR-OCC': { t: 3.14, warm: 'Corrugated Containers', ref: 'Exhibit 3-7', url: CPND },
    // WARM "Mixed Electronics" (ELEC Exhibit 1-5, 2023): 0.90. WARM rates
    // whole devices, not bare boards; mixed is the conservative choice.
    'EW-PCB': { t: 0.9, warm: 'Mixed Electronics', ref: 'Exhibit 1-5', url: ELEC },
    // BAT-PB (lead-acid batteries): WARM v16 has no factor -> unrated.
  };
  const SOURCE = { name: 'US EPA Waste Reduction Model (WARM) v16', year: 2023, url: 'https://www.epa.gov/waste-reduction-model', docs: [CPND, ELEC] };
  const KG_PER_SHORT_TON = 907.18474;

  function factor(code) {
    const f = code && Object.prototype.hasOwnProperty.call(FACTORS, code) ? FACTORS[code] : null;
    return f ? (f.t * 1000) / KG_PER_SHORT_TON : null;
  }

  // Same vocabulary as the page's statusTone, but failure wording wins so
  // "Delivery failed" or "Not collected" never counts as recycled.
  function phase(status) {
    const s = String(status || '').toLowerCase();
    if (/cancel|fail|reject|\bnot\b|\bun(collect|deliver)/.test(s)) return 'void';
    if (/deliver|complet|paid|settled|collected/.test(s)) return 'done';
    return 'pending';
  }

  // Shift the decimal exponent as text, so 1.005 -> 1.01 (not 1.00 from
  // binary drift); split first because String(1e-14) is already exponential.
  function round(x, d) {
    const [m, e] = String(x).split('e');
    const [m2, e2] = String(Math.round(Number(m + 'e' + (Number(e || 0) + d)))).split('e');
    return Number(m2 + 'e' + (Number(e2 || 0) - d));
  }

  function impact(pickups, catalogue) {
    const cat = catalogue || [];
    const groups = new Map();
    const done = { kg: 0, n: 0 }, pending = { kg: 0, n: 0 };
    let skipped = 0, co2 = 0, rated = 0, from = null, to = null;
    for (const p of pickups || []) {
      const kg = typeof p.weightKg === 'number' || typeof p.weightKg === 'string' ? Number(p.weightKg) : NaN;
      if (!(kg > 0) || !isFinite(kg)) { skipped++; continue; }
      const ph = phase(p.status);
      if (ph === 'pending') { pending.kg += kg; pending.n++; continue; }
      if (ph !== 'done') continue;
      done.kg += kg; done.n++;
      const d = String(p.pickupDate || '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { if (!from || d < from) from = d; if (!to || d > to) to = d; }
      const m = cat.find((c) => c.id === p.materialId || c.code === p.materialId);
      const code = m ? m.code : null;
      const name = (m && m.name) || p.materialName || 'Unknown material';
      const key = code || 'name:' + name;
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { code, name, kg: 0, n: 0, ids: [], factor: factor(code) }));
      g.kg += kg; g.n++; g.ids.push(p.id);
    }
    const rows = [...groups.values()].map((g) => {
      const c = g.factor == null ? null : g.kg * g.factor;
      if (c != null) { co2 += c; rated += g.kg; }
      return { code: g.code, name: g.name, kg: round(g.kg, 1), n: g.n, ids: g.ids, rated: c != null, factor: g.factor, co2: c == null ? null : round(c, 1), src: (g.code && FACTORS[g.code]) || null };
    }).sort((a, b) => b.kg - a.kg);
    return {
      done: { kg: round(done.kg, 1), n: done.n },
      pending: { kg: round(pending.kg, 1), n: pending.n },
      co2: round(co2, 1),
      ratedKg: round(rated, 1),
      unratedKg: round(Math.max(0, done.kg - rated), 1),
      skipped,
      rows,
      period: from ? { from, to } : null,
    };
  }

  // FNV-1a over the partner and the exact set of pickups certified, so the
  // same certificate re-issued later carries the same id.
  function certId(email, ids) {
    const s = String(email || '').trim().toLowerCase() + '|' + [...(ids || [])].map(String).sort().join(',');
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return 'RH-GC-' + h.toString(16).toUpperCase().padStart(8, '0');
  }

  const num = (v, d) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const day = (s) => { const d = new Date(String(s).slice(0, 10) + 'T00:00:00Z'); return isNaN(d) ? String(s || '') : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
  const kgOrT = (kg) => (kg >= 1000 ? num(kg / 1000, 2) + ' t' : num(kg, 1) + ' kg');

  // o: { partner, email, code, id, issued (YYYY-MM-DD), impact }
  function certHtml(o) {
    const r = o.impact;
    const period = r.period ? (r.period.from === r.period.to ? day(r.period.from) : day(r.period.from) + ' to ' + day(r.period.to)) : '-';
    const rows = r.rows.map((x) => `<tr><td>${esc(x.name)}${x.code ? `<small>${esc(x.code)}</small>` : ''}</td><td class="n">${num(x.kg, 1)}</td>` +
      (x.rated ? `<td class="n">${num(x.factor, 2)}</td><td class="n">${num(x.co2, 1)}</td>` : '<td class="n" colspan="2">Not rated</td>') + '</tr>').join('');
    const used = [...new Map(r.rows.filter((x) => x.src).map((x) => [x.code, x])).values()]
      .map((x) => `${esc(x.code)}: WARM "${esc(x.src.warm)}", ${esc(x.src.ref)}, ${num(x.src.t, 2)} MTCO2E/short ton`).join('; ');
    return `<article class="cert" aria-label="Green certificate">
  <div class="cert-band"><span class="cert-brand">Recycle Hub</span><span class="cert-id">${esc(o.id)}</span></div>
  <p class="cert-kicker">Green certificate</p>
  <h1 class="cert-title">Certificate of materials recycled</h1>
  <p class="cert-lede">This certifies that</p>
  <p class="cert-name">${esc(o.partner)}</p>
  <p class="cert-meta">${esc(o.email)}${o.code ? ' &middot; Partner ' + esc(o.code) : ''}</p>
  <p class="cert-lede">supplied the following materials for recycling through Recycle Hub, collected ${esc(period)}.</p>
  <div class="cert-totals">
    <div><small>Recycled</small><strong>${kgOrT(r.done.kg)}</strong><span>${r.done.n} completed pickup${r.done.n === 1 ? '' : 's'}</span></div>
    <div><small>CO&#8322;e avoided (estimate)</small><strong>${kgOrT(r.co2)}</strong><span>${r.unratedKg > 0 ? `covers ${num(r.ratedKg, 1)} of ${num(r.done.kg, 1)} kg; ${num(r.unratedKg, 1)} kg not rated` : 'covers all recycled weight'}</span></div>
  </div>
  <table class="cert-table"><thead><tr><th>Material</th><th class="n">kg</th><th class="n">kg CO&#8322;e / kg</th><th class="n">kg CO&#8322;e avoided</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="cert-foot">
    <div><small>Issued</small><strong>${esc(day(o.issued))}</strong></div>
    <div><small>Certificate id</small><strong>${esc(o.id)}</strong></div>
  </div>
  <p class="cert-note">CO&#8322;e figures are estimates from ${esc(SOURCE.name)} (${SOURCE.year}) net recycling emission factors, converted from metric tons CO&#8322;e per short ton to kg per kg (&times;1000/907.18). ${used ? 'Factors used: ' + used + '. ' : ''}Materials without a WARM factor are listed as not rated and excluded from the CO&#8322;e total. Source: ${esc(SOURCE.url)}. This statement is not a verified carbon credit or offset.</p>
</article>`;
  }

  const api = { phase, impact, factor, round, certId, certHtml, esc, FACTORS, SOURCE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.rhImpact = api;
})();
