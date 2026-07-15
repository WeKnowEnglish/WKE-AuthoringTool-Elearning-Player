# Cursor Handoff: Live Game Reporting, Performance, and Next Development Phase

Last updated: 2026-07-14  
Workspace: `web/`  
Current branch: `codex/live-game-class-project-foundation`  
Current commit: `efc6047 feat(live-game): optimize reporting and diagnostics`

## Purpose

This is the working handoff for the next Live Game development phase. Read this document before changing the Live Game runtime, reports, Supabase migrations, authentication, or teacher experience.

The product goal is a cooperative learning adventure where questions are part of the game actions. Educational evidence must remain more important than ranking, and teacher activity must never be presented as student mastery.

## Repository and Release State

- Commit `efc6047` is pushed to `origin/codex/live-game-class-project-foundation`.
- The branch is clean and synchronized with its remote, but it is not yet merged into `main`.
- `origin/main` was at `208cf24` during this handoff.
- Create the next feature branch only after the current branch is merged and local `main` is updated.
- Supabase migration `044_live_game_diagnostic_events.sql` still needs to be applied before the production diagnostic export is used.
- Do not rerun migrations `041`-`043` merely because they are present in the branch. Verify the migration ledger and deployed relations first.
- Do not use `supabase db push` until the historical migration ledger and duplicate numeric migrations have been explicitly baselined.

### Local cleanup before the next branch

1. Merge `codex/live-game-class-project-foundation` into `main`.
2. Update local `main` from `origin/main`.
3. Delete the superseded local `codex/live-game-reporting-v2-current` branch after the merge is verified.
4. Keep `codex/quarantine-reporting-old-baseline` until there is an explicit decision to delete the quarantined work.
5. Remove the stale `.git/info/exclude` rules that still describe Live Game diagnostics as local-only. Those files are now intentionally tracked.
6. Run `npm run clean`; the local `.next` directory was approximately 1.49 GB at handoff.

## Product Snapshot

### Existing game

The first Live Game mode is **English Craft**. Teachers host a room, students join with a code, and everyone collaborates to escape the island.

The learning interactions are attached to game actions:

| Game action | Learning interaction |
| --- | --- |
| Harvest a resource | Multiple choice |
| Deposit a carried resource | Spelling / letter arrangement |
| Craft an item | Sentence ordering |

The current loop includes multiplayer movement, four resources, carrying, deposits, shared storage, crafting, hunger/bread, workbench and boat milestones, timed rounds, and cooperative boat escape.

### Current stakeholder behavior

- **Student:** joins with a code, plays, answers questions, contributes resources, and receives a private end-of-round question review.
- **Teacher:** uses an authenticated teacher account, creates and controls the room, may participate in play, and receives a non-ranked class report.
- **Class:** a teacher may link a room to a class project or run a one-off game.
- **Parent/administrator:** no dedicated Live Game reporting view exists yet.

## What Was Completed in the Current Pass

### Reporting V2

- Replaced the single-winner summary with per-round learning evidence.
- Records question encounters, attempts, retries, response time, resolution, learning targets, game action, and awarded contributions.
- Supports harvest, deposit, and craft question types.
- Keeps skips and unfinished encounters as evidence.
- Finalizes objective-completed, timed-out, and host-ended rounds idempotently.
- Student responses contain only that student's private evidence.
- Host responses contain an alphabetical, non-ranked class view.
- Teacher activity now appears separately and is excluded from student totals, class learning targets, and student question diagnostics.
- Class-linked rounds contribute idempotently to the class's `English Craft Expeditions` project.

Primary files:

- `lib/live-game/reports/aggregate.ts`
- `lib/live-game/reports/types.ts`
- `lib/live-game/server/report-repository.ts`
- `app/api/live-game/sessions/[sessionId]/report/route.ts`
- `components/live-game/LiveGameEndReportOverlay.tsx`
- `supabase/migrations/041_live_game_reporting_v2.sql`
- `supabase/migrations/042_live_game_class_projects.sql`
- `supabase/migrations/043_optimize_live_game_reporting.sql`

### Reporting performance and correctness

- Challenge prefetch no longer creates false report encounters.
- A prefetched challenge is promoted to a real encounter when the question is actually opened.
- Encounter creation, attempt recording, and round finalization use atomic Supabase RPCs.
- The report GET route is read-only; the game controller owns finalization.
- Correct-answer challenge bookkeeping and reporting writes run concurrently where safe.
- Report loading retries short finalization races instead of failing immediately.

Primary files:

- `app/api/live-game/encounter/open/route.ts`
- `lib/live-game/open-question-encounter.ts`
- `supabase/migrations/043_optimize_live_game_reporting.sql`

### Question latency work

