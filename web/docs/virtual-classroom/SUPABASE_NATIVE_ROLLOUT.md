# Supabase-native Virtual Classroom rollout

This is the authoritative deployment checklist for the class-linked native
classroom shell. Do not enable the final shell flag until every item below is
complete in the target environment.

## 1. Database migrations

Apply the migration files in this exact order:

1. `127_class_session_runtime_snapshots.sql`
2. `128_classroom_realtime_authorization.sql`
3. `129_class_session_runtime_snapshot_advance.sql`
4. `130_class_session_lobby_heartbeat.sql`

These migrations assume the project has already applied the existing Virtual
Classroom history, particularly migration 117 (session attendance) and
migration 122 (lobby attendance fields). A project that has run the repository
migrations sequentially already has those prerequisites.

Migrations 127–130 enable the native shell. Goal WKE-006 also requires migration 131 so privacy-safe classroom reconnect evidence can be stored and reviewed in Platform Health.

Run this read-only verification in the Supabase SQL editor after applying the
migrations. All four object checks must be `true`, and both named policies must
appear in the policy result.

```sql
select
  to_regclass('public.class_session_runtime_snapshots') is not null
    as runtime_snapshot_table,
  to_regprocedure(
    'public.advance_class_session_runtime_snapshot(text,bigint,jsonb,text)'
  ) is not null as snapshot_advance_function,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'class_session_attendance'
      and column_name = 'lobby_last_seen_at'
  ) as lobby_heartbeat_column,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'realtime'
      and table_name = 'messages'
  ) as realtime_messages_available;

select policyname
from pg_policies
where schemaname = 'realtime'
  and tablename = 'messages'
  and policyname in (
    'classroom participants can receive realtime',
    'classroom participants can send realtime'
  )
order by policyname;
```

In **Supabase → Realtime → Settings**, turn **Allow public access** off. The
classroom uses private Broadcast and Presence channels authorized by migration
128; database replication/publication changes are not required.

## 2. Base deployment variables

These existing values must remain configured:

```dotenv
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
LIVEBLOCKS_SECRET_KEY=...
```

`LIVEBLOCKS_SECRET_KEY` is still required for one-off guest classrooms and the
isolated collaborative whiteboard. `VIRTUAL_CLASSROOM_COOKIE_SECRET` remains
recommended; when omitted, the existing code falls back to the Liveblocks
secret.

## 3. Classroom rollout variables

For the complete native class shell, set every value below to `true` in the
same Vercel environment:

```dotenv
NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE=true
NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT=true
NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT=true

CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT=true
CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT=true
CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT=true

NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT=true
```

The build now validates this dependency set automatically. The authenticated
runtime endpoint also confirms all three server authority lanes and a readable
snapshot before removing the outer Liveblocks room. If readiness is incomplete,
the class automatically stays on the compatibility shell.

`NEXT_PUBLIC_*` values are compiled into the browser bundle. Changing any of
them requires a new Vercel deployment; restarting an existing deployment is
not sufficient.

## 4. Recommended rollout order

1. Apply and verify migrations 127–130.
2. Disable Realtime public access.
3. Deploy first with all classroom pilot flags false.
4. Enable shadow mode in Preview and test teacher + student reconnect.
5. Enable the read pilots and participant registry in Preview.
6. Enable the three server authority flags in Preview.
7. Enable the native-shell flag last and redeploy Preview.
8. Complete the WKE-006 capacity and rollback-owner record below.
9. Run `npm run test:release:classroom`; it must pass three consecutive times against Preview.
10. Rehearse the native-shell flag rollback in Preview.
11. Select one small supervised class, then repeat the approved variable sequence in Production.

## 5. Fast rollback

Set `NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT=false` and redeploy. This
immediately restores the outer Liveblocks compatibility shell. The database
migrations are additive and should not be rolled back. After the compatibility
deployment is live, the three server authority flags can also be disabled if a
full write-path rollback is needed.

## 6. WKE-006 Preview acceptance

The gate creates disposable teacher, class, two enrolled students, and a student
enrolled in a different class. It deletes these fixtures after every run. The
public production hostname is refused; use a Vercel Preview URL only.

Add these values to the local operator environment. Capacity values are the
current plan limits verified in the provider dashboards, not estimates:

```dotenv
WKE_006_BASE_URL=https://your-preview-url.example
WKE_006_PILOT_STUDENT_COUNT=...
WKE_006_SUPABASE_CONNECTION_CAPACITY=...
WKE_006_LIVEBLOCKS_CONNECTION_CAPACITY=...
WKE_006_ROLLBACK_OWNER=...
NEXT_PUBLIC_APP_DIAGNOSTICS_ENABLED=true
VERCEL_AUTOMATION_BYPASS_SECRET=...
WKE_006_VERCEL_COOKIE_FILE=.vercel/wke006-cookies.txt
```

When Vercel Deployment Protection intercepts the Preview, use either
`VERCEL_AUTOMATION_BYPASS_SECRET` or `WKE_006_VERCEL_COOKIE_FILE`. The cookie
jar can be created by authenticated Vercel CLI without exposing the bypass
secret. Keep either credential only in ignored local or CI secret storage. The
gate sends the credential as an authorization header and disables Playwright
traces while it is present so it is not retained in test artifacts.

The student count must be at least two. Each recorded connection capacity must
cover the students, one teacher, and at least one spare connection. Keep the
existing confirmed Supabase project-ref variable and the full flag set from
section 3 in the operator environment.

Run one diagnostic pass first:

```bash
npm run test:release:classroom:once
```

Then record the required release evidence:

```bash
npm run test:release:classroom
```

Stop immediately for unauthorized access, newer state being replaced, a
control-affecting duplicate participant, repeated recovery failure, recovery
P95 above five seconds, or provider capacity below roster plus buffer. The
rollback owner disables `NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT`
and redeploys; additive migrations remain in place.
