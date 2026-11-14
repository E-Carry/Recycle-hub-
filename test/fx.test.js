const test = require('node:test');
const assert = require('node:assert');
const { splitWords, countFrame, tiltAngles, progress } = require('../public/js/fx.js');

test('splitWords: keeps spaces between words and indexes each word', () => {
  assert.deepStrictEqual(splitWords('Turn  scrap'), [{ w: 'Turn', i: 0 }, ' ', { w: 'scrap', i: 1 }]);
});

test('splitWords: empty/whitespace yields nothing to animate', () => {
  assert.deepStrictEqual(splitWords('   '), []);
});

test('countFrame: eases from 0 to target and formats with separators', () => {
  assert.strictEqual(countFrame(12480, 0, 0), '0');
  assert.strictEqual(countFrame(12480, 1, 0), '12,480');
  assert.ok(Number(countFrame(100, 0.5, 0)) > 50); // ease-out: past halfway at t=.5
});

test('countFrame: respects decimals', () => {
  assert.strictEqual(countFrame(4.8, 1, 1), '4.8');
});

test('tiltAngles: centre is flat, corners tilt toward max with sign', () => {
  assert.deepStrictEqual(tiltAngles(50, 50, 100, 100, 10), { rx: 0, ry: 0 });
  assert.deepStrictEqual(tiltAngles(100, 0, 100, 100, 10), { rx: 10, ry: 10 });
});

test('progress: clamps to [0,1] and handles non-scrollable pages', () => {
  assert.strictEqual(progress(0, 1000, 1000), 0);
  assert.strictEqual(progress(500, 2000, 1000), 0.5);
  assert.strictEqual(progress(5000, 2000, 1000), 1);
});
