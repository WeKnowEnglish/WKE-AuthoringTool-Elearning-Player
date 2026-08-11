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

No migration after 130 is required for the native-shell pilot in this branch.

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
8. Run the two-browser checklist in `REALTIME_MIGRATION_AUDIT.md`.
9. Repeat the same variable set and deployment sequence in Production.

## 5. Fast rollback

Set `NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT=false` and redeploy. This
immediately restores the outer Liveblocks compatibility shell. The database
migrations are additive and should not be rolled back. After the compatibility
deployment is live, the three server authority flags can also be disabled if a
full write-path rollback is needed.

