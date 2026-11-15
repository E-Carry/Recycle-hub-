const test = require('node:test');
const assert = require('node:assert');
const { phase, impact, factor, round, certId, certHtml, FACTORS, SOURCE } = require('../public/js/impact.js');

const CAT = [
  { id: 'RMP-01', code: 'CU-W01', name: 'Copper wire', category: 'Metals' },
  { id: 'RMP-02', code: 'FE-HMS1', name: 'HMS steel', category: 'Metals' },
  { id: 'RMP-07', code: 'BAT-PB', name: 'Lead-acid batteries', category: 'Batteries' },
];
const pk = (o) => Object.assign({ id: 'P' + Math.random(), materialId: 'RMP-01', weightKg: 100, status: 'Completed', pickupDate: '2026-09-01' }, o);

test('phase: done / pending / void from server wording', () => {
  for (const s of ['Completed', 'Collected', 'Delivered', 'Paid', 'Settled', 'collected at yard']) assert.strictEqual(phase(s), 'done', s);
  for (const s of ['Vehicle Dispatched', 'Confirmed (Scheduled)', 'Pending Driver Assignment', 'En Route to Partner Location', '', undefined]) assert.strictEqual(phase(s), 'pending', String(s));
  // failure wording wins even when it also contains a "done" word
  for (const s of ['Cancelled', 'Delivery failed', 'Rejected at weighbridge', 'Not collected', 'Uncollected']) assert.strictEqual(phase(s), 'void', s);
});

test('factor: WARM short-ton value converted to kg CO2e per kg; unknown code is null', () => {
  assert.strictEqual(FACTORS['CU-W01'].t, 4.49);
  assert.ok(Math.abs(factor('CU-W01') - 4.49 * 1000 / 907.18474) < 1e-12);
  assert.strictEqual(factor('BAT-PB'), null);
  assert.strictEqual(factor(undefined), null);
  for (const f of Object.values(FACTORS)) assert.ok(f.warm && f.ref && f.t > 0, 'every factor carries its WARM row and exhibit');
  assert.ok(/^https:\/\//.test(SOURCE.url) && SOURCE.year === 2023);
});

test('impact: only done pickups count toward kg and CO2e; pending reported apart; void ignored', () => {
  const r = impact([
    pk({ weightKg: 100 }),
    pk({ weightKg: 50, status: 'Vehicle Dispatched' }),
    pk({ weightKg: 70, status: 'Cancelled' }),
  ], CAT);
  assert.strictEqual(r.done.kg, 100);
  assert.strictEqual(r.done.n, 1);
  assert.deepStrictEqual(r.pending, { kg: 50, n: 1 });
  assert.strictEqual(r.co2, round(100 * factor('CU-W01'), 1));
});

test('impact: aggregates per material, matched by catalogue id or code, sorted by kg desc', () => {
  const r = impact([
    pk({ weightKg: 10 }), pk({ weightKg: '15.5' }),
    pk({ materialId: 'FE-HMS1', weightKg: 40 }),
  ], CAT);
  assert.deepStrictEqual(r.rows.map((x) => [x.code, x.kg, x.n]), [['FE-HMS1', 40, 1], ['CU-W01', 25.5, 2]]);
  assert.strictEqual(r.rows[1].name, 'Copper wire');
  assert.strictEqual(r.rows[0].co2, round(40 * factor('FE-HMS1'), 1));
});

test('impact: unknown or unmapped materials are unrated, never given a factor', () => {
  const r = impact([
    pk({ weightKg: 20 }),
    pk({ materialId: 'RMP-07', weightKg: 30 }),
    pk({ materialId: 'RMP-99', materialName: 'Classified Scrap Material', weightKg: 5 }),
  ], CAT);
  const bat = r.rows.find((x) => x.code === 'BAT-PB');
  assert.strictEqual(bat.rated, false);
  assert.strictEqual(bat.co2, null);
  assert.strictEqual(bat.factor, null);
  const unk = r.rows.find((x) => x.name === 'Classified Scrap Material');
  assert.strictEqual(unk.code, null);
  assert.strictEqual(unk.rated, false);
  assert.strictEqual(r.unratedKg, 35);
  assert.strictEqual(r.ratedKg, 20);
  assert.strictEqual(r.done.kg, 55);
  assert.strictEqual(r.co2, round(20 * factor('CU-W01'), 1), 'CO2e covers rated weight only');
});

test('impact: bad weights are skipped and counted, not coerced', () => {
  const r = impact([pk({ weightKg: 'abc' }), pk({ weightKg: -4 }), pk({ weightKg: 0 }), pk({ weightKg: null }), pk({ weightKg: 1 })], CAT);
  assert.strictEqual(r.done.kg, 1);
  assert.strictEqual(r.skipped, 4);
});

test('impact: sums at full precision then rounds once', () => {
  const r = impact([pk({ weightKg: 0.1 }), pk({ weightKg: 0.2 })], CAT);
  assert.strictEqual(r.done.kg, 0.3);
  assert.strictEqual(r.rows[0].kg, 0.3);
  assert.strictEqual(round(1.005, 2), 1.01);
  assert.strictEqual(round(2.5, 0), 3);
});

test('impact: period spans done pickup dates; empty input is all zeros', () => {
  const r = impact([pk({ pickupDate: '2026-10-02' }), pk({ pickupDate: '2026-08-15' }), pk({ pickupDate: '2026-12-01', status: 'Vehicle Dispatched' })], CAT);
  assert.deepStrictEqual(r.period, { from: '2026-08-15', to: '2026-10-02' });
  const z = impact([], CAT);
  assert.deepStrictEqual([z.done.kg, z.co2, z.rows.length, z.period], [0, 0, 0, null]);
  assert.strictEqual(impact(undefined, undefined).done.kg, 0);
});

test('certId: deterministic, order-independent, changes with content', () => {
  const a = certId('a@x.in', ['P1', 'P2']);
  assert.match(a, /^RH-GC-[0-9A-F]{8}$/);
  assert.strictEqual(a, certId('A@X.in', ['P2', 'P1']));
  assert.notStrictEqual(a, certId('a@x.in', ['P1']));
  assert.notStrictEqual(a, certId('b@x.in', ['P1', 'P2']));
});

test('certHtml: escapes partner strings, shows unrated rows, cites the source', () => {
  const r = impact([pk({ weightKg: 20 }), pk({ materialId: 'RMP-07', weightKg: 30 })], CAT);
  const h = certHtml({ partner: '<b>Evil & Co</b>', email: 'e@x.in', id: 'RH-GC-0000ABCD', issued: '2026-11-15', impact: r });
  assert.ok(!h.includes('<b>Evil'), 'partner name escaped');
  assert.ok(h.includes('&lt;b&gt;Evil &amp; Co&lt;/b&gt;'));
  assert.ok(h.includes('RH-GC-0000ABCD'));
  assert.ok(h.includes('Not rated'));
  assert.ok(h.includes(SOURCE.url));
  assert.ok(/estimate/i.test(h));
});

test('round: survives exponent-notation inputs (float residue, huge values)', () => {
  assert.strictEqual(round(1.4e-14, 1), 0);
  assert.strictEqual(round(1e21, 1), 1e21);
  assert.strictEqual(round(-1.25, 1), -1.2);
  const r = impact([pk({ weightKg: 0.1 }), pk({ weightKg: 0.7 }), pk({ weightKg: 0.2 })], CAT);
  assert.strictEqual(r.unratedKg, 0);
});
