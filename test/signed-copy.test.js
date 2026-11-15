const test = require('node:test');
const assert = require('node:assert');
const { signedCopy } = require('../public/js/signed-copy.js');

const base = {
  title: 'Sourcing Partner Agreement', rev: 'REV 3.2', party: 'Priya <b>', email: 'p@x.io',
  date: '15 Nov 2026', ref: 'CERT-RH-ABC1234',
  sections: [{ n: 'SECTION 01', h: 'Purpose & Scope', html: '<p>Body one</p>' }],
};

test('drawn signature is embedded as an image; text fields are escaped', () => {
  const html = signedCopy({ ...base, sig: 'data:image/png;base64,iVBORw0KGgo=' });
  assert.match(html, /<img[^>]+src="data:image\/png;base64,iVBORw0KGgo="/);
  assert.match(html, /Priya &lt;b&gt;/);
  assert.doesNotMatch(html, /Priya <b>/);
  assert.match(html, /CERT-RH-ABC1234/);
  assert.match(html, /Purpose &amp; Scope/);
  assert.match(html, /<p>Body one<\/p>/); // clause markup is our own page's, kept as-is
});

test('typed signature renders the name in script, escaped', () => {
  const html = signedCopy({ ...base, sig: 'TYPED:Priya <i>S</i>' });
  assert.match(html, /class="typed">Priya &lt;i&gt;S&lt;\/i&gt;</);
  assert.doesNotMatch(html, /<img/);
});

test('anything else as signature is refused', () => {
  assert.throws(() => signedCopy({ ...base, sig: 'javascript:alert(1)' }), /signature/);
  assert.throws(() => signedCopy({ ...base, sig: 'data:image/svg+xml,<svg onload=x>' }), /signature/);
  assert.throws(() => signedCopy({ ...base, sig: 'TYPED:  ' }), /signature/);
});
