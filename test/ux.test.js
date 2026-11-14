const test = require('node:test');
const assert = require('node:assert');
const { score, rank, followUps } = require('../public/js/ux.js');

test('score: non-subsequence is null', () => {
  assert.strictEqual(score('xyz', 'Orders'), null);
});

test('score: case-insensitive subsequence matches', () => {
  assert.ok(score('ORD', 'Track orders') > 0);
});

test('score: word-start and contiguous matches beat scattered ones', () => {
  assert.ok(score('pic', 'Book pickup') > score('pic', 'Spare policy chart'));
});

test('rank: empty query keeps original order', () => {
  const items = [{ label: 'B' }, { label: 'A' }];
  assert.deepStrictEqual(rank('', items), items);
});

test('rank: filters non-matches and equal match quality prefers the shorter label', () => {
  const items = [{ label: 'Prices' }, { label: 'Store' }, { label: 'Pickup schedule' }, { label: 'Pickups' }];
  assert.deepStrictEqual(rank('pick', items).map((i) => i.label), ['Pickups', 'Pickup schedule']);
});

test('rank: also matches the hint text, weaker than label', () => {
  const items = [{ label: 'Overview', hint: 'orders summary' }, { label: 'Orders' }];
  assert.deepStrictEqual(rank('orders', items).map((i) => i.label), ['Orders', 'Overview']);
});

test('followUps: same-category questions, excluding the matched and asked ones', () => {
  const kb = [
    { id: 1, question: 'A?', category: 'Pay' },
    { id: 2, question: 'B?', category: 'Pay' },
    { id: 3, question: 'C?', category: 'Pick' },
    { id: 4, question: 'D?', category: 'Pay' },
    { id: 5, question: 'E?', category: 'Pay' },
  ];
  assert.deepStrictEqual(followUps(kb, kb[0], ['D?'], 2), ['B?', 'E?']);
});

test('followUps: no match yields empty list', () => {
  assert.deepStrictEqual(followUps([{ id: 1, question: 'A?', category: 'x' }], null, [], 3), []);
});
