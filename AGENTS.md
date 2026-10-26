# AGENTS.md

- Stack: Cloudflare Pages (static `public/`) + Pages Functions (`functions/`) + D1 (`DB` binding). No build step; frontend is vanilla ES module `public/app.js`.
- Shared server code lives in `lib/` (outside `functions/` so it is not routed).
- Local dev: `npm run db:init:local` then `npm run dev` (port 8788). `.dev.vars` holds secrets; `DEV_LOGIN=true` enables `/auth/dev-login` on localhost only.
- On Windows, stopping `wrangler pages dev` via the shell may leave `workerd.exe` children holding port 8788 — kill them with `taskkill //F //T`.
- Game images are self-hosted: `npm run assets` (scripts/fetch-assets.mjs, uses sharp) downloads from 7katlas.com into `public/img/**` and writes `public/assets.json`. Never hotlink third-party images (CSP `img-src 'self'`). In team data, `extras` are reserve pets, not heroes; hero names may end with ` awake` / ` awake epic`.
- Skill/ring/set/stat icons + Thai skill names come from the 7K Note bundle (fetch-assets.mjs `fetchNoteAssets`). Skill numbers: 1 = บน (file `..03`), 2 = ล่าง (`..02`), 3 = อเวค (`..06`).
- DB changes: add a file in `migrations/` and also update `schema.sql`. Apply remote with `npx wrangler d1 execute guild-war-egg2k --remote -y --command "<SQL>"` (the `--file` import API failed with auth error 10000).
- Admins whose Discord account has 2FA (`members.mfa`) skip the guild password (`POST /api/unlock {bypass:true}`). New members default to `viewer`.
- Deploy: push to `main` (Cloudflare Pages Git integration, project `guild-war-egg2k`).
- Verify: `node --check public/app.js`, then exercise API with curl (cookie `__Host-egg2k_sid`, header `X-Unlock`).
- Security model: every `/api/*` route requires session cookie; all data routes also require `X-Unlock` (HMAC token bound to session + password version). Keep the CSP (`public/_headers`) strict: no inline scripts/handlers — use `data-action` / `data-form` delegation and the auto-escaping `html` tagged template.
