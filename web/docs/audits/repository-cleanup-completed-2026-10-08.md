# Migration and repository cleanup completed — 8 October 2026

Teacher and student access, enrollment records, learning history and unfinished feature work were preserved while reconciling schema history and retiring obsolete repository checkouts.

## Database result

Migrations 156–161 were applied to Supabase project `vmqvhzghfbwcfnxittta` on 6 October. The final dry-run on 8 October reported an up-to-date remote database with no pending migrations, seeds or roles in the maintenance branch. No migration-history repair, database reset, application deployment or email cron activation occurred.

Before the push, a PostgreSQL 17.6 custom logical backup captured schema and rows for public, auth, storage, realtime and supabase_migrations. Its SHA-256 is `3ddfa29aaf614825dc01cc3c39fe88b4cbb719ab3dbe0ebc83d8e439c9382eaa`. It restored without errors into an isolated local PostgreSQL instance. All six migrations passed against that restored copy; enrollment counts remained unchanged and the existing-teacher status backfill passed. The dump omits server-owned grants/ownership and Storage object bytes; it does retain Storage metadata. No media objects were removed.

Targeted SQL suites passed for communications, onboarding (33 assertions), vocabulary (15) and reviewed delivery (14). The architecture rule fixtures passed 13 tests. Docker was unavailable, so the restored live-schema rehearsal substitutes for a local Supabase reset; it does not establish full provider, browser or production onboarding acceptance.

The linked baseline passed all 161 migration checks. The post-push architecture audit and updated registry passed with zero blocking findings. The registry maps 86 objects across all eight required journeys plus communications. Remaining advisories are 81 foreign-key index candidates, 31 grants without applicable policies, and one usage-verification item. The dated linked report is `../database/linked-audit-2026-10-06.json`; the current human map is `../database.md`.

## Repository result

| Inventory | Before cleanup | After cleanup |
|---|---:|---:|
| Local branches | 19 | 7 |
| Remote branches | 21 | 6 |
| Registered worktrees | 10 | 3 |
| Original stashes | 5 | 5 |

The cleanup added maintenance and recovery branches, then retired 14 original local branches and 16 remote branches. Exact remote tips were pushed as archive tags before branch deletion. Remote deletions used one atomic push with an expected-SHA lease for each branch. Unique work was archived rather than automatically merged.

The retained remote branches are:

- `main`: current production source.
- `maintenance/migration-cleanup`: frozen migration source, tests, map and this report; draft PR 49.
- `feat/activity-builder`: recent saved-vocabulary scrolling work, currently `b14acaf`.
- `codex/fix-deploy-form-origin`: deployment dashboard source.
- `codex/vercel-retirement`: preview source.
- `codex/infra-002-managed-release`: source referenced by the older temporary Hostinger preview, retained conservatively.

Local branches additionally retain the private unfinished-work recovery branch, with `codex/activity-builder-hostinger` corresponding to remote `feat/activity-builder`. Hosting-related refs were retained after inspecting Hostinger build source metadata. No Hostinger settings changed during cleanup.

## Preservation and recovery

The primary checkout remains at its original path on `recovery/workspace-2026-10-06`, commit `dd6f9d7bc7eb2a31fffed2b83bd2be4c11f06c9a`. Its tracked and non-ignored source files match that checkpoint. Local validation/output folders remain in place, excluded only through `.git/info/exclude`. The primary Git index was aligned with the checkpoint without overwriting source files. The stale zero-byte index lock and original index were preserved privately.

Eight inactive worktrees were moved intact into the private recovery directory, including all untracked/ignored files, dependencies, builds and local configuration. Each move retained the original directory's filesystem identity. Git registrations were then pruned; complete checkout contents and original registration metadata remain available. The optional compressed-copy attempt was incomplete and was not used as the basis for removing any worktree.

Three worktrees remain registered:

1. Primary unfinished-work recovery checkout.
2. `teacher-onboarding-release`, retained for continuing onboarding work and its validation evidence.
3. `migration-cleanup`, retained for PR review.

Recovery materials are at `C:/Users/brady/Documents/WKE-Recovery/2026-10-06-repository-cleanup/`. Start with its `RECOVERY.md`. It contains verified Git bundles, all five stash references, branch manifests, complete archived checkout directories, a restore script, the tested database dump and migration evidence. This directory contains private data and must remain outside Git.

Retired remote branches can be recreated from `archive/2026-10-08/remote/<original-branch-name>`. Older 6 October archive tags and local-only archive tags are retained too. The local Git bundles preserve complete history, including recovery and quarantine refs. Review the original branch audit before integrating archived patches: older branches contain conflicting migration version prefixes.

## Deliberate remaining work

- Review and merge draft PR 49 when ready. Main was not merged or redeployed by this cleanup.
- Continue onboarding in its retained checkout. Its new migration 162 is excluded from the frozen release and needs a separate SQL/application handoff.
- Split the private recovery branch into focused feature changes before deployment. It preserves the mixed state, including the existing missing `explore-hotspots-author` package/dependency issue; a clean Git status does not make it a reviewed build.
- Keep email worker/webhook deployment and provider/browser/pilot acceptance as explicit onboarding release work. Applied schema alone does not make those features operational.
- Retarget the retained legacy hosting sources only as a separate deployment change, then retire their branch refs.
