const test = require('node:test');
const assert = require('node:assert');
const { csv, monthly, bars } = require('../public/js/report.js');

test('csv: header row, quoting of commas/quotes/newlines, CRLF rows', () => {
  const out = csv([{ a: 'x,y', b: 'say "hi"' }, { a: 'l1\nl2', b: 3 }], [['A', 'a'], ['B', (r) => r.b]]);
  assert.strictEqual(out, 'A,B\r\n"x,y","say ""hi"""\r\n"l1\nl2",3');
});

test('csv: spreadsheet formula injection is defused for strings, not numbers', () => {
  const out = csv([{ s: '=HYPERLINK("x")', n: -5, m: '-2+3' }], [['s', 's'], ['n', 'n'], ['m', 'm']]);
  assert.strictEqual(out.split('\r\n')[1], `"'=HYPERLINK(""x"")",-5,'-2+3`);
});

test('csv: null/undefined become empty cells', () => {
  assert.strictEqual(csv([{}], [['a', 'a']]), 'a\r\n');
});

test('monthly: last n months including empty ones, oldest first, sums values', () => {
  const recs = [
    { t: '2026-09-03T10:00:00Z', v: 2 }, { t: '2026-09-20T10:00:00Z', v: 3 },
    { t: '2026-07-01T10:00:00Z', v: 1 }, { t: '2025-01-01T00:00:00Z', v: 99 }, { t: 'junk', v: 50 },
  ];
  const m = monthly(recs, (r) => r.t, (r) => r.v, 3, new Date('2026-09-15T00:00:00Z'));
  assert.deepStrictEqual(m.map((x) => [x.key, x.v]), [['2026-07', 1], ['2026-08', 0], ['2026-09', 5]]);
  assert.strictEqual(m[2].label, 'Sep');
});

test('monthly: crosses year boundary', () => {
  const m = monthly([], (r) => r.t, () => 1, 3, new Date('2026-01-10T00:00:00Z'));
  assert.deepStrictEqual(m.map((x) => x.key), ['2025-11', '2025-12', '2026-01']);
});

test('bars: one rect per point, all-zero series does not divide by zero', () => {
  const s = bars([{ label: 'A', v: 0 }, { label: 'B', v: 0 }]);
  assert.strictEqual((s.match(/<rect/g) || []).length, 2);
  assert.ok(!/NaN|Infinity/.test(s));
  const t = bars([{ label: 'A', v: 1 }, { label: '<B>', v: 4 }]);
  assert.ok(!t.includes('<B>'), 'labels escaped');
});
