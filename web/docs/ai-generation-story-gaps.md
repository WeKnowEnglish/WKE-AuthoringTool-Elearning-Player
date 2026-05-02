# AI lesson generation: story gaps and follow-ups

This note summarizes how **plan → screens** works today, why **interactive story** screens may disappear or look bare, and recommended next steps.

## Pipeline (short)

1. **Draft / Enhance** fills `lesson_plan` + `lesson_plan_meta` (`screenOutline` with rich page hints).
2. **Generate activities** calls `resolveLessonPlanForGeneration` (prefers DB meta), then `generateLessonScreensFromPlan` (Gemini), then **`parseScreensWithDiagnostics`** (Zod).
3. **Only payloads that pass Zod** are returned; failures are listed in **`generationWarnings`** on the generate API response and surfaced in the Plan panel toast after append.

## Why story screens vanish but quizzes remain

- **`storyPayloadSchema` / `storyPageSchema`** enforce strict graphs: duplicate item ids, phase rules (`exactly one is_start`), `next_phase_id` / `visible_item_ids` / completion refs must point at real item/phase ids, etc.
- **Gemini** often emits incomplete or inconsistent phased JSON.
- **Interactions** (`click_targets`, `mc_quiz`, …) are usually simpler and pass validation.
- Result: **`parseWarnings`** accumulate for `story` rows; **`screens`** may contain only interactions — matching a storyboard that jumps straight to “Animal ID” after Start.

## Why images are placeholders

- `buildMediaAllowlistForPlan` searches the teacher media library from plan keywords + vocabulary. Empty or weak search results → the prompt tells the model to use **placehold.co**.
- The model may still invent a generic placeholder URL instead of copying numbered URLs from **MEDIA LIBRARY** in the prompt.

## Player behavior (phases / animations)

- **`phasesExplicit`** is true only when a page has a non-empty **`phases`** array in stored JSON. Otherwise the player uses a synthetic legacy phase (no phased tap/on_enter behavior).
- **`on_enter`**, **`idle_animations`** must appear in the emitted JSON; outline **`animation_hint`** is not auto-mapped.

## Implemented observability

- **`parseScreensWithDiagnostics`** in `lib/ai/gemini.ts` returns `{ screens, parseWarnings }`.
- **`POST /api/teacher/ai/generate`** includes **`generationWarnings`** (same strings).
- **Plan panel** appends a short hint when warnings exist.

## Recommended next steps (priority)

1. **Prompt + examples**: In `generateLessonScreensFromPlan`, require a **minimal valid phased page** pattern (one `is_start`, `completion` + `next_phase_id` chain, `items` with ids matching `target_item_id`) and forbid extra phase complexity until tests pass.
2. **`coerceGeminiStoryPayload` expansion**: Strip invalid phases, dedupe `is_start`, drop broken refs, or collapse to single-phase pages when validation would fail (keeps *some* story instead of dropping the whole screen).
3. **Two-pass or repair**: Optional second Gemini call: “fix this story JSON to satisfy schema” using Zod error text.
4. **Media**: Log allowlist size in dev; prompt line “copy background_image_url from list items 1–N only”; post-process to substitute first allowlist URL when model uses generic placeholder hosts.
5. **Stricter preflight**: If `screenOutline` expects N story rows but parsed output has 0 story screens, return **4xx** or a blocking warning so teachers don’t assume success.

## Files of interest

- `lib/ai/gemini.ts` — generation prompt, `parseScreensWithDiagnostics`
- `lib/ai/orchestrate-teacher-lesson.ts` — allowlist, orchestration
- `lib/lesson-schemas.ts` — `storyPageSchema`, phase `superRefine`
- `components/lesson/StoryBookView.tsx` — `phasesExplicit` gating
