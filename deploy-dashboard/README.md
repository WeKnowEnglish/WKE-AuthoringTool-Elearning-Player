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
| `WKE_DASHBOARD_ADMIN_PASSWORD` | Single administrator password; minimum 12 characters | — |
| `WKE_DASHBOARD_SESSION_SECRET` | HMAC session key; minimum 32 random characters | — |
| `HOSTINGER_API_TOKEN` | Server-only token created in the Hostinger Account page | — |
| `WKE_HOSTINGER_USERNAME` | Hosting account username | — |
| `WKE_HOSTINGER_GIT_INSTALLATION_UUID` | Hostinger Git connection identifier | — |
| `GITHUB_DEPLOY_TOKEN` | Fine-grained token with Contents read/write on this repository | — |
| `WKE_GITHUB_OWNER` / `WKE_GITHUB_REPOSITORY` | Repository coordinates | — |

All control credentials remain server-side. The dashboard never returns token values to the browser. Login uses a signed, HTTP-only, secure, same-site cookie; mutating form requests must originate from the dashboard itself; and failed logins are rate-limited per process.

## Hostinger deployment

Create this as a third, independent Node.js web application:

- Repository: `WeKnowEnglish/WKE-AuthoringTool-Elearning-Player`
- Branch: the branch containing this dashboard until it is merged
- Root directory: `deploy-dashboard`
- Framework: `Next.js`
- Node.js: 24.x
- Build command: `npm run build`
- Output directory: `.next`
- Entry file: leave blank
- Intended hostname: `deploy.weknowenglish.online`

Set the variables above in the Hostinger dashboard application. The dashboard health check is available at `/api/health`. Without administrator variables, the public status page remains available and all controls fail closed.

## Safety boundary

Promotion is accepted only when the public preview health endpoint reports the requested production-mode commit. The controller creates a commit-specific `wke-release/<sha>` Git branch and asks Hostinger to build production from that immutable ref. Rollback verifies the selected historical Hostinger build before creating the same kind of release ref. Every requested action emits a structured event to Hostinger runtime logs.

The managed-hosting API token has the same account permissions as its owner. Keep it in Hostinger environment variables, restrict dashboard access to HTTPS, and rotate it if it is ever exposed.
