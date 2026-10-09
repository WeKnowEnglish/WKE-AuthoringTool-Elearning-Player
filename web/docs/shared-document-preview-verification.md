# Shared document preview verification

Date: 9 October 2026, Asia/Ho_Chi_Minh.

This records the first shared-document preview release. For the current classroom
release and the combined live-video acceptance results, see
[the trial findings and release checks](./classroom-trial-smoothness.md).

## Release

- Preview: https://preview.weknowenglish.online
- Branch: `codex/classroom-shared-document-preview`.
- Application commit: `6bf9dcfdf10eaab12157d8deb7abb25c3b7d24f6`.
- Final Git-triggered build: `01a11ea7-25ca-70e3-917b-d9983dd8c9a4`.
- Identical manual build: `01a11ea7-367b-7338-bbb2-80391ebca265`.
- Both final builds completed. No pending or running preview builds remain at
  handoff; `/api/health` reports HTTP 200 and the application commit above.
- Existing Libraries/course-map, lesson-player scrolling, and Mini play preview
  changes are preserved. No database migration or dependency change was needed.

The feature is **Learn → Shared document → Start shared document** inside a
class-linked classroom. The teacher and enrolled students write in the same editor.
See [the teacher workflow and implementation guide](./shared-document-classroom.md).

## Acceptance evidence

The live preview browser journey passed all ten checks against the final application
commit. Report in this attached worktree:
`.codex-build/shared-document-smoke/mv0efke8/report.json`.

Four separate browser contexts used an authenticated teacher and three newly created,
enrolled student accounts. The checks exercised the actual classroom launch button,
document provider, authentication endpoints, and database without mocking them.

- Teacher writing appeared for all students, and simultaneous student edits merged.
- Student refresh restored writing and editing access.
- A real provider socket disconnect prevented editing and recovered all writing.
- A 390px phone viewport had a readable editor, no horizontal overflow, and a working
  Show/Hide class video toggle. Desktop and phone screenshots were visually reviewed.
- Anonymous entry and student use of teacher controls were denied.
- Collect locked all editors and saved all four participants' contributions in one
  shared submission. The database snapshot contained the expected 25 words.
- Complete removed the editor on all screens, recorded the completed round, and
  left the classroom session active.
- No browser exceptions or document/classroom API 5xx responses were recorded.

The same ten-check journey also passed locally in both classroom implementations:
compatibility shell report `mv0e1fyx` and Supabase native shell report `mv0eeutf`,
under the same ignored smoke-report directory. Disposable classes, student accounts,
and provider rooms were cleaned up; no existing class was ended or changed.

Focused Vitest: 144 tests in 19 files passed. Targeted ESLint had no errors; existing
effect/unused-variable advisories remain in classroom components. Managed hosting
checks compilation, TypeScript, static generation, and standalone packaging; its
172 grammar validation tests also passed.

## Scope

This verifies the shared document workflow. The browser journey opens the Daily
video lobby and checks the phone video-panel toggle, but does not establish a
four-person audio/video call or validate recording/transcription. Historical document
browsing after a completed class is outside this small classroom-writing feature.

The application changes and workflow guide are pushed. These final verification
notes and the more tolerant reconnect-screen assertion are committed locally to
avoid starting another deployment solely for test documentation.
