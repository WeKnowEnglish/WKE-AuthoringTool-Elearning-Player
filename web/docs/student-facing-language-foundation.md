# Student-Facing ESL Language Foundation

Primary stakeholder: students. Secondary stakeholders: teachers who author/review lessons and parents/administrators who depend on trustworthy progress evidence.

## Current Output Pipeline

1. Teacher input and saved plans enter the AI orchestration layer in `lib/ai/orchestrate-teacher-lesson.ts`.
2. Gemini prompts in `lib/ai/gemini.ts` generate lesson plans and screen payloads.
3. Screen payloads are validated by Zod schemas in `lib/lesson-schemas.ts`.
4. Player-facing parsing flows through `lib/lesson-schemas-player.ts`.
5. `components/lesson/LessonPlayer.tsx` routes parsed screens to story and interaction components.

## Student-Facing Language Surfaces

- Start screens: CTA labels, title read-aloud text, opening body text.
- Story screens: page body text, read-aloud text, smart lines, tap speech, phase dialogue, popup text, timeline text/TTS.
- Interaction screens: questions, prompts, statements, body text, options, choices, labels, hints, feedback, cloze templates, broken/corrected text, dialogue turns.
- Completion/reward screens: success messages, play-again/finish labels, reward explanations.
- Student hub and mini-game overlays: companion messages, quest labels, activity titles, results messages.
- AI generation prompts: plan output, story blueprint dialogue, reinforcement interaction payloads.

## Foundation Added

`lib/esl-language-quality.ts` is the shared ESL language-quality layer. It provides:

- a reusable student-facing ESL policy for generation prompts;
- a collector that identifies student-facing text surfaces and roles;
- a validator for high-risk grammar and classroom-language issues;
- a normalizer for whitespace and punctuation spacing;
- a summary helper for future teacher-review dashboards.

`lib/lesson-schemas-player.ts` now normalizes parsed payload text before the Lesson Player renders it. This creates a single player boundary where deeper checks can be added without touching every interaction view.

`lib/ai/gemini.ts` now injects the same ESL policy into lesson-plan and screen-generation prompts so generated output is shaped before it reaches Zod/player validation.

AI generation diagnostics now include student-facing language review issues for the exact screens returned to the editor. The Plan panel shows language issue counts and a compact report with screen number, role, path, message, and text excerpt, so teachers can review grammatically risky output even when the screen payload is structurally valid.

The lesson publish checklist now calls the same language-quality validator for all lesson screens, including manually authored screens. `severity: "error"` language issues block publishing through the shared `getLessonPublishBlockingReasons` path used by the editor and server actions; warnings remain visible for future review without blocking.

`lib/student-facing-static-copy.ts` creates the first review registry for non-payload copy from the lesson player shell, vocabulary reward screen, student hub, daily quests, pet care, explore completion, and mini-game directions. It also lists audited static-copy source areas, and tests require each audited source to have at least one registered copy entry. This makes hard-coded student-facing UI language testable with the same ESL validator and provides a migration path for future mascot, reward, and mini-game text.

`lib/student-facing-static-copy-audit.ts` adds a scanner/report helper for source text. It extracts likely student-facing literals from audited files, ignores obvious CSS/path/URL literals, and reports strings that are not represented in `STUDENT_FACING_STATIC_COPY`. Run it with `npm run audit:student-copy`; use `npm run audit:student-copy -- --fail-on-unregistered` when the remaining migration list is small enough for CI gating.

Current audit snapshot: 47 audited source files, 66 likely student-facing literals, 0 unregistered literals remaining. One documented false positive is ignored because it is a teacher/editor preview aria label rather than student-facing copy.

## Remaining Risk

- The validator catches common high-risk A1 errors, but it is not a full grammar checker.
- Some hard-coded UI strings still live outside the first static-copy registry and need migration over time; the scanner is wired to an npm report command but not yet a CI gate.
- Teacher-authored content outside lesson screen payloads can still be pedagogically weak unless the validator is surfaced inline while editing, not only at generation/publish time.
- AI outputs are prompted, reported, and blocked at publish time when errors remain, but not yet automatically repaired.

## Recommended Next Step

Add an inline language review panel to screen editing and lesson preview, then promote `npm run audit:student-copy -- --fail-on-unregistered` into CI so new student-facing literals must enter the ESL review registry.
