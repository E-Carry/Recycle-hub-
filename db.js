// Permanent store: one SQLite file (node:sqlite, no extra dependency).
// Each collection is a list of JSON records kept in order; every save is one
// transaction, so a crash mid-write leaves the previous state intact.
// On first open, legacy data/users.json + admin-data.json are imported once.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const USERS = '@users'; // reserved name, cannot clash with an admin-data key

function open(file, legacyDir) {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS rows (coll TEXT NOT NULL, pos INTEGER NOT NULL, body TEXT NOT NULL,
      PRIMARY KEY (coll, pos)) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS colls (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);`);
  const sel = db.prepare('SELECT coll, body FROM rows ORDER BY coll, pos');
  const selColl = db.prepare('SELECT body FROM rows WHERE coll = ? ORDER BY pos');
  const ins = db.prepare('INSERT INTO rows (coll, pos, body) VALUES (?, ?, ?)');
  const delColl = db.prepare('DELETE FROM rows WHERE coll = ?');
  const delAdmin = db.prepare('DELETE FROM rows WHERE coll <> ?');
  const delNames = db.prepare('DELETE FROM colls');
  const addName = db.prepare('INSERT INTO colls (name) VALUES (?)');
  const names = db.prepare('SELECT name FROM colls ORDER BY rowid');

  const tx = (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try { fn(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
  };
  const put = (coll, list) => {
    if (!Array.isArray(list)) throw new Error(`db: collection "${coll}" must be an array`);
    list.forEach((r, i) => ins.run(coll, i, JSON.stringify(r)));
  };
  const writeUsers = (list) => { delColl.run(USERS); put(USERS, list); };
  const writeAdmin = (data) => {
    delAdmin.run(USERS);
    delNames.run();
    for (const [k, v] of Object.entries(data)) { addName.run(k); put(k, v); }
  };

  if (!db.prepare("SELECT 1 FROM meta WHERE k = 'imported'").get()) {
    const read = (name) => {
      const f = path.join(legacyDir, name);
      if (!fs.existsSync(f)) return null;
      try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { throw new Error(`db: cannot import ${f}: bad JSON (${e.message})`); }
    };
    const users = read('users.json'), admin = read('admin-data.json');
    tx(() => {
      if (users) writeUsers(users);
      if (admin) writeAdmin(admin);
      db.prepare("INSERT INTO meta (k, v) VALUES ('imported', ?)").run(new Date().toISOString());
    });
  }

  return {
    users: () => selColl.all(USERS).map((r) => JSON.parse(r.body)),
    admin: () => {
      const out = {};
      for (const { name } of names.all()) out[name] = [];
      for (const r of sel.all()) if (r.coll !== USERS) out[r.coll].push(JSON.parse(r.body));
      return out;
    },
    saveUsers: (list) => tx(() => writeUsers(list)),
    saveAdmin: (data) => tx(() => writeAdmin(data)),
    close: () => db.close(),
  };
}

module.exports = { open };