- Question bundles are preloaded and request-deduplicated.
- Harvest, deposit, and craft prefetches are retained when their matching modal opens.
- Prefetched questions display while the reporting encounter is recorded in the background.
- Answer submission still waits for encounter recording, preserving evidence integrity.
- Position synchronization is shared when safe and cached briefly.
- Actual interactions force a precise position confirmation.
- If a click occurs while an older prefetch position request is active, a second synchronization publishes the exact click position.
- The cache stores the coordinates sent to the server, not the character's later position when the request finishes.

The last measured successful timings were approximately:

| Operation | Observed range |
| --- | ---: |
| Position synchronization | 365-592 ms |
| Harvest question request | 494-653 ms |
| Deposit question request | 529-1,183 ms |
| Harvest answer assessment | 863-993 ms |
| Deposit answer assessment | 922-1,102 ms |
| Final report request | 518 ms |

The remaining proximity errors in the last diagnostic run were traced to a prefetch/click position race and fixed after that run. This fix still requires another live verification.

### Authentication safeguards

- `/live-game/host` requires an authenticated teacher.
- Logged-in students see a disabled teacher-only host control.
- Direct student navigation to the host route returns safely to `/live-game`.
- Post-login routing rejects teacher-only Live Game destinations for students.
- Teacher login may correctly return to `/live-game/host`.

Primary files:

- `app/live-game/page.tsx`
- `app/live-game/host/page.tsx`
- `lib/auth/post-login-path.ts`

### Diagnostics

Development diagnostics cover the journey from teacher dashboard entry through room creation, join, lobby, gameplay, exit, finalization, and report rendering.

- Development displays an orange expandable diagnostics header.
- The panel includes phases, timings, errors, question attempts, rejected attempts, and JSON export.
- Production does not display the orange panel.
- Production silently uploads diagnostic events every three seconds unless `NEXT_PUBLIC_LIVE_GAME_DIAGNOSTICS=0`.
- Stored production diagnostics remove the student's typed `selectedAnswer`.
- Upload batches, event size, timestamp, role, and duration are bounded.
- Rows are private, service-role only, and cleaned after 14 days.
- The host report contains an **Export diagnostics** button.
- Export requires both the signed Live Game host session and the matching authenticated teacher account.
- Export returns up to 5,000 chronological room events.

Primary files:

- `components/live-game/LiveGamePerformancePanel.tsx`
- `lib/live-game/diagnostics/`
- `app/api/dev/live-game-diagnostics/route.ts`
- `app/api/live-game/diagnostics/route.ts`
- `supabase/migrations/044_live_game_diagnostic_events.sql`

## Architecture Boundaries

### Liveblocks owns ephemeral gameplay

Keep these temporary:

- Player positions and Presence
- Current carries and resource pool
- Nodes, crafting state, hunger, boat state
- Active room phase and timer

### Supabase owns persistent evidence and teacher/class data

Keep these durable:

- Question sets and published versions
- Challenges needed across server instances
- Report rounds, participants, encounters, attempts, support events
- Class project contributions
- Production diagnostic events
- Future teacher profile and collection state

Do not move learning evidence back into Liveblocks. Do not store durable teacher progression only in browser storage.

### Key runtime routes

| Route | Responsibility |
| --- | --- |
| `/live-game` | Role-aware entry |
| `/live-game/host` | Teacher setup |
| `/live-game/join` | Student join |
| `/live-game/[sessionId]` | Lobby, gameplay, report |
| `/api/live-game/challenge` | Harvest challenge |
| `/api/live-game/deposit/challenge` | Deposit challenge |
| `/api/live-game/craft/challenge` | Craft challenge |
| `/api/live-game/encounter/open` | Promote prefetched question into report evidence |
| `/api/live-game/*/answer` | Validate, award, and record attempts |
| `/api/live-game/control` | Start, add time, end, replay/close control |
| `/api/live-game/sessions/[sessionId]/report` | Private report response |
| `/api/live-game/diagnostics` | Private production diagnostic upload/export |

## Database State

Relevant migration order:

1. `035_live_game_question_sets.sql`
2. `036_seed_live_game_question_sets.sql`
3. `037_live_game_challenges_question_set.sql`
4. `038_live_game_question_sets_teacher_rls.sql`
5. `039_secure_live_game_question_access.sql`
6. `040_issue_live_game_challenge_rpc.sql`
7. `041_live_game_reporting_v2.sql`
8. `042_live_game_class_projects.sql`
9. `043_optimize_live_game_reporting.sql`
10. `044_live_game_diagnostic_events.sql`

Migration `041` contains compatibility handling for the old `live_game_question_attempts` shape. Do not manually recreate or rename reporting tables without reading that migration and `docs/live-game/reporting-v2.md`.

## Validation Snapshot

The shipped commit passed:

- `npm run typecheck`
- Targeted ESLint for changed Live Game and authentication files
- 51 relevant test files / 255 tests
- `npm run build`

The production build may need internet access because `next/font` fetches Nunito from Google Fonts. There is also a pre-existing Turbopack NFT warning from a development path-picks route; it did not fail the successful build.

Recommended verification commands:

