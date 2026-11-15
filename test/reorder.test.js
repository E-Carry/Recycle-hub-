// reorderPrefill lives inline in industrial-dashboard.html between reorder markers.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../public/industrial-dashboard.html'), 'utf8');
const m = html.match(/\/\* reorder:start \*\/([\s\S]*?)\/\* reorder:end \*\//);
assert.ok(m, 'reorder block not found in industrial-dashboard.html');
const fn = vm.runInNewContext(m[1] + ';reorderPrefill');
const prefill = (o, inv) => JSON.parse(JSON.stringify(fn(o, inv)));

const inv = [{ id: 'RM-1', name: 'HMS', stockTons: 40, pricePerTon: 340 }, { id: 'RM-2', name: 'Cu', stockTons: 0, pricePerTon: 9000 }];
const order = (o = {}) => ({ id: 'ORD-1', materialId: 'RM-1', materialName: 'HMS', quantityTons: 12.5, shippingMode: 'self', deliveryDestination: 'Bay 4, Durgapur', ...o });

test('copies quantity, shipping and destination from the past order', () => {
  assert.deepStrictEqual(prefill(order(), inv), { itemId: 'RM-1', qty: 12.5, ship: 'self', dest: 'Bay 4, Durgapur', capped: false });
});

test('legacy/free-text shipping modes fall back to Recycle Hub freight', () => {
  assert.strictEqual(prefill(order({ shippingMode: 'EV Heavy Loader Dedicated Freight' }), inv).ship, 'freight');
  assert.strictEqual(prefill(order({ shippingMode: undefined }), inv).ship, 'freight');
});

test('quantity is capped at current stock and flagged', () => {
  const r = prefill(order({ quantityTons: 55 }), inv);
  assert.strictEqual(r.qty, 40);
  assert.strictEqual(r.capped, true);
});

test('refuses lots that are delisted or out of stock', () => {
  assert.match(prefill(order({ materialId: 'GONE', materialName: 'Old lot' }), inv).error, /Old lot.*no longer listed/);
  assert.match(prefill(order({ materialId: 'RM-2', materialName: 'Cu' }), inv).error, /Cu.*out of stock/);
});
