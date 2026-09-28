# WKE Deploy dashboard

This is the independent operational dashboard for We Know English deployments. It is deliberately separate from the student and teacher application so it can remain available while that application is building or restarting.

The first milestone is read-only. It checks the public `/api/health` endpoints for production and preview, displays their release metadata, and holds the promotion gate closed when preview is not verifiably ready. It does not store Hostinger, GitHub, or Supabase credentials and cannot change production.

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
| `WKE_DASHBOARD_GIT_COMMIT_SHA` | Commit identifying this dashboard build | `development` |

These values remain server-side. No application or database secrets belong in this dashboard milestone.

## Hostinger deployment

Create this as a third, independent Node.js web application:

- Repository: `WeKnowEnglish/WKE-AuthoringTool-Elearning-Player`
- Branch: the branch containing this dashboard until it is merged
- Root directory: `deploy-dashboard`
- Node.js: 24.x
- Build command: `npm run build`
- Start command: `npm start`
- Intended hostname: `deploy.weknowenglish.online`

Set the three variables above in the Hostinger application. The dashboard health check is available at `/api/health`.

## Safety boundary

Deployment controls require administrator authentication, an audit trail, server-only GitHub credentials, exact-commit verification, and rollback behavior. Those controls are intentionally deferred. The next milestone should add authentication before any action that can promote or redeploy a release.
