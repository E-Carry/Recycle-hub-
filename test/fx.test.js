const test = require('node:test');
const assert = require('node:assert');
const { countFrame } = require('../public/js/fx.js');

test('countFrame: eases from 0 to target and formats with separators', () => {
  assert.strictEqual(countFrame(12480, 0, 0), '0');
  assert.strictEqual(countFrame(12480, 1, 0), '12,480');
  assert.ok(Number(countFrame(100, 0.5, 0)) > 50); // ease-out: past halfway at t=.5
});

test('countFrame: respects decimals and clamps t', () => {
  assert.strictEqual(countFrame(4.8, 1, 1), '4.8');
  assert.strictEqual(countFrame(10, 2, 0), '10');
});
