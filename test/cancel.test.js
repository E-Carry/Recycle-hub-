const test = require('node:test');
const assert = require('node:assert');
const { slotStart, cancelPickup, blocker } = require('../cancel.js');

const at = (s) => new Date(s); // local time, same as the server
const pk = (o = {}) => ({ id: 'PKP-1', partnerEmail: 'a@x.in', pickupDate: '2026-11-20', timeSlot: '02:30 PM - 04:30 PM (Afternoon Slot)', status: 'Vehicle Dispatched', billNumber: 'B1', ...o });
const data = (p) => ({ sourcingPickups: [p], pickupSlots: [{ id: 'S1', billNumber: 'B1', status: p.status }, { id: 'S2', billNumber: 'B2', status: 'x' }], auditLogs: [] });

test('slotStart: reads the 12-hour start of every slot the form offers', () => {
  assert.strictEqual(+slotStart('2026-11-20', '09:00 AM - 11:00 AM (Morning Slot)'), +at('2026-11-20T09:00'));
  assert.strictEqual(+slotStart('2026-11-20', '11:30 AM - 01:30 PM (Midday Slot)'), +at('2026-11-20T11:30'));
  assert.strictEqual(+slotStart('2026-11-20', '05:00 PM - 07:00 PM (Evening Express)'), +at('2026-11-20T17:00'));
  assert.strictEqual(+slotStart('2026-11-20', '12:15 AM - 1:00 AM'), +at('2026-11-20T00:15'));
  assert.strictEqual(slotStart('2026-11-20', 'whenever'), null);
  assert.strictEqual(slotStart('20/11/2026', '09:00 AM - 11:00 AM'), null);
});

test('cancelPickup: owner, more than 2h before slot -> cancelled, admin slot mirrored, audit logged', () => {
  const p = pk(), d = data(p);
  const r = cancelPickup(d, 'PKP-1', 'A@x.in', at('2026-11-20T12:29'));
  assert.strictEqual(r.pickup, p);
  assert.strictEqual(p.status, 'Cancelled by Partner');
  assert.ok(p.cancelledAt);
  assert.strictEqual(d.pickupSlots[0].status, 'Cancelled by Partner');
  assert.strictEqual(d.pickupSlots[1].status, 'x');
  assert.strictEqual(d.auditLogs[0].action, 'SOURCING_PICKUP_CANCELLED');
});

test('cancelPickup: refuses inside the 2h window, other owners, unknown ids, moving or closed pickups', () => {
  const late = pk(), d1 = data(late);
  assert.deepStrictEqual(cancelPickup(d1, 'PKP-1', 'a@x.in', at('2026-11-20T12:31')).code, 409);
  assert.strictEqual(late.status, 'Vehicle Dispatched');
  assert.strictEqual(d1.auditLogs.length, 0);

  assert.strictEqual(cancelPickup(data(pk()), 'PKP-1', 'b@x.in', at('2026-11-19T00:00')).code, 404);
  assert.strictEqual(cancelPickup(data(pk()), 'NOPE', 'a@x.in', at('2026-11-19T00:00')).code, 404);
  for (const status of ['En Route to Partner Location', 'In Transit', 'Collected', 'Completed - Paid', 'Cancelled by Partner'])
    assert.strictEqual(cancelPickup(data(pk({ status })), 'PKP-1', 'a@x.in', at('2026-11-19T00:00')).code, 409, status);
  assert.strictEqual(cancelPickup(data(pk({ timeSlot: '??' })), 'PKP-1', 'a@x.in', at('2026-11-19T00:00')).code, 409);
});

test('blocker: null when cancellable, a reason otherwise (drives the dashboard button)', () => {
  assert.strictEqual(blocker(pk(), at('2026-11-20T12:00')), null);
  assert.match(blocker(pk(), at('2026-11-20T13:00')), /2 hours/);
  assert.match(blocker(pk({ status: 'Collected' }), at('2026-11-19T00:00')), /Collected/);
});
