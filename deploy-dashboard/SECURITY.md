# WKE Deploy security model

WKE Deploy is a privileged control plane. A compromise can affect every project it manages, so
the dashboard, build workers, stored credentials, and deployed applications must be separate
security boundaries.

## Stakeholders

- **Platform owners** need revocable access, production approvals, complete audit history, and a
  recovery path that does not depend on the dashboard remaining available.
- **Developers** need preview access without receiving production credentials.
- **Clients and administrators** need strict isolation so one organization cannot observe or
  change another organization's projects, logs, builds, or secrets.
- **Students, teachers, and parents** must remain outside the deployment control plane. WKE Deploy
  must not store educational records or authenticate against the WKE application database.

## Trust boundaries

1. **Identity edge** authenticates an individual operator and assigns a server-verified role.
2. **Control plane** authorizes actions and records them before dispatch.
3. **Job queue** provides idempotency, environment locks, retries, and approval state.
4. **Build plane** runs untrusted repository code in disposable, restricted workers.
5. **Artifact registry** stores immutable, scanned, signed images by digest.
6. **Runtime plane** runs client applications without dashboard or build credentials.
7. **Audit and secrets plane** is external to runtime deployments and cannot be modified by them.

## Authorization roles

| Role | View | Build preview | Promote or roll back | Manage users, projects, credentials |
| --- | --- | --- | --- | --- |
| Viewer | Yes | No | No | No |
| Developer | Yes | Yes | No | No |
| Administrator | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes |

Production approval will require an Administrator or Owner who is not the original requester once
two or more eligible operators exist. Single-owner installations retain an explicit break-glass
path, which must be audited and disabled during normal operation.

## Identity migration

The application supports two modes during the transition:

- **GitHub identity mode** uses OAuth with state and PKCE, an explicit login-to-role allowlist,
  database-backed sessions, and append-only audit events.
- **Legacy mode** uses the existing shared password only until GitHub identity mode is configured.
  When GitHub mode becomes ready, legacy sign-in is automatically disabled unless
  `WKE_DASHBOARD_BREAK_GLASS_ENABLED=true` is explicitly set.

Use a dedicated Supabase project for control-plane data. Apply
`supabase/migrations/001_control_plane.sql` to that project, then configure the environment values
in `.env.example`. The control-plane service-role key must never be placed in the browser, the WKE
application, a preview container, or a repository secret available to untrusted pull requests.

## Five-step delivery status

1. **SEC-001 – identity and audit:** implemented locally with GitHub OAuth/PKCE, 2FA enforcement,
   role gates, user-agent-bound revocable sessions, and durable append-only audit events. OAuth
   registration, migration application, and live verification remain operational steps.
2. **SEC-002 – credentials and approvals:** GitHub App installation tokens, project-bound
   AES-256-GCM envelopes, two-person production approval, and audited single-owner break glass are
   implemented. A credential rotation UI is intentionally deferred until the first external client.
3. **INFRA-003 – branch-aware preview:** commit-specific preview refs, persistent/idempotent jobs,
   environment locks, recovery processing, and provider-status reconciliation are implemented.
   Hostinger's shared preview slot remains a single live URL.
4. **INFRA-004 – isolated Docker builds:** the runtime is non-root/read-only with dropped
   capabilities and resource limits. A GitHub-hosted BuildKit workflow publishes digest-addressed
   GHCR images with an SBOM and signed provenance. Per-PR wildcard routing and automated preview
   cleanup require a VPS/provider that can create isolated runtime instances.
5. **PLATFORM-001 – organizations and projects:** tenant, memberships, projects, preview slots,
   quotas, project-scoped credentials, jobs, and audits are enforced in the schema and server-side
   authorization. Multi-project selection and billing UI remain later product work.

## Provider limitation

Hostinger Business managed Node.js hosting can safely run the WKE production, preview, and control
applications, but it is not a general container orchestrator. It cannot provide one disposable
container and wildcard hostname per pull request. The current adapter therefore gives every build
an immutable Git ref while routing only the latest successful preview through the shared preview
application. Do not represent this as simultaneous per-PR isolation; that requires the VPS/Docker
runtime and a wildcard DNS/TLS routing layer.

## Non-negotiable controls before client onboarding

- Individual MFA-backed identities; no shared daily-use administrator password.
- Project and organization authorization enforced server-side on every read and write.
- Per-project credentials with encryption keys stored outside the database.
- Preview builds receive no production credentials.
- Untrusted builds never receive the Docker socket, host mounts, or control-plane network access.
- Production deploys use the exact tested artifact digest rather than rebuilding source.
- Required checks, protected branches, dependency/secret/container scanning, and signed provenance.
- Durable external monitoring, encrypted backups, restore drills, token rotation, and a documented
  incident-response procedure.
