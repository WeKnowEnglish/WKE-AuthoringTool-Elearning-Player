# Hostinger Node.js migration

Keep `https://weknowenglish.online` on Vercel until a Hostinger **test URL** works. Do not change DNS, delete the Vercel project, or attach the production domain during the first deploy.

This app is Next.js 16 in `web/`. It is not a WordPress site and it does not use Vercel Blob, KV, or Edge Functions. Media stays in Supabase Storage. Hostinger only replaces the Node process that currently runs on Vercel.

## Phase 0 — confirm the plan

In hPanel:

1. Profile → **Billing** → **Subscriptions** — plan must be **Business** web hosting or **Cloud** (Startup / Professional / Enterprise).
2. **Websites → Add Website** must offer **Node.js web app**.
3. Optional: if an old WordPress install still exists on this account and you care about it, back up its files and database before creating the Node app. Skip this if production is already Next.js on Vercel.

## Phase 1 — Hostinger wizard (temporary domain)

**Websites → Add Website → Node.js web app → Import Git repository.**

| Field | Value |
|---|---|
| Repository | this Lesson Player repo |
| Branch | a `hostinger-preview` branch if you do not want every `main` push to rebuild; otherwise `main` |
| Root directory | `web` |
| Node.js | **24** (`package.json` `engines` and `.nvmrc`) |
| Framework | Next.js **SSR** (not static export) |
| Build command | `build` |
| Output directory | `.next` |
| Entry file | leave empty so Hostinger runs `next start` |
| Database wizard | **skip** — reuse the existing Supabase project |

The full git clone must be present. `web/package.json` depends on `file:../packages/explore-hotspots-play` and `file:../packages/explore-hotspots-author`. `npm run build` fails fast if those siblings are missing.

Do **not** set `VERCEL=1`. Self-hosted builds emit `output: "standalone"` when that variable is unset.

If the build runs out of memory, add this Hostinger environment variable and rebuild:

```text
NODE_OPTIONS=--max-old-space-size=4096
```

`NEXT_PUBLIC_*` values are baked in at **build** time. Change them, then rebuild — restarting the process is not enough.

## Phase 2 — environment

Copy **Vercel → Project → Settings → Environment Variables** (Production). Do not invent a second Supabase project.

### Same as Vercel production

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as the server pair)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STUDENT_SELF_REGISTRATION_ENABLED=false`
- Classroom realtime flags **exactly** as production (do not flip pilots on the first Hostinger deploy)
- `GEMINI_API_KEY`, `OPENAI_API_KEY` if production has them
- `LIVEBLOCKS_SECRET_KEY`, `VIRTUAL_CLASSROOM_COOKIE_SECRET`
- `DAILY_API_KEY`, `DAILY_DOMAIN`, `NEXT_PUBLIC_DAILY_DOMAIN`, `DAILY_WEBHOOK_HMAC`, `DAILY_ENABLED`
- `CRON_SECRET`
- `RESEND_*` / `TEACHER_ACCESS_*` if used
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` if used
- `STUDIO_ORIGIN` / `NEXT_PUBLIC_STUDIO_ORIGIN` / `STUDIO_FRAME_ANCESTORS` if Studio embeds this origin

### Different on the test host

| Variable | Test Hostinger URL | After DNS cutover |
|---|---|---|
| `APP_ORIGIN` | `https://<hostinger-test-host>` (no trailing slash) | `https://weknowenglish.online` |
| `NEXT_PUBLIC_APP_ORIGIN` | same test URL | `https://weknowenglish.online` |
| Stripe | omit, or **test** keys plus a test webhook | live keys; existing live webhook URL stays the production domain |
| `NEXT_PUBLIC_GIT_COMMIT_SHA` | optional short sha for diagnostics | optional |

Do **not** set `VERCEL`, `VERCEL_ENV`, or `VERCEL_URL`. Hosts other than `weknowenglish.online` already send `noindex`.

### Supabase Auth

**Add** (do not remove production):

- `https://<hostinger-test-host>/auth/callback`
- `https://<hostinger-test-host>/**` if the dashboard allows a wildcard

Keep Site URL as `https://weknowenglish.online` until cutover.

## Phase 3 — test without touching DNS

Use only the Hostinger URL:

1. Home, `/pilots`, teacher login, student login. After `/auth/callback` the browser must stay on the test host.
2. Open one lesson or homework.
3. Open a 3D world / house page if you care about memory.
4. Skip live Stripe and Daily unless you registered **test** webhooks on this host.
5. Wait ~15 minutes idle, then hard-refresh. Hostinger Node apps **sleep when idle**; a slow first request is a cold start, not necessarily an app bug.
6. Hit retention cron once:

```bash
curl -sS -X GET -H "Authorization: Bearer $CRON_SECRET" \
  "https://<hostinger-test-host>/api/cron/diagnostics-retention"
```

Expect HTTP 200. `401` / `503` means `CRON_SECRET` is missing or wrong.

If login bounces to `weknowenglish.online`, `APP_ORIGIN` or Supabase redirects are still production-only.

## Phase 4 — cutover (only after Phase 3)

1. Set `APP_ORIGIN` and `NEXT_PUBLIC_APP_ORIGIN` to `https://weknowenglish.online` and **rebuild**.
2. Attach `weknowenglish.online` to the Node app; wait for SSL.
3. Point DNS from Vercel to Hostinger. Lower TTL beforehand if you can.
4. Stripe (`/api/webhooks/stripe`) and Daily (`/api/webhooks/daily`) keep the same production URLs if the domain did not change. Confirm they still return 200.
5. Replace Vercel cron with hPanel **Advanced → Cron Jobs** (Custom). Cron does **not** inherit app env — paste the secret into the command:

```bash
curl -sS -X GET -H "Authorization: Bearer <CRON_SECRET>" https://weknowenglish.online/api/cron/diagnostics-retention
```

```bash
curl -sS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://weknowenglish.online/api/cron/daily-cleanup
```

```bash
curl -sS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://weknowenglish.online/api/cron/class-clock
```

`vercel.json` only schedules diagnostics-retention at `17 3 * * *` UTC. Schedule that daily. `daily-cleanup` should run every 15–60 minutes. Confirm whether `class-clock` is already ticked elsewhere before adding a frequent job.

6. Leave the Vercel project in place for rollback. Pause production deploys after 24–48 healthy hours so the Vercel quota stops draining.

## Rollback

Point DNS back to Vercel. Do not delete the Hostinger app on cutover day. Webhooks follow `weknowenglish.online`.

## What this repo already does

- Non-Vercel builds use `output: "standalone"` (`lib/build/next-output-mode.ts`).
- `prebuild` verifies `packages/` sits beside `web/` (`scripts/check-web-workspace.mjs`).
- Diagnostics release id reads `NEXT_PUBLIC_GIT_COMMIT_SHA`, then the Vercel sha, then `development`.
- Node 24 is declared in `package.json` `engines` and `.nvmrc`.
