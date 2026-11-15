const test = require('node:test');
const assert = require('node:assert');
const { syncOrderStatus, syncPickupStatus } = require('../sync.js');

test('syncOrderStatus: copies delivery status onto its linked order', () => {
  const orders = [{ id: 'O1', deliveryStatus: 'Order Confirmed - Queue for Dispatch' }, { id: 'O2', deliveryStatus: 'x' }];
  const o = syncOrderStatus(orders, { id: 'D1', orderId: 'O1', status: 'In Transit' });
  assert.strictEqual(o, orders[0]);
  assert.strictEqual(orders[0].deliveryStatus, 'In Transit');
  assert.strictEqual(orders[1].deliveryStatus, 'x');
});

test('syncOrderStatus: no linked order or no status leaves orders alone', () => {
  const orders = [{ id: 'O1', deliveryStatus: 'a' }];
  assert.strictEqual(syncOrderStatus(orders, { id: 'D1', status: 'Delivered' }), null);
  assert.strictEqual(syncOrderStatus(orders, { id: 'D1', orderId: 'O9', status: 'Delivered' }), null);
  assert.strictEqual(syncOrderStatus(orders, { id: 'D1', orderId: 'O1', status: '' }), null);
  assert.strictEqual(syncOrderStatus(undefined, { orderId: 'O1', status: 'Delivered' }), null);
  assert.strictEqual(orders[0].deliveryStatus, 'a');
});

test('syncPickupStatus: copies slot status onto the pickup with the same bill number', () => {
  const pickups = [{ billNumber: 'B1', status: 'Vehicle Dispatched' }, { billNumber: 'B2', status: 'Vehicle Dispatched' }];
  const p = syncPickupStatus(pickups, { id: 'S1', billNumber: 'B2', status: 'Completed', assignedTransport: 'EV-9' });
  assert.strictEqual(p, pickups[1]);
  assert.strictEqual(pickups[1].status, 'Completed');
  assert.strictEqual(pickups[1].assignedTransport, 'EV-9');
  assert.strictEqual(pickups[0].status, 'Vehicle Dispatched');
});

test('syncPickupStatus: unlinked slot (seed data has no bill number) changes nothing', () => {
  const pickups = [{ billNumber: undefined, status: 'a' }];
  assert.strictEqual(syncPickupStatus(pickups, { id: 'S1', status: 'Completed' }), null);
  assert.strictEqual(syncPickupStatus(pickups, { billNumber: 'B9', status: 'Completed' }), null);
  assert.strictEqual(syncPickupStatus(undefined, { billNumber: 'B1', status: 'Completed' }), null);
  assert.strictEqual(pickups[0].status, 'a');
});
