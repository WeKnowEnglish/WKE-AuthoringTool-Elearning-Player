# WKE Deploy dashboard

This is the independent operational dashboard for We Know English deployments. It is deliberately separate from the student and teacher application so it can remain available while that application is building or restarting.

The public page checks the `/api/health` endpoints for production and preview and holds the promotion gate closed when preview is not verifiably ready. The authenticated control plane lists Hostinger build history, exposes build logs, starts preview builds, promotes the exact healthy preview commit, and can redeploy a prior production commit as a rollback.

Because this project uses Hostinger managed Node.js hosting rather than a VPS, promotion rebuilds the same immutable Git commit in the production application. Hostinger keeps the previous successful deployment live while the new build runs. This differs from the original Docker/VPS roadmap, where promotion would have switched a Caddy alias without rebuilding.

Dashboard changes are validated independently by `.github/workflows/deploy-dashboard-gates.yml` so they do not inherit or weaken the learning application's release checks.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `WKE_PRODUCTION_ORIGIN` | Production WKE origin to observe | `https://weknowenglish.online` |
| `WKE_PREVIEW_ORIGIN` | Preview WKE origin to observe | `https://preview.weknowenglish.online` |
| `WKE_DASHBOARD_GIT_COMMIT_SHA` | Optional fallback commit when Git metadata is unavailable | `development` |
| `WKE_DASHBOARD_ORIGIN` | Canonical dashboard origin used for host-header and OAuth validation; set production to `https://deploy.weknowenglish.online` | `http://localhost:3000` |
| `WKE_DASHBOARD_GITHUB_CLIENT_ID` / `WKE_DASHBOARD_GITHUB_CLIENT_SECRET` | GitHub OAuth application used for individual operator identities | — |
| `WKE_DASHBOARD_GITHUB_ROLE_MAP` | JSON map of exact GitHub logins to `owner`, `administrator`, `developer`, or `viewer` | — |
| `WKE_DASHBOARD_REQUIRE_GITHUB_2FA` | Reject allowlisted GitHub operators whose account does not report 2FA enabled | `true` |
| `CONTROL_PLANE_SUPABASE_URL` / `CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY` | Dedicated deployment-control database; never use the educational application database | — |
| `CONTROL_PLANE_ORGANIZATION_ID` / `CONTROL_PLANE_PROJECT_ID` | Tenant and project IDs created by the control-plane bootstrap | — |
| `CONTROL_PLANE_MASTER_KEY` / `CONTROL_PLANE_MASTER_KEY_VERSION` | AES-256-GCM envelope-encryption key held outside the database | — |
| `WKE_DEPLOY_WORKER_SECRET` | Reconciliation-worker bearer secret; minimum 32 characters | — |
| `WKE_DEPLOY_SINGLE_ADMIN_BREAK_GLASS` | Permit an audited release when only one administrator exists | `false` |
| `WKE_DASHBOARD_ADMIN_PASSWORD` | Temporary legacy administrator password; minimum 12 characters | — |
| `WKE_DASHBOARD_SESSION_SECRET` | Temporary legacy HMAC session key; minimum 32 random characters | — |
| `WKE_DASHBOARD_BREAK_GLASS_ENABLED` | Keeps legacy access available after GitHub identity is configured | `false` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional shared failed-login limiter; recommended for production | in-memory fallback |
| `HOSTINGER_API_TOKEN` | Server-only token created in the Hostinger Account page | — |
| `WKE_HOSTINGER_USERNAME` | Hosting account username | — |
| `WKE_HOSTINGER_GIT_INSTALLATION_UUID` | Hostinger Git connection identifier | — |
| `WKE_GITHUB_APP_ID` / `WKE_GITHUB_APP_PRIVATE_KEY` / `WKE_GITHUB_APP_INSTALLATION_ID` | Preferred short-lived, repository-scoped GitHub App authentication | — |
| `GITHUB_DEPLOY_TOKEN` | Temporary fine-grained token fallback when the GitHub App is not configured | — |
| `WKE_GITHUB_OWNER` / `WKE_GITHUB_REPOSITORY` | Repository coordinates | — |

All control credentials remain server-side. The dashboard never returns token values to the browser. GitHub sign-in uses state and PKCE, an explicit role map, revocable database-backed sessions, HTTP-only secure cookies, server-side role checks, and append-only audit events. Mutating form requests must originate from the dashboard itself. The shared-password login remains only as a migration fallback and automatically switches off when GitHub identity is fully configured unless break-glass access is explicitly enabled.

Before enabling GitHub identity, create a separate Supabase project for deployment-control data and apply `supabase/migrations/001_control_plane.sql`. Do not apply this schema to the WKE educational-data project. Then run `npm run control:bootstrap` locally with the Supabase service credentials in the shell and copy the two printed IDs into the dashboard environment. The script never prints the service-role key.

Production requests are durable jobs. With two eligible owners/administrators, the requester cannot approve their own release. A second operator approves it from the dashboard, after which an atomic status claim prevents duplicate dispatch. `.github/workflows/deploy-control-worker.yml` retries authorized work and reconciles Hostinger build completion every five minutes; set the repository variable `WKE_DEPLOY_DASHBOARD_ORIGIN` and repository secret `WKE_DEPLOY_WORKER_SECRET` to the same value used by the dashboard.

Each preview build is pinned to a commit-specific `wke-preview/<sha>` branch. Hostinger Business managed hosting still provides one live preview application/domain, so builds from different branches are immutable but replace that shared preview slot. Simultaneous per-PR URLs require the Docker/VPS or another provider adapter; the database already models distinct preview slot keys for that stage.

## Hostinger deployment

Create this as a third, independent Node.js web application:

- Repository: `WeKnowEnglish/WKE-AuthoringTool-Elearning-Player`
- Branch: `main`
- Root directory: `deploy-dashboard`
- Framework: `Next.js`
- Node.js: 24.x
- Build command: `npm run build`
- Output directory: `.next`
- Entry file: leave blank
- Intended hostname: `deploy.weknowenglish.online`

Set the variables above in the Hostinger dashboard application. The dashboard health check is available at `/api/health`. Without administrator variables, the public status page remains available and all controls fail closed.

Preview builds default to `main`. Existing `WKE_DASHBOARD_PREVIEW_BRANCH` values naming the retired `codex/infra-002-managed-release`, `codex/vercel-retirement`, or `codex/fix-deploy-form-origin` branches resolve to `main`; other explicit branch overrides remain supported. This compatibility keeps saved hosting settings usable without replacing the site's secret environment variables.

## Safety boundary

Promotion is accepted only when the public preview health endpoint reports the requested production-mode commit. The controller creates a commit-specific `wke-release/<sha>` Git branch and asks Hostinger to build production from that immutable ref. Rollback verifies the selected historical Hostinger build before creating the same kind of release ref. Every requested action emits a structured event to runtime logs and, in GitHub identity mode, to the append-only control database.

The managed-hosting API token has the same account permissions as its owner. Keep it in Hostinger environment variables, restrict dashboard access to HTTPS, and rotate it if it is ever exposed.