```bash
npm run typecheck
npm test -- --run lib/live-game components/live-game app/api/live-game lib/auth/post-login-path.test.ts
npm run build
```

## Required Release-Readiness Gate

Complete this before building the next major feature:

1. Apply migration `044` to the target Supabase project.
2. Deploy the current branch after it is merged.
3. Run one five-minute production game with:
   - one authenticated teacher host;
   - one authenticated student;
   - optionally one guest student.
4. Exercise at least 20 interactions across harvest, deposit, and craft.
5. Submit correct, incorrect, retry, and skip outcomes.
6. End once by timer and once manually in separate rounds.
7. Export diagnostics from the teacher report.
8. Confirm a student cannot call the production diagnostic export endpoint.
9. Reconcile:
   - student encounter totals;
   - teacher encounter totals;
   - accepted submissions;
   - rejected submissions;
   - contributions;
   - report resolution counts.

Release targets:

- No false `Move closer` rejection after a valid interaction click.
- No duplicate report encounters from prefetch.
- Teacher work is visible but excluded from student/class mastery evidence.
- Median question request below 750 ms after warm-up.
- P95 question request below 1.5 seconds.
- P95 answer assessment below 1.5 seconds.
- Final report visible within 2 seconds after finalization in production.
- Teacher diagnostic export succeeds and student export returns `403`.

## Recommended Next Development Phase

The strategic roadmap order remains:

> Reporting validation -> Teacher foundation -> In-game teacher help -> New game modes

Teacher accounts already exist, and class-project persistence has started. Do not rebuild authentication. The next feature phase should be **Teacher Foundation MVP**.

### Teacher Foundation MVP objective

Make the teacher feel like a recognizable expedition leader with persistent ownership, while preserving the distinction between teacher play and student evidence.

### Proposed deliverables

1. **Distinct teacher identity in the room**
   - Teacher-only avatar or visual treatment.
   - Host badge/nameplate visible to students.
   - Teacher identity remains clear in lobby, gameplay, and report.

2. **Persistent teacher profile foundation**
   - Store teacher Live Game profile data in Supabase.
   - Reuse the existing authenticated teacher ID.
   - Do not create a parallel account system.
   - Start with display preferences and selected teacher avatar; avoid a large cosmetic economy.

3. **Class-project continuity**
   - Build on `English Craft Expeditions` rather than creating another project table.
   - Show completed rounds, team escapes, latest objective, and unfinished/next milestone in a simple teacher-facing view.
   - Keep class-owned progress separate from permanent teacher-owned collections.

4. **Prepare for teacher help without building the entire help system**
   - Preserve the existing encounter fields for hints, help requests, and teacher support level.
   - Define the private teacher-to-student assistance contract.
   - Do not expose correct answers or another student's response to students.

### Teacher Foundation acceptance criteria

- Students can immediately identify the teacher in the shared room.
- Teacher identity persists across sessions.
- A teacher can select a class project and see its persistent English Craft history.
- Teacher gameplay remains separate from student learning totals.
- No new persistence is placed in Liveblocks or local storage when it belongs to an account or class.
- Existing room creation, join, reporting, and diagnostics tests remain green.

## Phase After Teacher Foundation

Build the first **In-Game Teacher Help MVP** on top of the report evidence model:

- Student requests help privately.
- Teacher sees the student's current question, time spent, attempts, hints, and learning target.
- Teacher sends encouragement or a structured hint.
- Teacher can remove one distractor or reveal one part.
- Teacher can replace or skip a broken question.
- Assistance level is persisted in reporting.
- Supported completion still advances the cooperative game but does not count as independent mastery.

Do not begin Dino Dig until Reporting V2 is production-validated and the teacher-help evidence contract is stable.

## Important Non-Goals

- Do not add winners, rankings, or leaderboards to the learning report.
- Do not count teacher answers as student/class mastery.
- Do not recreate teacher authentication.
- Do not build a separate reporting event system.
- Do not make diagnostic data publicly readable.
- Do not store student typed answers in production diagnostics.
- Do not build Dino Dig, Reef Repair, or Mystery Museum before the shared teacher/help foundations are stable.
- Do not rewrite English Craft into a new engine during the next phase.

## Cursor Starting Checklist

1. Read `AGENTS.md`.
2. Read this handoff.
3. Read:
   - `docs/live-game/README.md`
   - `docs/live-game/product-framing.md`
   - `docs/live-game/reporting-v2.md`
   - `docs/live-game/architecture.md`
4. Confirm migration `044` is applied in the target environment.
5. Confirm the current branch is merged and start from updated `main`.
6. Run the release-readiness production test before implementing Teacher Foundation MVP.
7. Write a narrow implementation plan with stakeholder outcomes and acceptance tests before changing the schema or UI.

## One-Sentence Direction

Students play cooperative English adventures; teachers guide those adventures, receive trustworthy learning evidence, and preserve what their classes build over time.
