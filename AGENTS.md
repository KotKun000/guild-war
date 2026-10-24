# AGENTS.md

- Stack: Cloudflare Pages (static `public/`) + Pages Functions (`functions/`) + D1 (`DB` binding). No build step; frontend is vanilla ES module `public/app.js`.
- Shared server code lives in `lib/` (outside `functions/` so it is not routed).
- Local dev: `npm run db:init:local` then `npm run dev` (port 8788). `.dev.vars` holds secrets; `DEV_LOGIN=true` enables `/auth/dev-login` on localhost only.
- On Windows, stopping `wrangler pages dev` via the shell may leave `workerd.exe` children holding port 8788 — kill them with `taskkill //F //T`.
- Game images are self-hosted: `npm run assets` (scripts/fetch-assets.mjs, uses sharp) downloads from 7katlas.com into `public/img/**` and writes `public/assets.json`. Never hotlink third-party images (CSP `img-src 'self'`). In team data, `extras` are reserve pets, not heroes; hero names may end with ` awake` / ` awake epic`.
- Verify: `node --check public/app.js`, then exercise API with curl (cookie `__Host-egg2k_sid`, header `X-Unlock`).
- Security model: every `/api/*` route requires session cookie; all data routes also require `X-Unlock` (HMAC token bound to session + password version). Keep the CSP (`public/_headers`) strict: no inline scripts/handlers — use `data-action` / `data-form` delegation and the auto-escaping `html` tagged template.
