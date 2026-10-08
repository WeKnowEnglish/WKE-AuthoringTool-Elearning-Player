# Repository and migration cleanup review

Reviewed 2026-10-06. This is a recommendation and evidence record; it does not authorize or perform a migration push, merge, deployment, branch deletion, worktree removal, or stash removal.

The affected stakeholders are teachers preparing lessons and managing access, students whose work and progress must remain intact, parents receiving notifications, and administrators managing releases. Cleanup should make the teaching cycle reliable and recoverable.

## Verified state

- Fetched `origin` without pruning. Current `origin/main` is `3d5173692055` (shortened), containing the merged Hostinger/Vercel-retirement PR #48. The old local `main` is 108 commits behind it.
- Current checkout: `feat/activity-builder`, HEAD `9c30434`; 51 commits behind and four commits ahead of `origin/main`. Its upstream is three commits ahead of local HEAD. The upstream has seven commits outside main, including Hostinger build support and type fixes.
- 19 local branches, 21 remote-tracking branches, ten Git worktrees, and five stashes were found. Remote-tracking names are fetched references; pruning was not performed and some may be stale.
- Before adding this audit's files, the main checkout contained 168 tracked changes and 529 untracked files. Git's directory-collapsed status showed 277 entries. Many untracked files are generated slide/media outputs or local validation tools, so these numbers are not a count of feature changes.
- The detached `teacher-onboarding-release` worktree also has substantial unfinished work. In a comparison of 270 changed application/package/workflow paths, 257 matched between the two checkouts and 13 differed. It is mostly a copied snapshot, but it is not safe to discard it without resolving those differences.
- GitHub connector search returned no open PRs. The GitHub CLI is not authenticated; connector access worked. PR #48 is merged. Its description reports a deployed production release and successful CI; this review did not independently inspect Hostinger's current deployment.

## Supabase and the map

Read-only migration-history inspection against the already-linked project showed versions **001–155 present locally and remotely**, and **156–160 local only**. The baseline schema checks also passed for 001–155 and reported exactly the five pending migrations as missing. Three absent historical seed checks are informational, not a reason to replay seed data.

There are 160 SQL files with 160 unique local version prefixes. No migration-history repair is indicated by this evidence.

| Version | Purpose | Current state | Release consideration |
|---|---|---|---|
| 156 | Durable teacher/access email outbox, delivery events, retries, unread notifications | Untracked; absent remotely | Coordinate new SQL triggers with the application and worker. Keep email scheduling disabled until the matching application and sender/webhook configuration are verified. |
| 157 | Teacher-owned lesson vocabulary sources and atomic generation | Untracked; absent remotely | Review ownership, stale-source protection, and lesson/activity transaction behavior. |
| 158 | Immutable reviewed lesson releases, pinned sessions and frozen homework | Untracked; absent remotely | Depends on 157. Verify teacher/student projections, assignment retries and an actual student completion. |
| 159 | Current-account teacher access, suspension, Auth metadata protection and broad restrictive RLS guards | Untracked; absent remotely | Changes Auth data and access behavior across existing RLS-enabled tables. Test against the complete schema and matching application, including old JWTs and restore flows. |
| 160 | Trusted whiteboard participants, board authority and submission persistence | Untracked; absent remotely | Pair with the collaboration authorization and persistence changes. Verify legacy room handling and recovery from failed saves. |

The documentation currently describes different boundaries:

| Artifact | Local state | Main state |
|---|---|---|
| `docs/database.md` | Verified/reviewed through 153 | Verified/reviewed through 154 |
| `docs/database/learning-critical-registry.json` | Uncommitted review marker 160; 74 objects across nine journeys | Review marker 155 |
| Linked database | Applied through 155 | Same linked project inspected |

The local registry includes additions for 156, 158 and 160. It has no entries directly citing 157 or 159. This alone is not proof that every changed object belongs in the learning-critical registry, but those migrations need an explicit coverage decision. Teacher account state and authorization helpers particularly affect the existing ownership boundaries.

The offline registry audit passes. It validates the review marker, required fields, paths and required journeys; it does not prove that every SQL change has been reviewed or applied. The audit's required journey list still contains eight journeys while the registry now contains nine.

The linked architecture audit reports 12 missing registered objects, all associated with pending migrations. It found no other blocking categories. It also reports 78 foreign-key index advisories, 58 grant/policy advisories and one usage-verification advisory. These are follow-up work, not permission to add all indexes or delete tables. In particular, `student_lesson_progress` has unverified usage.

Update the human map with a per-migration disposition through 160, including administrator audit logging and Secret Roles. Keep **reviewed locally**, **applied in the target environment**, and **last verified** separate. Retain historical audit reports and add a fresh post-release report instead of rewriting old evidence.

## Branch dispositions

Behind/ahead counts are relative to fetched `origin/main`. A fully included tip is strong evidence that its committed work has reached main, but branch removal still requires preserving uncommitted files, ignored artifacts and any needed reference history. Patch equivalence is a screening aid, not a semantic proof of integration.

