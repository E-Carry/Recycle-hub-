// Password hashing, signed session tokens, cookie parsing. No deps beyond node:crypto.
const crypto = require('crypto');

const hashPw = (pw) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(String(pw), salt, 32).toString('hex')}`;
};

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Stored values without the scrypt$ prefix are legacy plaintext: accepted once,
// flagged so the caller can rehash on successful login.
function checkPw(pw, stored) {
  if (!pw || !stored) return { ok: false, legacy: false };
  const p = String(stored).split('$');
  if (p[0] !== 'scrypt' || p.length !== 3) return { ok: same(pw, stored), legacy: true };
  return { ok: same(crypto.scryptSync(String(pw), p[1], 32).toString('hex'), p[2]), legacy: false };
}

const mac = (s, key) => crypto.createHmac('sha256', key).update(s).digest('base64url');

// Token: base64url(id).expiry.hmac
function sign(id, key, ttlSec) {
  const body = `${Buffer.from(String(id)).toString('base64url')}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${body}.${mac(body, key)}`;
}

function verify(tok, key) {
  const p = typeof tok === 'string' ? tok.split('.') : [];
  if (p.length !== 3) return null;
  const body = `${p[0]}.${p[1]}`;
  if (!same(mac(body, key), p[2]) || !(Number(p[1]) > Date.now() / 1000)) return null;
  return Buffer.from(p[0], 'base64url').toString();
}

const cookies = (h) => Object.fromEntries((h || '').split(';')
  .map((s) => s.trim()).filter(Boolean)
  .map((s) => { const i = s.indexOf('='); return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))]; }));

// Admin needs both the stored type AND the one configured admin email, so an account
// whose type somehow became 'admin' (DB edit, future bug) still gets no admin access.
const ROLES = ['sourcing', 'industrial'];
function roleOf(u, adminEmail) {
  const email = String(u.email || '').toLowerCase();
  if (u.type === 'admin') return email && email === String(adminEmail).toLowerCase() ? 'admin' : 'sourcing';
  return ROLES.includes(u.type) ? u.type : 'sourcing';
}

module.exports = { roleOf, hashPw, checkPw, sign, verify, cookies };
