/* Signed copy of the partner agreement: a self-contained HTML file the
   partner keeps (open it and print to PDF). signedCopy() is pure for tests;
   rhSignedCopy.download(opts) saves it in the browser. */
(function (root) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function sigHtml(sig) {
    if (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sig)) return `<img alt="Signature" src="${sig}">`;
    const typed = /^TYPED:(.*)$/s.exec(sig);
    if (typed && typed[1].trim()) return `<span class="typed">${esc(typed[1].trim())}</span>`;
    throw new Error('Unsupported signature format');
  }

  // sections[].html comes from this page's own clause markup, not user input.
  function signedCopy({ title, rev, party, email, date, ref, sig, sections }) {
    const sign = sigHtml(sig);
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)} · ${esc(ref)}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
body{font:15px/1.6 Inter,system-ui,sans-serif;color:#111;max-width:760px;margin:40px auto;padding:0 24px}
h1{font-size:24px;margin:0 0 4px}.meta{color:#555;font-size:13px;margin:0 0 28px}
h2{font-size:16px;margin:24px 0 6px}h2 small{display:block;color:#047857;font-size:11px;letter-spacing:.08em}
.sign{margin-top:40px;border-top:1px solid #ddd;padding-top:20px;break-inside:avoid}
.sign img{max-width:320px;max-height:120px;display:block}.typed{font:600 40px/1.2 'Dancing Script',cursive}
dl{display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:14px}dt{color:#555}dd{margin:0}
@media print{body{margin:0}}
</style></head><body>
<h1>${esc(title)}</h1><p class="meta">${esc(rev)} · Reference ${esc(ref)}</p>
${sections.map((s) => `<h2><small>${esc(s.n)}</small>${esc(s.h)}</h2>${s.html}`).join('\n')}
<div class="sign"><p><strong>Signed by the partner</strong></p>${sign}
<dl><dt>Name</dt><dd>${esc(party)}</dd><dt>Email</dt><dd>${esc(email)}</dd><dt>Signed on</dt><dd>${esc(date)}</dd><dt>Reference</dt><dd>${esc(ref)}</dd></dl></div>
</body></html>`;
  }

  const api = { signedCopy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  api.download = (opts, filename) => {
    const url = URL.createObjectURL(new Blob([signedCopy(opts)], { type: 'text/html' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  root.rhSignedCopy = api;
})(typeof window !== 'undefined' ? window : globalThis);
