# Preview-to-production promotion gate

Use this gate before promoting a WKE preview build. A successful build is not
enough: the release must preserve sign-in, student access, teacher workflows,
parent access, scheduled maintenance, and administrator communications.

## Stakeholders protected by this gate

- **Students:** existing primary and secondary sign-in must continue to resolve
  the correct profile, class, and assignments.
- **Teachers:** teacher authentication, class management, invitations,
  communications, and live-class tools must fail safely when an optional
  provider is unavailable.
- **Parents:** parent authentication and paid lesson-pack routes must not expose
  privileged keys or create an incomplete checkout.
- **Administrators:** deployment, cron, email, and service-role credentials must
  remain server-only and every promoted commit must be identifiable.

## Environment contract

Hostinger masks stored values and its API replaces the complete environment
set. Never construct an update from masked output. Start with the current full
secret set from the secure source of truth, then apply the domain-specific
values below.

### Required application baseline

| Variable | Preview | Production | Purpose |
| --- | --- | --- | --- |
| `SUPABASE_URL` | WKE project URL | WKE project URL | Server Supabase client |
| `SUPABASE_ANON_KEY` | WKE public/anon key | WKE public/anon key | Server public Supabase client |
| `NEXT_PUBLIC_SUPABASE_URL` | WKE project URL | WKE project URL | Browser Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | WKE public/anon key | WKE public/anon key | Browser public Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret | Server-only secret | Privileged teacher/admin operations |
| `APP_ORIGIN` | `https://preview.weknowenglish.online` | `https://weknowenglish.online` | Server-generated redirects and email links |
| `NEXT_PUBLIC_APP_ORIGIN` | Preview origin | Production origin | Browser-visible canonical origin |
| `NEXT_PUBLIC_STUDENT_SELF_REGISTRATION_ENABLED` | `false` | `false` | Teacher/parent-managed student identity |
| `VIRTUAL_CLASSROOM_COOKIE_SECRET` | Unique strong secret | Unique strong secret | Signs classroom membership cookies |
| `CRON_SECRET` | Strong secret | Strong secret | Protects maintenance endpoints |

The managed build derives `NEXT_PUBLIC_GIT_COMMIT_SHA` from the checked-out
commit. A manually stored value is optional and should not be allowed to become
stale.

### Required for teacher communications

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Sends invitations and administrator-composed email |
| `COMMUNICATIONS_FROM_EMAIL` | Verified Resend sender identity |
| `COMMUNICATIONS_REPLY_TO` | Monitored mailbox for teacher replies |
| `TEACHER_ACCESS_NOTIFICATION_EMAIL` | Receives new public teacher-access requests |

`TEACHER_ACCESS_FROM_EMAIL` is a legacy-compatible sender fallback. It is not
required when `COMMUNICATIONS_FROM_EMAIL` is configured.

### Feature-dependent variables

Configure these only when the matching feature is included in the release:

- AI authoring: `GEMINI_API_KEY` and optional `GEMINI_MODEL`.
- Speech transcription: `OPENAI_API_KEY`.
- Liveblocks-backed classroom and whiteboard paths: `LIVEBLOCKS_SECRET_KEY`.
- Daily video: `DAILY_API_KEY`, `DAILY_DOMAIN`,
  `NEXT_PUBLIC_DAILY_DOMAIN`, `DAILY_ENABLED`, and `DAILY_WEBHOOK_HMAC`.
- Parent checkout: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- Shared rate limits: `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN`.
- Protected resource downloads: `RESOURCE_DOWNLOAD_SECRET`.

Keep every `NEXT_PUBLIC_CLASSROOM_REALTIME_*` and server authority pilot flag
false or absent unless its documented rollout gate has passed. Do not copy
`VERCEL_*`, `WKE_001_*`, local fixture credentials, or local-only build flags
into Hostinger.

Every `NEXT_PUBLIC_*` change requires a new build; restarting the Node.js
process is insufficient.

## Promotion checklist

1. Merge the latest deployment-controller hardening into the preview candidate.
2. Resolve dependency advisories rated high or critical, then run the clean
   install, typecheck, unit tests, managed build, and production dependency
   audit.
3. Confirm Supabase migrations required by the candidate are present. For the
   communications release this includes `153_teacher_communications.sql` and
   `154_admin_audit_log.sql`.
4. Compare Hostinger environment **key names** with this contract. Obtain real
   secret values from the secure source of truth; never from masked API output.
5. Rebuild preview and verify `/api/health` identifies the candidate commit.
6. Run `WKE_PRODUCTION_ORIGIN=https://preview.weknowenglish.online npm run
   test:hostinger:production --workspace=web`.
7. Complete authenticated acceptance with purpose-created accounts:
   - existing teacher sign-in and `/teacher/classes`;
   - existing primary and secondary student sign-in;
   - parent sign-in;
   - administrator communications page;
   - one test email with reply-path verification;
   - two-teacher private messaging and an unauthorized-conversation denial.
8. Copy the approved communications configuration to production, changing both
   origin variables to the production origin. Rebuild production.
9. Re-run the Hostinger production acceptance gate and inspect runtime logs.
10. Retain the previous completed production deployment as the rollback target.

Promotion must stop on any failed automated check, missing required key,
incorrect origin, high/critical production dependency advisory, or failed
authenticated journey.
