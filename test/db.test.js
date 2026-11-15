const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { open } = require('../db');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rhdb-'));

test('db: imports legacy JSON once, then the DB is the source of truth', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify([{ email: 'a@x.io', fullName: 'A' }]));
  fs.writeFileSync(path.join(dir, 'admin-data.json'), JSON.stringify({ store: [{ id: 'P1' }, { id: 'P2' }], auditLogs: [] }));
  const file = path.join(dir, 'rh.db');
  let db = open(file, dir);
  assert.deepStrictEqual(db.users(), [{ email: 'a@x.io', fullName: 'A' }]);
  assert.deepStrictEqual(db.admin(), { store: [{ id: 'P1' }, { id: 'P2' }], auditLogs: [] });
  // Later JSON edits are ignored: no re-import over live data.
  fs.writeFileSync(path.join(dir, 'users.json'), '[]');
  db.close();
  db = open(file, dir);
  assert.strictEqual(db.users().length, 1);
  db.close();
});

test('db: saves persist across reopen, order preserved, removals applied', () => {
  const dir = tmp(), file = path.join(dir, 'rh.db');
  let db = open(file, dir);
  assert.deepStrictEqual(db.users(), []);
  assert.deepStrictEqual(db.admin(), {});
  db.saveUsers([{ email: 'b@x.io' }, { email: 'a@x.io', prefs: { on: true } }]);
  db.saveAdmin({ store: [{ id: 'P2' }, { id: 'P1' }], transactions: [{ id: 'T' }] });
  db.saveAdmin({ store: [{ id: 'P2' }] }); // transactions key dropped
  db.close();
  db = open(file, dir);
  assert.deepStrictEqual(db.users(), [{ email: 'b@x.io' }, { email: 'a@x.io', prefs: { on: true } }]);
  assert.deepStrictEqual(db.admin(), { store: [{ id: 'P2' }] });
  db.close();
});

test('db: refuses non-array collections and corrupt legacy JSON instead of guessing', () => {
  const dir = tmp(), file = path.join(dir, 'rh.db');
  const db = open(file, dir);
  assert.throws(() => db.saveAdmin({ store: { id: 'x' } }), /array/);
  assert.throws(() => db.saveUsers({}), /array/);
  db.close();
  const bad = tmp();
  fs.writeFileSync(path.join(bad, 'users.json'), '{oops');
  assert.throws(() => open(path.join(bad, 'rh.db'), bad), /JSON/);
});

test('db: a failed save leaves previous data intact (transactional)', () => {
  const dir = tmp(), file = path.join(dir, 'rh.db');
  const db = open(file, dir);
  db.saveAdmin({ store: [{ id: 'P1' }] });
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => db.saveAdmin({ store: [{ id: 'P9' }], logs: [cyclic] }));
  assert.deepStrictEqual(db.admin(), { store: [{ id: 'P1' }] });
  db.close();
});