### Committed work already included in main

These local tips have zero commits ahead of main:

| Branch | Recommendation |
|---|---|
| `codex/vercel-retirement` | Archive clean worktree; retire branch after keeping PR/release evidence. |
| `codex/hostinger-managed` | Archive clean worktree; retire branch. |
| `codex/hostinger-main-merge` | Retire branch. |
| `codex/infra-001` | Retire branch. |
| `codex/teacher-communications-hostinger-preview` | Retire branch; its associated checkout now holds `codex/realtime-cutover`, which needs separate review. |
| `codex/live-game-reporting-v2-current` | Retire branch; preserve the separate quarantine branch until reviewed. |
| `lesson-player-v2` | Retire branch or retain a named archival tag if useful. |
| `backup/pre-unified-quiz-builder` | Preserve as an archival tag if desired, then retire branch. |
| `seo/phase1-connected-homepage-backup` | Preserve its stashes before retiring the branch. |
| `main` | Keep; update it only when its checkout is available and clean. |

Corresponding fully included remote refs include the older English Craft, grammar layout, live-game runtime, secondary PR A/B and lesson-player branches, plus the included Hostinger/communications/Vercel branches above. Check remote existence, then remove obsolete remote branches in a deliberate batch and prune tracking refs afterward.

### Preserve and review separately

| Branch/group | Behind / ahead | Recommendation |
|---|---:|---|
| `feat/activity-builder` | 51 / 4 locally; 51 / 7 upstream | Preserve both current unfinished work and upstream commits. Recover new UI/product changes onto fresh main. Communications and Secret Roles have related implementations on main; compare before copying. Avoid replaying stale hosting configuration. |
| `codex/activity-builder-hostinger` | 51 / 7 | Same tip as activity-builder upstream. Treat as a duplicate release/build branch; preserve its untracked artifact before retirement. |
| `codex/deploy-env-guardrail` | 16 / 2 | One non-equivalent patch adds promotion checks for missing environment configuration. Review for its own PR on fresh main. |
| `codex/fix-deploy-form-origin` | 16 / 2 | One non-equivalent patch fixes dashboard form origin/referrer behavior. Review for its own PR; preserve untracked artifacts. |
| `codex/infra-002-managed-release` | 16 / 1 | Its patch is equivalent to one on main. Confirm final files and retire; do not restore its outdated migration numbering. |
| `codex/teacher-communications-preview` | 33 / 3 | Two patches are equivalent; a cross-platform test change remains flagged by patch comparison. Current main already contains a cross-platform path fix, so inspect final content before deciding whether anything remains. |
| `codex/realtime-cutover` | 7 / 1 | Review the remaining host-transport changes against main's newer Hostinger and classroom work. |
| `codex/mystery-engine-phase-1` | 54 / 1 | Preserve the separate mystery activity prototype. Give it an explicit backlog decision and fresh-main review. |
| `codex/quarantine-reporting-old-baseline` | 319 / 1 | Keep quarantined. Salvage only useful differences after comparing current reporting; do not merge its schema history. |
| `wke-preview/*` remote refs | Two snapshot branches found | Treat as deployment snapshots. Establish which is still referenced by preview/release controls before retiring. |

### Migration collisions on older branches

- Deployment branches contain `153_admin_audit_log.sql`. Current main correctly has `153_teacher_communications.sql` and `154_admin_audit_log.sql`.
- The quarantine reporting branch contains `034_live_game_reports.sql` and `035_live_game_reporting_v2.sql`, colliding with current grammar/question-set versions.
- Older branches retain duplicate versions 008, 019, 020 and sometimes 077 from before the legacy baseline consolidation.

Do not copy migration directories wholesale from these branches. Preserve the applied 001–155 history. Recover useful application changes independently and write a new migration only for an actually missing schema change.

## Worktree and stash preservation

The primary checkout and detached teacher-onboarding checkout need checkpoints before cleanup. Give the detached work a named recovery reference and preserve meaningful untracked files; a branch pointing at its current HEAD alone does not save its uncommitted content. Review ignored files too, because an ordinary Git snapshot does not preserve them.

The 13 differing application paths found in the snapshot comparison were:

- Five `packages/explore-hotspots-author` package/source files.
- `web/lib/auth/roles.test.ts`.
- `web/lib/board-game/liveblocks/auth-policy.test.ts`.
- `web/lib/build/next-output-mode.ts`.
- `web/lib/email/guardian-invitation.ts`.
- `web/lib/email/parent-notifications.test.ts`.
- `web/public/vercel.svg` and `web/vercel.json`.
- `.github/workflows/hostinger-maintenance.yml`.

The package deletion needs resolution: `web/package.json` still depends on `file:../packages/explore-hotspots-author`. Do not accept a removal without either restoring the package or completing and validating its replacement. Main's Vercel retirement already removes the two Vercel files and includes the maintenance workflow, so those differences partly reflect an older baseline.

