# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# npm's two file: dependencies and the postinstall hook require these paths to
# exist beside web/ even though web/ is the only runnable application.
COPY packages ./packages
COPY web/package.json web/package-lock.json ./web/
COPY web/scripts/ensure-explore-hotspots-react.mjs ./web/scripts/
RUN cd web && npm ci

FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG WKE_APP_VERSION=0.1.0
ARG WKE_GIT_COMMIT_SHA=unknown
ENV WKE_APP_VERSION=${WKE_APP_VERSION} \
    WKE_GIT_COMMIT_SHA=${WKE_GIT_COMMIT_SHA} \
    NEXT_PUBLIC_GIT_COMMIT_SHA=${WKE_GIT_COMMIT_SHA}

COPY packages ./packages
COPY web ./web
COPY --from=dependencies /app/web/node_modules ./web/node_modules
COPY --from=dependencies /app/packages/explore-hotspots-play/node_modules ./packages/explore-hotspots-play/node_modules

WORKDIR /app/web
# Pass production configuration with BuildKit rather than copying secrets into
# an image layer. NEXT_PUBLIC_* values are intentionally compiled into the app;
# server-only values remain runtime environment variables.
RUN --mount=type=secret,id=wke_env,required=false \
    set -eu; \
    trap 'rm -f .env.production.local' EXIT; \
    if [ -f /run/secrets/wke_env ]; then \
      cp /run/secrets/wke_env .env.production.local; \
    fi; \
    npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

ARG WKE_APP_VERSION=0.1.0
ARG WKE_GIT_COMMIT_SHA=unknown
ENV WKE_APP_VERSION=${WKE_APP_VERSION} \
    WKE_GIT_COMMIT_SHA=${WKE_GIT_COMMIT_SHA} \
    NEXT_PUBLIC_GIT_COMMIT_SHA=${WKE_GIT_COMMIT_SHA}

# outputFileTracingRoot is the repository root, so Next places the runnable
# server at web/server.js inside the standalone directory.
COPY --from=builder --chown=node:node /app/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/web/public ./web/public
COPY --from=builder --chown=node:node /app/web/.next/static ./web/.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "web/server.js"]
