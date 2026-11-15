const test = require('node:test');
const assert = require('node:assert');
const { feed, unread } = require('../notes.js');

const data = {
  sourcingPickups: [
    { id: 'P1', partnerEmail: 'a@x.com', weightKg: 10, materialName: 'Steel', status: 'Vehicle Dispatched', createdAt: '2026-01-02T00:00:00Z' },
    { id: 'P2', partnerEmail: 'B@x.com', weightKg: 5, materialName: 'Copper', status: 'Completed', createdAt: '2026-01-03T00:00:00Z' },
  ],
  industrialOrders: [
    { id: 'O1', partnerUid: 'IND-1', quantityTons: 2, materialName: 'Ingot', deliveryStatus: 'In Transit', orderedAt: '2026-01-04T00:00:00Z' },
    { id: 'O2', partnerUid: 'IND-2', quantityTons: 3, materialName: 'Pellet', deliveryStatus: 'Queued', orderedAt: '2026-01-05T00:00:00Z' },
  ],
  auditLogs: [{ id: 'L1', timestamp: '2026-01-06T00:00:00Z', action: 'PRICE_UPDATE', details: 'Steel to $1' }],
};

test('feed: sourcing sees only own pickups (email case-insensitive), newest first', () => {
  const f = feed({ email: 'b@x.com', registeredAt: '2026-01-01T00:00:00Z' }, 'sourcing', data);
  assert.deepStrictEqual(f.map((n) => n.id), ['pickup:P2', 'welcome']);
  assert.match(f[0].title, /P2/);
  assert.match(f[0].body, /Completed/);
});

test('feed: industrial sees only own orders by partner key', () => {
  const f = feed({ email: 'i@x.com', uid: 'IND-1' }, 'industrial', data);
  assert.deepStrictEqual(f.map((n) => n.id), ['order:O1']);
});

test('feed: admin sees all pickups, orders and audit entries', () => {
  const f = feed({ email: 'adm@x.com' }, 'admin', data);
  assert.deepStrictEqual(f.map((n) => n.id), ['audit:L1', 'order:O2', 'order:O1', 'pickup:P2', 'pickup:P1']);
});

test('feed: missing collections and bad timestamps do not throw; capped at 30', () => {
  assert.deepStrictEqual(feed({ email: 'a@x.com' }, 'sourcing', {}), []);
  const many = { sourcingPickups: Array.from({ length: 40 }, (_, i) => ({ id: 'P' + i, partnerEmail: 'a@x.com', createdAt: 'garbage' })) };
  assert.strictEqual(feed({ email: 'a@x.com' }, 'sourcing', many).length, 30);
});

test('unread: counts items newer than seenAt; never seen = all', () => {
  const f = feed({ email: 'adm@x.com' }, 'admin', data);
  assert.strictEqual(unread(f, undefined), 5);
  assert.strictEqual(unread(f, '2026-01-04T12:00:00Z'), 2);
  assert.strictEqual(unread(f, '2027-01-01T00:00:00Z'), 0);
});
