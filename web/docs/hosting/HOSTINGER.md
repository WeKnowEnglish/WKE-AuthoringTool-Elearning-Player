# Hostinger managed Node.js operations

Production has moved to Hostinger. The administrator's priority is uninterrupted
teacher and student access; validate each exact commit in the independent preview
application before promoting it.

| Application | Origin |
| --- | --- |
| Production | https://weknowenglish.online |
| Preview | https://preview.weknowenglish.online |
| Deployment dashboard | https://deploy.weknowenglish.online |

Vercel is no longer a deployment target. See [VERCEL_RETIREMENT.md](./VERCEL_RETIREMENT.md)
for account cleanup. Supabase remains the database, authentication, and media
provider. Daily and Liveblocks remain separate classroom services.

## Build and environment

Use the full repository clone, including `web/` and sibling `packages/`.
The learning application uses Node 24, repository root `/`, build command
`npm run build`, and start command `npm run start`. The root workspace packages
the standalone server into `web/dist/`; start runs `node web/dist/server.js`.
Preserve the working Hostinger wizard's output/entry settings when redeploying.
The dashboard is a separate app with root `deploy-dashboard` and its own build.

All learning-app builds use standalone output with repository-wide file tracing.
The managed build derives its commit from Git and embeds it in `/api/health`.
Do not configure provider-specific adapter variables.

Production uses `APP_ORIGIN=https://weknowenglish.online` and the same
`NEXT_PUBLIC_APP_ORIGIN`. Preview uses `https://preview.weknowenglish.online` for
both. Rebuild after changing `NEXT_PUBLIC_*`; browser values are compiled in.
Preserve the existing Supabase project and feature credentials. Server-only keys
must never appear in browser configuration. Supabase Auth must allow each app's
callback; the production Site URL stays `https://weknowenglish.online`.

Optional `WKE_DEPLOYMENT_ENV=preview` forces noindex even if a proxy supplies the
production Host header. Other hostnames already receive noindex.

## Releases and rollback

Use the dashboard to build an exact commit in preview and promote that same
commit. Production rebuilds it. Wait for `/api/health` to identify the expected
SHA before declaring success. Rollback redeploys an earlier successful Hostinger
commit; DNS stays on Hostinger.

Run `npm run test:hostinger:production` for public health, auth redirects, cache
headers, protected cron routes, and webhook reachability. Authenticated learning
journeys and signed webhook delivery need separate checks.
See [PREVIEW_PROMOTION.md](./PREVIEW_PROMOTION.md).

## Maintenance

`.github/workflows/hostinger-maintenance.yml` on the default branch is the single
scheduler. Its GitHub secret `CRON_SECRET` must match Hostinger production.
Do not duplicate these jobs in hPanel.

| Job | Method | UTC schedule |
| --- | --- | --- |
| Diagnostics retention | GET | Daily, 03:17 |
| Daily classroom cleanup | POST | Minutes 7 and 37 each hour |
| Classroom clock | POST | Every five minutes |
| Email outbox | POST | Every five minutes, after explicit activation |

The email outbox route and migration belong to the communications release.
Keep repository variable `WKE_EMAIL_DELIVERY_ENABLED` unset until that release
has deployed `/api/cron/email-delivery`, its database migration, and Resend
configuration. Verify unauthorized requests return 401 and run the worker once
with approval for queued email delivery, then enable the variable.

The separate `.github/workflows/deploy-control-worker.yml` reconciles deployment
requests. Preserve its existing dashboard origin and worker secret.

GitHub scheduled jobs may be delayed. The classroom also advances its schedule
on application access; this job is a backstop, not a precision lesson timer.
