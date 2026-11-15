# Recycle Hub

Recycling marketplace connecting sourcing partners (who collect material) with industrial partners (who process it), with the Rio AI assistant built into every page.

## Run locally

```
npm install
cp .env.example .env   # then fill in your Gmail address and app password
npm start              # http://localhost:3000
```

Email (OTP) is skipped if `EMAIL_USER`/`EMAIL_PASS` are not set. All data is stored permanently in SQLite at `data/recyclehub.db` (not committed; back it up by copying the file while the server is stopped). On first run it imports `data/users.json` and `data/admin-data.json` once. Set `DB_FILE` to use a different database, e.g. for tests.

Rio AI answers with an LLM via OpenRouter when `OPENROUTER_API_KEY` is set in `.env` (default model `google/gemma-4-31b-it:free`, change with `OPENROUTER_MODEL`). Without it, Rio uses its built-in FAQ engine. The key stays on the server. Tests: `npm test`.

## Pages (`public/`)

| Page | Purpose |
|---|---|
| `index.html` | Landing page, served at `/` |
| `login.html` | Sign in |
| `register.html` | Choose partner type |
| `register-sourcing.html`, `register-industrial.html` | Partner registration |
| `sourcing-dashboard.html`, `industrial-dashboard.html`, `admin-dashboard.html` | Dashboards |
| `rio/index.html` | Rio AI console (knowledge base, alerts), served at `/rio/` |

Shared layers: `css/design-system.css` (tokens), `css/motion.css` + `js/motion.js` (animations), `css/rio-assistant.css` + `js/rio-assistant.js` (chat widget).

## Deploying

This is an Express app (`server.js`), so it needs a Node host such as Render or Railway. GitHub Pages cannot run it.
