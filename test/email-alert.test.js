// Rio must not claim an incident email was delivered unless the relay confirmed it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(__dirname + '/../public/rio/email-alert.js', 'utf8');

const load = (fetch) => {
  const store = {};
  const ctx = { window: {}, navigator: { userAgent: 'test' }, location: { href: 'http://t/' }, console: { error() {}, log() {} }, fetch,
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } };
  vm.runInNewContext(src, ctx);
  return ctx.window.rioEmailAlerts;
};
const issue = { userQuery: 'my pickup never came', category: 'Pickup', severity: 'HIGH', triggerKeywords: ['never came'] };
const reply = (status, body) => async () => ({ ok: status < 300, status, json: async () => body });

test('relay confirms -> delivered', async () => {
  const r = await load(reply(200, { success: 'true' })).dispatchAlert(issue);
  assert.equal(r.payload.delivered, true);
});
test('relay says not activated -> not delivered', async () => {
  const r = await load(reply(200, { success: 'false', message: 'needs activation' })).dispatchAlert(issue);
  assert.equal(r.payload.delivered, false);
  assert.match(r.payload.status, /FAILED/);
});
test('HTTP error -> not delivered', async () => {
  const r = await load(reply(500, {})).dispatchAlert(issue);
  assert.equal(r.payload.delivered, false);
});
test('network error -> not delivered, no SENT claim', async () => {
  const r = await load(async () => { throw new Error('offline'); }).dispatchAlert(issue);
  assert.equal(r.payload.delivered, false);
  assert.doesNotMatch(r.payload.status, /SENT/);
});
