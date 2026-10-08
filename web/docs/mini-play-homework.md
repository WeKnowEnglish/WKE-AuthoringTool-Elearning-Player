# Mini play homework

The `mini_play` collection part helps students plan characters and a setting, write connected dialogue, and reread an original short play. Teachers assess the quality of the writing; completion checks only establish that the required sections are present.

## Teacher workflow

1. Open Track Builder, create or edit a Graded track for Primary or Secondary, and add **Mini play**.
2. Edit the task, section guidance, character range, minimum spoken lines, word bank, sentence starters, success criteria, and review points. Incomplete authoring drafts can be saved, but assigning requires valid content.
3. Preview the activity, save the reusable track, and assign through the existing graded assignment overlay. It supports the existing class, due-date, and student-targeting controls. Assignment content is frozen, so later changes to the reusable track do not change assigned instructions.
4. Open the class's homework collection results. Read the named characters, setting, dialogue, and stage directions. Save the existing per-activity score and feedback, with optional overall feedback.

Suggested starting objective for A1 learners: write a short conversation in which two characters respond to each other and solve a familiar problem. Start with two characters and six spoken lines. Give a model in the task/instructions and keep optional sentence starters short. Suggested 10-point review: story coherence 3, responsive dialogue 3, target language 2, readable script and stage directions 2. This rubric is teacher guidance, not a new separately scored rubric model.

## Student workflow

The student completes **Characters**, **Setting**, **Script**, and **Read my play**. Each spoken line chooses a character from the student's own list. References use stable identities, so renaming a character updates every spoken label. A character used in the script cannot be removed until their lines are reassigned or removed. Stage directions are separate lines and do not count toward the spoken-line minimum.

**Save draft** stores incomplete work on the server. Reopening the assignment restores the saved work. **Submit homework** requires a title, the teacher's character count, different names and descriptions, a place and setting description, the minimum spoken lines, and at least two speakers. Empty lines, missing speakers, invalid structured data, and duplicate identities are rejected. The student can read submitted work and the teacher's score and feedback after reopening the assignment.

Use Save draft before leaving; this version does not provide automatic local draft recovery. Submitted work is read-only. Returning a reviewed assignment for revision, collaborative writing, recording a performance, and AI grading are outside this version.

## Implementation

- `lib/homework-collections/mini-play.ts`: defaults, draft readers, bounded response data, and shared completion checks.
- `components/teacher/activity-builder/MiniPlayPartEditor.tsx`: teacher content authoring.
- `components/homework/MiniPlayPlayer.tsx`: student planning and writing.
- `components/homework/MiniPlayViewer.tsx`: shared saved-work rendering for students and teachers.
- Existing collection types, registry, scoring, grading manifest, parser, and track seeding recognize `mini_play`; grading policy is `teacher_review`.
- Existing graded assignment snapshots, attempt tables, finalization RPC, authorization, targeting, teacher review action, and review table are reused. No database migration is introduced. The target environment still needs the existing collection/review and atomic-finalization migrations (137 and 145).
- The student attempt loader now loads the student's own review for a submitted attempt, filtering both attempt identity and student identity through the existing authenticated client/RLS.
- Four answer keys are stored: `play-title`, `characters`, `setting`, and `script`. Structured sections use JSON strings in the existing answer map. Limits: 2–6 characters, up to 24 total script lines, 220 characters per line, and a 50,000-character serialized-answer allowance for JSON escaping. Other activity answer limits are unchanged.

The public `/pilots/mini-play` page is an explicitly labelled preview. It does not create assignments or persist submissions.

## Verification

`lib/homework-collections/mini-play.test.ts` covers reusable Primary/Secondary content, authoring draft persistence, assignment freezing, manual grading, structured response persistence, speaker references, completion validation, and escaped text storage. `lib/actions/mini-play-homework.integration.test.ts` exercises the real server actions and student loader with mocked storage/auth boundaries, including draft/reload/submit/review, submitted-write protection, expired sign-in, class membership, and targeting. `e2e/mini-play.spec.ts` exercises the real authoring/player/viewer components and phone overflow. These checks do not replace an authenticated smoke test against the deployment database.
