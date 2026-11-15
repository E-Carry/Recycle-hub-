const test = require('node:test');
const assert = require('node:assert');
const { hashPw, checkPw, sign, verify, cookies } = require('../auth.js');

test('hashPw: salted scrypt, never the plaintext', () => {
  const a = hashPw('s3cret'), b = hashPw('s3cret');
  assert.match(a, /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
  assert.notStrictEqual(a, b);
  assert.ok(!a.includes('s3cret'));
});

test('checkPw: hashed match and mismatch', () => {
  const h = hashPw('pw1');
  assert.deepStrictEqual(checkPw('pw1', h), { ok: true, legacy: false });
  assert.strictEqual(checkPw('pw2', h).ok, false);
});

test('checkPw: legacy plaintext accepted but flagged for rehash', () => {
  assert.deepStrictEqual(checkPw('old', 'old'), { ok: true, legacy: true });
  assert.strictEqual(checkPw('nope', 'old').ok, false);
});

test('checkPw: missing stored password or input never matches', () => {
  assert.strictEqual(checkPw('', '').ok, false);
  assert.strictEqual(checkPw('x', undefined).ok, false);
  assert.strictEqual(checkPw(undefined, 'x').ok, false);
});

test('sign/verify: round trip returns the id', () => {
  const t = sign('u1', 'k', 60);
  assert.strictEqual(verify(t, 'k'), 'u1');
});

test('verify: rejects tampering, wrong key, expiry, junk', () => {
  const t = sign('u1', 'k', 60);
  const forged = Buffer.from('admin').toString('base64url') + t.slice(t.indexOf('.'));
  assert.strictEqual(verify(forged, 'k'), null);
  assert.strictEqual(verify(t, 'other'), null);
  assert.strictEqual(verify(sign('u1', 'k', -1), 'k'), null);
  assert.strictEqual(verify('garbage', 'k'), null);
  assert.strictEqual(verify(undefined, 'k'), null);
});

test('sign: ids containing dots survive the round trip', () => {
  assert.strictEqual(verify(sign('a.b@c.com', 'k', 60), 'k'), 'a.b@c.com');
});

test('cookies: parses header, decodes values', () => {
  assert.deepStrictEqual(cookies('a=1; rh_s=x%2Ey'), { a: '1', rh_s: 'x.y' });
  assert.deepStrictEqual(cookies(undefined), {});
});

test('roleOf: admin only for the configured admin email, whatever type is stored', () => {
  const { roleOf } = require('../auth.js');
  const A = 'boss@example.com';
  assert.strictEqual(roleOf({ email: 'Boss@Example.com', type: 'admin' }, A), 'admin');
  assert.strictEqual(roleOf({ email: 'eve@example.com', type: 'admin' }, A), 'sourcing');
  assert.strictEqual(roleOf({ email: 'ind@example.com', type: 'industrial' }, A), 'industrial');
  assert.strictEqual(roleOf({ email: 'x@example.com', type: 'weird' }, A), 'sourcing');
  assert.strictEqual(roleOf({ type: 'admin' }, A), 'sourcing');
  assert.strictEqual(roleOf({ email: A, type: 'sourcing' }, A), 'sourcing');
});
