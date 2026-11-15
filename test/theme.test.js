const test = require('node:test');
const assert = require('node:assert');
const { pickTheme, flip } = require('../public/js/theme.js');

test('pickTheme: a saved choice wins over the OS preference', () => {
  assert.strictEqual(pickTheme('dark', false), 'dark');
  assert.strictEqual(pickTheme('light', true), 'light');
});

test('pickTheme: nothing saved follows the OS preference', () => {
  assert.strictEqual(pickTheme(null, true), 'dark');
  assert.strictEqual(pickTheme(null, false), 'light');
});

test('pickTheme: junk in storage is ignored, not trusted', () => {
  assert.strictEqual(pickTheme('purple', false), 'light');
  assert.strictEqual(pickTheme('', true), 'dark');
  assert.strictEqual(pickTheme('DARK', false), 'light');
});

test('flip: toggles between the two themes', () => {
  assert.strictEqual(flip('dark'), 'light');
  assert.strictEqual(flip('light'), 'dark');
});
