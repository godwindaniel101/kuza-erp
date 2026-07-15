# Kuza — Deployment Architecture & Runbook

> Written 2026-07-11. Honest constraints first: Cloudflare is perfect for the **marketing site** and can front everything as DNS/CDN/WAF, but the **NestJS backend cannot run on Cloudflare Workers** (TypeORM + pg + long-lived Postgres connections + schema-per-tenant don't fit the Workers runtime). Don't fight that — use Cloudflare where it shines and a container host for the API.

## Target architecture
```
kuza.africa            → Cloudflare Pages (website/ — static, free)
app.kuza.africa        → Next.js frontend (Cloudflare Pages via next-on-pages, OR same container host as API — simpler)
api.kuza.africa        → NestJS backend container (Fly.io / Railway / Render / a VPS) — Cloudflare DNS proxy in front
Postgres               → managed (Neon / Supabase / Fly Postgres / RDS) — daily backups ON
```

## 1. Marketing site → Cloudflare Pages (do this first, 5 minutes)
```bash
# one-time auth (interactive — run it yourself, e.g. `! npx wrangler login` inside Claude Code)
npx wrangler login
# deploy (from the kuza-erp repo root)
npx wrangler pages deploy website --project-name kuza-erp
# custom domain: Cloudflare dashboard → Pages → kuza-erp → Custom domains → kuza.africa
```

## 2. Backend API (container host)
The repo already has `backend/Dockerfile`. Any container host works; Railway/Fly are the fastest solo-founder paths.

Required environment (see docker-compose.dev.yml for the full list):
| Var | Prod rule |
|---|---|
| `NODE_ENV` | `production` — **this turns TypeORM `synchronize` OFF** (schema is NOT auto-created in prod) |
| `JWT_SECRET` | 32+ random bytes (`openssl rand -hex 32`). App fail-fasts on weak/missing (F2) |
| `DB_*` | managed Postgres creds; require SSL |
| `DB_LANDLORD_NAME` | separate landlord database (create it) |
| `FRONTEND_URL` | https://app.kuza.africa (CORS) |
| `ANTHROPIC_API_KEY` | optional — enables Kuza Copilot (/insights/ask) |

**Schema bootstrap in prod (important):** because `synchronize` is off in production and the project has no migration files yet, the first deploy needs the schema created once. Pragmatic path for the pilot phase: run the app once against the empty prod DB with `DB_SYNCHRONIZE` temporarily enabled (single instance, then turn it off), or dump the dev `public` schema (`pg_dump --schema-only --schema=public`) and apply it. **Before real scale: generate proper TypeORM migrations and solve tenant-schema propagation (roadmap F7).** New tenant schemas are cloned from `public` at registration, so keeping `public` current is what matters.

## 3. App frontend
Option A (simplest, recommended now): run `next start` in a second container on the same host; Cloudflare proxies app.kuza.africa to it.
Option B (Cloudflare-native): `@cloudflare/next-on-pages` — works for this Pages-Router app only after an audit of `getServerSideProps` usage; defer until Option A hurts.
Set `NEXT_PUBLIC_API_URL=https://api.kuza.africa`.

## 4. Pre-launch hardening checklist
- [ ] Rate limiting on /auth/* (roadmap F4b — **not yet implemented**; add @nestjs/throttler before public launch)
- [ ] Postgres automated backups + a restore test
- [ ] Cloudflare in front of api.* with WAF + bot fight mode
- [ ] Error tracking (Sentry free tier) on both apps
- [ ] Uptime check (Better Uptime/Cloudflare health checks) on /api health endpoint
- [ ] Verify prod tenant registration end-to-end creates schema + trial subscription
- [ ] Run smoke flows (docs: scratchpad smoke scripts pattern) against staging: register → invoice → pay → trial balance balanced
- [ ] Rotate any secret that ever appeared in docker-compose defaults

## 5. Webhooks (payments/POS) in prod
Webhook receivers must be reachable without auth at `POST /api/integrations/webhooks/:connectionId` — put the URL in the provider dashboard (Paystack/Monnify). Signature verification uses the per-connection secret. Events land in the integration inbox and auto-reconcile matched invoice payments.

## 6. Costs at pilot scale (~monthly)
Cloudflare Pages $0 · API container ~$5–10 · Postgres (Neon free tier → $19) · domain ~$10/yr. **Total ≈ $10–30/mo** until real traffic.
