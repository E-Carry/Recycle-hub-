const test = require('node:test');
const assert = require('node:assert');
const { collect, restore, fresh } = require('../public/js/draft.js');

const f = (id, value, extra = {}) => ({ id, value, type: 'text', tagName: 'INPUT', ...extra });

test('collect: keeps typed values, never secrets or files', () => {
  const got = collect([
    f('fullName', 'Priya'),
    f('password', 'Secret#1', { type: 'password' }),
    f('doc', 'C:\\fakepath\\gst.pdf', { type: 'file' }),
    f('token', 'x', { type: 'hidden' }),
    f('otp', '123456'),
    f('state', 'Kerala', { tagName: 'SELECT', type: 'select-one' }),
    f('empty', '  '),
  ], ['otp']);
  assert.deepStrictEqual(got, { fullName: 'Priya', state: 'Kerala' });
});

test('collect: checkboxes store checked state, fields without id are ignored', () => {
  const got = collect([f('same', 'on', { type: 'checkbox', checked: true }), f('', 'x')]);
  assert.deepStrictEqual(got, { same: true });
});

test('restore: fills matching editable fields and reports the count', () => {
  const name = f('fullName', ''), country = f('country', 'India', { readOnly: true }), pw = f('password', '', { type: 'password' });
  const box = f('same', 'on', { type: 'checkbox', checked: false });
  const n = restore([name, country, pw, box], { fullName: 'Priya', country: 'Nepal', password: 'leak', same: true, gone: 'x' });
  assert.strictEqual(n, 2);
  assert.strictEqual(name.value, 'Priya');
  assert.strictEqual(country.value, 'India');
  assert.strictEqual(pw.value, '');
  assert.strictEqual(box.checked, true);
});

test('fresh: drafts expire after 7 days and junk is rejected', () => {
  const now = Date.parse('2026-11-15T12:00:00Z');
  const ok = { t: now - 6 * 864e5, v: { a: '1' }, step: 2 };
  assert.deepStrictEqual(fresh(JSON.stringify(ok), now), ok);
  assert.strictEqual(fresh(JSON.stringify({ t: now - 8 * 864e5, v: { a: '1' } }), now), null);
  assert.strictEqual(fresh(JSON.stringify({ t: now, v: {} }), now), null);
  assert.strictEqual(fresh('{not json', now), null);
  assert.strictEqual(fresh(null, now), null);
});
