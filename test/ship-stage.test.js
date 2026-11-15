// shipStage lives inline in industrial-dashboard.html between ship-stage markers;
// pull that block out and evaluate it in a bare context.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../public/industrial-dashboard.html'), 'utf8');
const m = html.match(/\/\* ship-stage:start \*\/([\s\S]*?)\/\* ship-stage:end \*\//);
assert.ok(m, 'ship-stage block not found in industrial-dashboard.html');
const ctx = vm.runInNewContext(m[1] + ';({ shipStage, SHIP_STEPS })');
// Copy into this realm so deepStrictEqual's prototype check passes.
const shipStage = (s) => ({ ...ctx.shipStage(s) });
const SHIP_STEPS = [...ctx.SHIP_STEPS];

const step = (s) => shipStage(s).step;

test('five steps, in order', () => {
  assert.deepStrictEqual([...SHIP_STEPS], ['Ordered', 'Confirmed', 'Loading / dispatched', 'In transit', 'Delivered']);
});

test('every status string the server and seed data emit', () => {
  const cases = {
    'Order Confirmed - Queue for Dispatch': 1,
    'Confirmed (Scheduled)': 1,
    'Pending Driver Assignment': 1,
    'Preparing for Loading': 2,
    'Vehicle Dispatched': 2,
    'Weighbridge Clearance': 3,
    'In Transit': 3,
    'In Transit via EV Heavy Loader': 3,
    'In Transit (AI Resolved)': 3,
    'Delivered': 4,
  };
  for (const [s, want] of Object.entries(cases)) assert.strictEqual(step(s), want, s);
});

test('dispatch queue is not dispatched; out for delivery is not delivered', () => {
  assert.strictEqual(step('Queued for dispatch'), 1);
  assert.strictEqual(step('Out for Delivery'), 3);
  assert.strictEqual(step('Loading completed'), 2);
});

test('order placed is step 0', () => {
  assert.strictEqual(step('Order placed'), 0);
});

test('missing or junk input never throws', () => {
  assert.deepStrictEqual(shipStage(undefined), { step: 0, halted: false });
  assert.deepStrictEqual(shipStage(null), { step: 0, halted: false });
  assert.deepStrictEqual(shipStage(''), { step: 0, halted: false });
  assert.strictEqual(step(42), 1);
  assert.strictEqual(step({}), 1);
  assert.strictEqual(step('Something new from ops'), 1);
});

test('failed/cancelled are halted and never shown as delivered', () => {
  assert.deepStrictEqual(shipStage('Cancelled by buyer'), { step: 1, halted: true });
  assert.strictEqual(shipStage('Undelivered - returned to depot').halted, true);
  assert.ok(step('Undelivered - returned to depot') < 4);
  assert.ok(step('Delivery failed') < 4);
  assert.strictEqual(shipStage('Delivered').halted, false);
});