Five stashes remain, spanning student portal/SEO, stabilization and secondary progress/auth work. Inspect them individually in isolated checkouts against current main, recover useful changes, and record their disposition before dropping them. A branch whose commits are merged can still have valuable stashed work.

Generated content deserves its own disposition: `.codex-build/` contains validation tools and logs; `.codex-finalizer/` contains production working files; `output/decks/` contains deck outputs. Preserve final educational assets and source plans in their intended locations. Add narrowly scoped ignores for reproducible scratch/build outputs after classifying them; do not blanket-delete or blanket-ignore all assets and output.

## Recommended execution order

1. **Preserve unfinished work.** Checkpoint both large dirty worktrees and inventory all five stashes. Resolve the 13 snapshot differences. Avoid blanket staging of generated tools, private configuration or content outputs.
2. **Use fresh main as the integration base.** Keep the current checkout intact during recovery. Main contains the hosting/release infrastructure the activity-builder baseline lacks. Review individual commits and file changes instead of merging old branches wholesale.
3. **Split the current batch into reviewable changes.** Suggested units: communications/outbox (156); lesson vocabulary and reviewed delivery (157/158); teacher onboarding/access and collaboration authority (159/160); remaining board-game/world/character fixes; educational deck/asset work. The access unit has broad cross-cutting application dependencies, so choose boundaries by actual imports and behavior, not migration numbers alone.
4. **Make each unit deployable.** Resolve the hotspot package deletion; install complete dependencies in the clean integration checkout; run the registry audit, focused behavior/SQL tests and full release gates. Existing isolated tests are useful evidence, but the onboarding audit explicitly says internal testing only and lists unresolved browser/provider/full-schema checks.
5. **Bring the map up to date.** Review the 157/159 coverage decisions, document the nine journeys, add a migration-status table and preserve review/application verification boundaries.
6. **Rehearse the release.** Rebuild an isolated local Supabase database from the complete canonical history and test the schema/application combinations. Verify receipt/setup email, teacher ownership, suspension/restoration with existing tokens, lesson release, student homework completion/results and whiteboard submission recovery. Do not use a remote reset.
7. **Release migrations and application changes deliberately.** Confirm the target project, backup/recovery position and exact pending list; inspect `supabase db push --dry-run`. Apply approved migrations in dependency order with one operator. Coordinate 156's queue triggers/worker and 159's access behavior with the matching application. Enable email scheduling only after the matching release is verified. Do not use history repair to mark these pending SQL changes applied.
8. **Verify and retire.** Save a post-release history comparison and linked architecture audit. Then archive finished worktrees, retire included/equivalent branches whose artifacts are preserved, decide the remaining prototype/backlog branches and stashes, and prune stale tracking refs.

## Prevent recurrence

- Start each new feature from current main with one named worktree and a short-lived branch; avoid reusing activity-builder as a permanent integration branch.
- Add `npm run audit:database:registry` to PR CI. It is available but absent from the inspected web release workflow. Add duplicate-version checks and an isolated full migration replay gate for SQL changes.
- Record each migration's purpose, dependencies, local review, intended target and applied verification. Keep linked audit results tied to the actual environment boundary rather than the newest draft registry.
- Follow the repository's existing `npm run supabase:new -- name` rule for new migrations. It produces timestamp versions and reduces concurrent numbering collisions. Keep applied legacy numbers unchanged. If the pending 156–160 files are renumbered before first release, update every SQL test, registry reference and document together after checking all environments; renumbering is not a prerequisite for this cleanup.
- The pinned CLI is 2.116.0. The current shared install is incomplete: its Windows binary package and npm shim are missing. An isolated copy of the matching platform package under the OS temporary directory enabled this audit through `SUPABASE_CLI_BINARY_OVERRIDE`; application manifests and lockfiles were unchanged. Fix the canonical installation in the clean checkout before release.
- Retain a normal backlog for measured index/grant cleanup; do not mix it into this pending feature release.

Supabase's official [migration workflow](https://supabase.com/docs/guides/deployment/database-migrations) supports local replay/testing, timestamped new migrations and a single coordinated deployer. Its [CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push) documents push planning and migration history handling.

## Evidence and limits

- [Git inventory](cleanup-git-inventory-2026-10-06.json): branch relationships, worktree status and stashes.
- [Linked metadata findings](cleanup-linked-database-2026-10-06.json): catalog counts and all findings; no application rows.
- [Existing onboarding release audit](teacher-light-release-audit.md): local validation and remaining acceptance work.
- [Merged Hostinger retirement PR #48](https://github.com/WeKnowEnglish/WKE-AuthoringTool-Elearning-Player/pull/48): release history and CI evidence.

This review queried migration history and schema metadata and ran the existing offline/linked audit scripts. The legacy baseline also checks a few historical seed-presence markers; no student or teacher records were printed. No application tests, full migration replay, migration SQL, deployment or deletion was performed. Temporary CLI dependencies and these audit artifacts were the only files created by this review, apart from Git fetch/normal CLI cache updates. Concurrent work can change worktree counts after the recorded snapshot.
