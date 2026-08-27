# Supabase development workflow

The Supabase CLI is pinned in `web/package.json`. Run commands from the `web` directory so the
repository uses the same CLI version on every machine.

## First-time setup

1. Install Docker Desktop and start it. Allocate at least 7 GB of memory to Docker.
2. Run `npm install`.
3. Authenticate with `npx supabase login`.
4. Link the intended project with `npx supabase link --project-ref <project-ref>`.
5. Run `npm run supabase:audit` before any migration-history repair or remote push.

The project reference and login credentials are stored outside Git. Never commit database
passwords, access tokens, service-role keys, or files from `supabase/.temp`.

## Common commands

- `npm run supabase:version` — confirm the pinned CLI version.
- `npm run supabase:status` — compare local and linked migration history.
- `npm run supabase:audit` — verify the legacy migration baseline against the linked schema.
- `npm run supabase:start` — start the local Supabase stack (Docker required).
- `npm run supabase:reset` — rebuild only the local database from migrations and seed data.
- `npm run supabase:stop` — stop the local Supabase stack.
- `npm run supabase:new -- migration_name` — create a timestamped migration.

## Migration rules

- Create every future schema change with `npm run supabase:new -- migration_name`.
- Keep exactly one SQL file per timestamp/version prefix.
- Test with `npm run supabase:reset` before proposing a remote migration.
- Do not make production schema changes in the Dashboard SQL/Table editors.
- Do not run `supabase db push` while `npm run supabase:status` reports divergence.
- Coordinate remote pushes so only one person deploys migrations at a time.

## Legacy baseline

The original migration set used three-digit versions. Four duplicate version pairs were
consolidated without changing their SQL order, leaving one file for every version from `001`
through `139`. The audit treats historical demo/curriculum seed rows as informational because
data can legitimately be edited or removed after a migration; schema markers remain blocking.

Migration-history repair must only be run after reviewing the audit output. Repair updates
Supabase's history ledger and does not execute migration SQL.
