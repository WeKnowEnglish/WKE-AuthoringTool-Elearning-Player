# Libraries course map preview verification

Date: 9 October 2026 (Asia/Ho_Chi_Minh).

Status: live on Hostinger preview; the complete authenticated smoke journey passes. Ready for the teacher's manual smoke test.

## Deployment

- Preview: https://preview.weknowenglish.online/teacher/libraries/course-map
- Branch: `codex/libraries-course-map-preview`.
- Verified live application commit: `3a8312e4d35db18d814b8ae497c7ad18d3d68406`.
- Hostinger Git-triggered build: `01a11d00-4edc-70c8-9445-e5eb8b66eff1`.
- Final identical manual build: `01a11d00-850d-722b-8c16-32885fa9ab28`. Both builds completed; no pending or running preview builds remain at handoff.
- Managed Next.js standalone deployment, Node.js 24, root workspace build, `web/.next` output.
- The additive migration `20261008181637_libraries_course_maps.sql` is applied. Existing migration history was preserved.
- `/api/health` returns HTTP 200 and the verified application commit.

The isolated worktree starts from the deployed preview baseline and includes the latest main security changes. The feature brings in the focused planner generation/review/release adapters needed for the approved workflow. Unrelated unfinished work in the shared checkout was excluded.

The application commit is pushed. This post-deployment verification documentation is committed locally in the attached worktree, avoiding another Git-triggered deployment solely to record results.

## Verification already completed

- Focused Vitest: 49 tests across 9 files pass across the initial run and the corrected vocabulary-overlay rerun.
- SQL integration: 44 checks pass against real migrations/RPCs in ephemeral PostgreSQL (15 curriculum, 15 vocabulary, 14 delivery).
- Grammar validation: 172 tests across 47 files pass, also repeated by managed builds.
- Linked migration audit: 162 unique migrations; database object registry validation passes.
- Local managed production build and the first two successful Hostinger feature builds pass compilation, TypeScript, static generation and standalone packaging.
- Focused ESLint has no errors. Existing effect/ref advisories remain in the restored vocabulary integration.
- Live smoke before the final fix passes creation, persistence, mobile overflow, coverage warnings, import, generation, both material previews, explicit preparation/release and preservation of the class plan after later map edits.
- Additional live UI checks pass lesson and unit duplication, ordering, archiving and restoration, with no browser errors. The designated smoke map was restored afterwards. Local diagnostic script/log: `.codex-build/editing-recheck.mjs` and `.codex-build/course-map-editing-live-smoke.log` in the isolated and shared checkouts respectively.

The final smoke check initially found the reviewed player could display its server-rendered card before its controls were ready. The deployed fix mounts that interactive player after client readiness and shows a loading status first. The final live rerun passes the initial click and pinned playback check.

## Final live smoke

Passed: `.codex-build/course-map-smoke/2026-10-08T19-46-03-124Z/report.json` in the isolated worktree. All 9 checks pass with `browserErrors: []`. Shared-checkout log: `.codex-build/course-map-final-live-smoke-2.log`.

The script creates clearly named fixtures under the designated WKE-001 teacher/class. It assigns no homework and writes no student attempts. It creates and reopens the map, checks coverage/mobile overflow, imports the class plan, generates and opens both activities, explicitly reviews/releases, and opens/flips the pinned reviewed material after changing the course map. Desktop, mobile, planner and released-material screenshots were visually reviewed.

The successful fixture map is `50b42c08-664e-4368-9bc2-21a16b224967`; its class plan is `888e20d2-2cd7-478b-ab97-6c15477c5a18` and reviewed release is `11c6387b-8da3-44d2-a9bc-840b24c7b5e3`. These are private to the designated fixture teacher.

## Validation limits

Local Docker reset was unavailable; ephemeral SQL execution and the linked migration baseline audit were used instead.

`npm run analyze -- --webpack --experimental-build-mode compile` was run after restoring the lazy vocabulary editor. The full analysis produced the server report, including the course editor and separately emitted vocabulary workspace. Client analysis failed in the existing `next/font/google` loader while parsing a Google font URL (`loader.js:122`), so no complete client bundle-size comparison is claimed. A Hostinger attempt encountered the same font-loader error; a subsequent complete managed build passed with the unchanged font configuration. This is a build-time font integration issue to track separately.

## Pilot scope

The delivered tool is teacher-owned curriculum planning with a working class-planner handoff. Vocabulary supports frozen copies and generation of flashcards and a recognition check. Other linked resources remain planning references. Target coverage describes planned opportunities, not measured mastery. School sharing, objective-level evidence, parent summaries and mascot personalization remain later roadmap work.

Use the [implementation and manual smoke guide](./libraries-course-map-implementation.md) to test editing, ordering, duplication, archiving, conflicts and manual linking. The next product step is one real course unit with a few lessons, before whole-programme entry.
