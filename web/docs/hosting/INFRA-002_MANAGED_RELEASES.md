# INFRA-002 — Managed Hostinger release controller

The primary stakeholder is the administrator responsible for uninterrupted student and teacher access. A new build must never replace the last successful production release until the new release has passed health checks.

## Hosting constraint

The current production site runs on Hostinger managed Node.js hosting, not on the Docker/VPS scaffold. Hostinger creates each deployment in `hbuilds/versions/<build-id>/`, keeps the two latest successful versions, and points `hbuilds/current` at the live version. A failed build should leave the existing live version in place.

The dashboard cannot directly control Hostinger's internal `hbuilds/current` symlink or Node process. The first managed-hosting implementation therefore separates **validation** from **production promotion**:

```text
GitHub commit
     ↓
Hostinger preview application / preview branch
     ↓
wait for /api/health to report the exact commit twice
     ↓
run preview acceptance checks
     ↓
promote that commit to the production branch
     ↓
Hostinger builds a new version while the prior successful version stays live
     ↓
verify production /api/health and record the release
```

## Hard release rules

1. Building a preview must not change the production branch, domain, or environment variables.
2. A preview is ready only when `/api/health` returns HTTP 200, `status: "ok"`, `environment: "production"`, and the expected commit SHA for two consecutive checks.
3. A failed or timed-out preview leaves production unchanged.
4. Promotion uses the exact tested Git commit. It must not silently promote a newer branch tip.
5. Production verification records the previous and new commit so rollback remains explicit.
6. Database migrations must remain backward-compatible with the currently live application during the build and handoff window.

## Release waiter

The headless gate used by the future dashboard is available now:

```bash
WKE_DEPLOYMENT_ORIGIN=https://hostinger-test.weknowenglish.online \
WKE_EXPECTED_GIT_COMMIT_SHA=<full-git-sha> \
npm run wait:hostinger:release
```

Optional controls:

- `WKE_DEPLOYMENT_TIMEOUT_SECONDS` — default `1200` (20 minutes).
- `WKE_DEPLOYMENT_POLL_SECONDS` — default `15`.
- `WKE_REQUIRED_HEALTHY_CHECKS` — default `2`.

The command exits successfully only after the expected release is stable. On failure it explicitly states that production must remain on the previous release.

## Hostinger setup required for preview promotion

1. Keep the existing `weknowenglish.online` application as production.
2. Create a second Hostinger Node.js application using a temporary hostname and a dedicated preview branch.
3. Copy the non-production-safe environment configuration to that app. Use the temporary origin for `APP_ORIGIN` and `NEXT_PUBLIC_APP_ORIGIN`; add its callback URLs to Supabase Auth.
4. The managed build derives commit metadata from the checked-out Git commit so `/api/health` can identify the exact release. A manually configured `NEXT_PUBLIC_GIT_COMMIT_SHA` remains only a fallback.
5. Store the preview hostname in the future dashboard configuration; do not expose Hostinger or GitHub credentials to the browser.

## Dashboard milestone

The first independent dashboard implementation now lives in `deploy-dashboard/`. It is designed to run as its own Hostinger Node.js web application at `deploy.weknowenglish.online`, separate from both WKE production and WKE preview.

The initial dashboard is deliberately read-only. It:

- checks production and preview `/api/health` endpoints at request time;
- displays health, environment, version, commit, and HTTP status;
- recognizes Hostinger 403/404 responses as domain-routing problems;
- keeps the promotion gate visibly closed until both endpoints identify valid releases; and
- contains no GitHub, Hostinger, Supabase, student, or teacher credentials.

This separation ensures the operational view can remain available while the learning application is building or restarting. Authentication and an audit trail are required before promotion or rollback controls are added.

## Diagnosing deployment downtime now

Hostinger's current deployment layout should leave `hbuilds/current` pointing at the previous successful build until a replacement succeeds. If the public site is unavailable for the entire build:

1. Confirm `domains/<domain>/hbuilds/current/nodejs` exists in File Manager. If it does not, redeploy once to move off the legacy `nodejs/` layout.
2. Watch CPU, RAM, I/O, and Max Processes during a deployment. Resource saturation can make the live Node process return 503 even when its files were not replaced.
3. Apply Hostinger's current Next.js process optimization by using **Deployments → Redeploy → Save and Redeploy**.
4. Record whether the outage lasts for the whole build or only for the final process restart.

If an uninterrupted final handoff is required and Hostinger still restarts the only production process, managed hosting cannot provide an application-controlled atomic switch. The next tier is either two production applications behind an external router or the Docker/VPS blue-green design in `HOSTINGER_VPS_DOCKER.md`, where Caddy changes upstream only after the new container is healthy.
