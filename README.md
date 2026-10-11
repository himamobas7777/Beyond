# Beyond

Discover opportunities, share what you build, meet other Beyonders.

- `index.html` + `config.js`, `data.js`, `core.js`, `screens.js`, `main.js`: the whole website (static, no build step).
- `supabase/schema.sql`: tables, security rules (RLS), Google-login profile trigger, account deletion, avatar storage.
- `supabase/seed.sql`: the 16 real opportunities (generated from `data.js` by `node tools/make_seed.js`).
- `config.js`: leave the Supabase keys empty for local demo mode; fill them for the live site. Never put the service_role key here.

Opportunity data was read from each official page on 2026-10-11. Re-check a page before changing `lastVerified`.
