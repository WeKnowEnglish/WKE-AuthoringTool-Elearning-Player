# Hostinger VPS Docker deployment

This is the production container path for INFRA-001 and the initial temporary-host scaffold for INFRA-002. It is separate from Hostinger's managed Node.js wizard documented in [HOSTINGER.md](./HOSTINGER.md).

Keep `weknowenglish.online` on Vercel until the temporary hostname passes the release checks. The primary stakeholder is the administrator operating a learning-critical platform; a failed infrastructure change must not interrupt student or teacher access.

## What is included

- A multi-stage Node.js 24 Docker build using Next.js standalone output.
- A non-root runtime container containing only traced runtime files, `public/`, and `.next/static/`.
- `GET /api/health` for container and proxy health checks.
- Docker Compose with the WKE app on an internal network.
- Caddy as the only internet-facing service, with automatic HTTPS.
- Build-time injection of `NEXT_PUBLIC_*` values through a BuildKit secret.
- Runtime injection of server-only variables through an ignored environment file.

The Compose file is deliberately a single-production-deployment scaffold. The later deployment dashboard will create image-tagged preview containers and update Caddy routes without rebuilding a tested image.

## Files

| File | Purpose |
|---|---|
| `Dockerfile` | Dependencies, builder, and minimal standalone runtime stages |
| `.dockerignore` | Keeps secrets, caches, tests, and non-runtime workspace files out of the build context |
| `compose.production.yml` | WKE and Caddy production services |
| `infra/Caddyfile` | Temporary hostname to `wke:3000` routing |
| `infra/hostinger.compose.env.example` | Non-secret deployment metadata template |
| `web/.env.production` | Local/VPS secret file; ignored and never committed |

## 1. Prepare the VPS and DNS

Use a Hostinger VPS with Docker Engine and Docker Compose v2. Point an A record such as `hostinger-test.weknowenglish.online` to the VPS IPv4 address. Open inbound TCP ports 80 and 443. Caddy cannot obtain a certificate until the hostname resolves publicly to this server.

Clone the full repository; do not copy only `web/` because the build uses both local `@wke/explore-hotspots-*` packages.

## 2. Create application configuration

From the repository root:

```bash
cp web/.env.example web/.env.production
chmod 600 web/.env.production
```

Replace placeholders with the current Vercel production values, following the environment split in [HOSTINGER.md](./HOSTINGER.md). For the temporary host:

- Set `APP_ORIGIN` and `NEXT_PUBLIC_APP_ORIGIN` to the full temporary HTTPS URL.
- Keep classroom rollout flags identical to production.
- Use test Stripe credentials/webhooks or omit Stripe until cutover.
- Add the temporary callback URL to Supabase Auth without removing production.
- Do not set `VERCEL`, `VERCEL_ENV`, or `VERCEL_URL`.

`NEXT_PUBLIC_*` values are compiled into the browser bundle. Changing one requires a new image build. Server-only values are also supplied at runtime, so rotating a server secret requires a container restart but not necessarily a rebuild.

The Dockerfile mounts this file as a BuildKit secret only for the build command and removes the temporary copy in the same layer. It is excluded from the Docker build context and is not copied into the final image.

## 3. Create deployment metadata

```bash
cp infra/hostinger.compose.env.example infra/hostinger.compose.env
```

Edit the copy and set:

- `WKE_HOSTNAME` to the temporary hostname only, without a scheme or path.
- `WKE_ENV_FILE` to `./web/.env.production`.
- `WKE_APP_VERSION` to the package/release version.
- `WKE_GIT_COMMIT_SHA` to the exact full Git commit.
- `WKE_IMAGE_TAG` to a short immutable commit identifier.

Do not put application secrets in this Compose metadata file.

## 4. Build and start

```bash
docker compose --env-file infra/hostinger.compose.env -f compose.production.yml build --pull
docker compose --env-file infra/hostinger.compose.env -f compose.production.yml up -d
docker compose --env-file infra/hostinger.compose.env -f compose.production.yml ps
```

The WKE port is exposed only to the internal `wke-edge` network. Caddy owns host ports 80 and 443 and persists certificates in the `caddy_data` volume.

Inspect startup without printing the environment file:

```bash
docker compose --env-file infra/hostinger.compose.env -f compose.production.yml logs --tail=200 wke caddy
curl --fail --silent --show-error https://hostinger-test.weknowenglish.online/api/health
```

Expected shape:

```json
{
  "status": "ok",
  "app": "wke",
  "version": "0.1.0",
  "commit": "<git-sha>",
  "environment": "production"
}
```

The response is explicitly non-cacheable and contains no dependency credentials.

## 5. Release validation

Before changing production DNS, verify:

1. The Compose service is healthy and the health endpoint reports the intended commit.
2. Home, teacher login, student login, and auth callbacks remain on the temporary host.
3. A student can open and complete a representative lesson or homework activity.
4. A teacher can load the dashboard and create/read the content needed for a normal class.
5. Supabase reads/writes, storage assets, and realtime classroom behavior work.
6. Daily and Stripe use test webhooks on the temporary host, or remain outside this test.
7. Static images, optimized images, 3D assets, and downloadable resources load.
8. Required cron endpoints are invoked from an authenticated external scheduler.

See [HOSTINGER.md](./HOSTINGER.md) for the broader test and cutover checklist.

## Operations

View status and logs:

```bash
docker compose --env-file infra/hostinger.compose.env -f compose.production.yml ps
docker compose --env-file infra/hostinger.compose.env -f compose.production.yml logs --tail=200
```

Deploy a new commit by updating the commit SHA and image tag, building, then running `up -d`. Keep at least the current and previous image until the new release has been healthy for 24-48 hours.

For a manual rollback, restore the previous image tag and matching commit metadata, then run:

```bash
docker compose --env-file infra/hostinger.compose.env -f compose.production.yml up -d --no-build
```

This is a temporary operational rollback. INFRA-002 should later make preview promotion and rollback an atomic Caddy alias change while keeping both containers healthy.

## Production cutover

Only after temporary-host acceptance:

1. Change `APP_ORIGIN` and `NEXT_PUBLIC_APP_ORIGIN` to `https://weknowenglish.online`.
2. Change `WKE_HOSTNAME` to `weknowenglish.online` and rebuild because a public variable changed.
3. Confirm the new container is healthy before changing DNS.
4. Point production DNS to the VPS and confirm Caddy obtains the certificate.
5. Verify Supabase redirects, Stripe/Daily webhooks, cron jobs, login, and a complete learning flow.
6. Leave Vercel available for rollback until production has remained healthy.

## Known limits of this scaffold

- It routes one hostname to one WKE service; wildcard preview routing is not implemented yet.
- Promotion and rollback are manual Compose operations, not dashboard actions.
- It does not build or run the future `wke-deploy` dashboard/worker.
- It does not schedule cron routes.
- It does not add external monitoring, backups, image retention, firewall automation, or registry publishing.

Those are INFRA-002 and later protective-measure tasks. Do not expose the Docker socket to a public dashboard when they are added; isolate the worker and narrowly authorize deployment actions.
