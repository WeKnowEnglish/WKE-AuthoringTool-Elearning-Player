# Milestone 1 Plan: Stabilize The Student Portal

Last updated: 2026-07-04

## Goal

A child can log in, arrive in a familiar home base, choose a short practice activity, complete it with clear feedback, receive visible progress, and return to the hub knowing what to do next.

This milestone is successful when the student portal feels coherent from the first click. It does not require every future adaptive-learning feature, but it must establish the foundation those features will depend on.

## Stakeholder Impact

Primary stakeholder: student

The child needs a playful, low-friction, age-appropriate practice loop. They should never feel like they are navigating an admin catalog or debugging the platform's structure.

Secondary stakeholder: teacher

Teachers need confidence that anything assigned or generated lands inside a predictable student experience. They should be able to preview the child journey and trust that completion/progress records behave consistently.

Secondary stakeholder: parent

Parents need simple signals that the student practiced, finished, struggled productively, and made progress. Milestone 1 should capture the minimum data needed for later parent summaries.

Secondary stakeholder: administrator

Administrators need a stable entry point and clean enough progress events to support future reporting, curriculum coverage, and safety review.

## Current Architecture Read

Student-facing strengths:

- `app/(student)/home/page.tsx` is already the strongest portal entry point.
- `components/student-hub/StudentHubClient.tsx` coordinates Home, Learn, Pet, Collection, Quests, Vocabulary overlays, and Explore overlays.
- `components/lesson/LessonPlayer.tsx` already acts as the canonical structured activity runtime for lessons and vocabulary practice.
- `components/kid-ui` provides a child-facing UI language.
- `lib/progress/rewards.ts` has idempotent reward events through `rewardedEventIds`.
- `lib/progress/local-storage.ts` has lesson completion and resume tracking.
- `lib/progress/word-performance.ts` has an early vocabulary performance signal.

Current friction:

- `/home` is child-friendly, but `/learn` and `/activities` still feel more like course/catalog pages than the main student portal.
- Completion and reward events are spread across `LessonPlayer`, vocabulary overlays, explore overlays, pet mini-games, daily quests, and test-start modules.
- `teststartpage` naming is still used by production vocabulary and quest code.
- Progress is split across multiple localStorage domains: progress, rewards, pet, quests, exploration, collections, and word performance.
- There is no single student-session event contract yet.
- A child can enter several activity surfaces, but the product has not formally decided which ones are first-mile production paths.

## Milestone Scope

In scope:

- Student route audit and navigation decision.
- One canonical first-mile journey.
- Minimal student practice session contract.
- Unified completion hook for production student activities.
- Visible progress refresh after activity completion.
- QA checklist for the first-mile journey.
- Documentation updates that future work must follow.

Out of scope:

- Full adaptive learning engine.
- Parent dashboard.
- Administrator analytics dashboard.
- Full migration away from `teststartpage` naming.
- Removing legacy story or presentation migration code.
- Deciding every future game mode.

## First-Mile Experience Definition

The canonical student journey for Milestone 1:

1. Student opens the app.
2. Student logs in or is redirected appropriately.
3. Student lands in `/home`.
4. Student sees a home base with a small set of meaningful choices:
   - Continue/explore
   - Word practice
   - Pet
   - Collection/awards
   - Quests
5. Student chooses one short practice path.
6. Student completes an activity with feedback and repair.
7. Student receives visible reward/progress.
8. Student returns to the hub or a clear next step.

The first production target should be:

`/home` -> `Word practice` -> vocabulary set overlay -> `LessonPlayer` -> reward/completion -> return to hub.

This is the best first target because it already uses the hub, vocabulary generator, lesson runtime, rewards, word practice, and pet study-care bridge.

Narrative direction update:

- The top-down 2D scene experience should become the primary narrative driver from the student home screen.
- The runner-style Explore spelling game is no longer a first-mile home experience. Keep its code available as legacy/prototype activity code, but do not present it as the main student-world path.
- Student home should launch scene-ready story areas only. Runner-only areas should be marked as future story areas until they are rebuilt as top-down narrative scenes.
- Board game remains an active activity prototype and future live/AI-play candidate, but it should not compete with the home narrative map.

## Workstream 1: Route And Entry-Point Coherence

Purpose: make the student experience start from one clear place.

Tasks:

- Audit all student routes under `app/(student)`.
- Mark each route as one of:
  - primary child route
  - supporting child route
  - legacy/catalog route
  - teacher/admin leakage risk
  - candidate redirect
- Decide the role of these routes:
  - `/`
  - `/home`
  - `/learn`
  - `/learn/course/[courseSlug]`
  - `/learn/[moduleSlug]`
  - `/learn/[moduleSlug]/[lessonSlug]`
  - `/activities`
  - `/activities/[activityId]`
  - `/profile`
- Prefer `/home` as the authenticated student landing route.
- Decide whether `/learn` should:
  - remain a course catalog,
  - redirect into `/home` with the Learn room active,
  - become a child-friendly course room,
  - or be teacher/coursework-only and de-emphasized.
- Decide whether `/activities` is production student-facing or a teacher/library preview surface.

Deliverables:

- A route inventory table in docs.
- Redirect/navigation decisions recorded.
- Any route that remains student-facing must meet kid UI and first-mile expectations.
- Current route inventory: [Milestone 1 Route Inventory](./milestone-1-route-inventory.md).

Acceptance criteria:

- A logged-in student has one obvious home base.
- There is no first-mile path where a child lands in a teacher-style catalog by accident.
- Every student route has a documented purpose.

## Workstream 2: Canonical Student Session Contract

Purpose: all production activities should report the same essential events.

Create a minimal contract before refactoring all activities:

```ts
type StudentPracticeSessionEvent =
  | {
      type: "session_started";
      sessionId: string;
      activityId: string;
      activityKind: StudentActivityKind;
      source: StudentActivitySource;
      startedAt: string;
    }
  | {
      type: "attempt_recorded";
      sessionId: string;
      targetId?: string;
      success: boolean;
      responseKind?: "tap" | "drag" | "type" | "speak" | "listen" | "match" | "other";
      attemptsForTarget?: number;
    }
  | {
      type: "hint_used";
      sessionId: string;
      targetId?: string;
      hintLevel?: number;
    }
  | {
      type: "reward_awarded";
      sessionId: string;
      eventId: string;
      goldDelta: number;
      experienceDelta: number;
    }
  | {
      type: "session_completed";
      sessionId: string;
      completedAt: string;
      result: "completed" | "exited" | "replayed";
      summary: StudentPracticeSummary;
    };
```

Minimum metadata:

- `activityId`
- `activityKind`: vocabulary set, lesson, explore run, pet mini-game, activity-library item
- `source`: hub, course lesson, quest, pet, collection, direct link
- `languageTargets`: words, structures, skills, CEFR band where available
- `durationEstimateSec`
- `scaffoldingLevel`
- `rewardPolicy`

Milestone 1 implementation target:

- Add the types and a local runtime helper, even if the first version writes only local events or dispatches in-memory callbacks.
- Wire the vocabulary set overlay as the pilot.
- Keep existing reward/progress storage intact, but route the pilot completion through the new helper.

Deliverables:

- `lib/student-session` or `lib/progress/student-session` module.
- Unit tests for event construction, idempotent reward event IDs, and completion summaries.
- Pilot integration for vocabulary set completion.

Acceptance criteria:

- A vocabulary practice run can produce start, attempt, reward, and completion events.
- Rewards remain idempotent.
- The hub can refresh progress from one completion callback.
- The contract is small enough to support explore and pet next.

## Workstream 3: First Production Practice Loop

Purpose: make one loop polished enough to be the model for all others.

Pilot loop:

`StudentHubClient` -> `LearnRoom` -> `VocabularySetOverlay` -> `LessonPlayer` -> reward screen -> close -> hub state refresh.

Tasks:

- Define the vocabulary run's learning objective at launch.
- Ensure the child sees:
  - what they are practicing,
  - how many steps remain,
  - immediate correct/wrong feedback,
  - a friendly completion state,
  - and visible updated rewards/progress.
- Ensure wrong attempts support repair.
- Ensure closing or replaying has clear behavior.
- Make completion update:
  - rewards,
  - daily quest progress,
  - word performance,
  - study-care pending state,
  - exploration/collection state where applicable.
- Add a first-mile QA script for this loop.

Deliverables:

- Vocabulary loop QA checklist.
- One pilot run path verified manually.
- Tests for completion callback behavior where feasible.

Acceptance criteria:

- The child can complete a vocabulary set in under 8 minutes.
- Completion returns the child to a sensible hub state.
- Progress visibly changes without a page refresh.
- Closing mid-activity does not falsely mark completion.

## Workstream 4: Progress And Reward Consistency

Purpose: prevent the product from teaching children to chase rewards instead of learning.

Tasks:

- Inventory all reward writers:
  - `awardRewards`
  - `awardRewardsWithMeta`
  - `applyTestStartQuizCorrectAnswer`
  - pet mini-game reward calls
  - explore completion rewards
  - daily quest rewards
  - lesson completion rewards
- Define reward rules:
  - completion reward
  - correct-answer reward
  - repair/no-reward behavior
  - replay behavior
  - daily quest bonus
  - level-up bonus
- Ensure event IDs are stable enough for idempotency.
- Define how lesson completion differs from vocabulary set completion.
- Decide whether `completedLessonIds` should include synthetic `vocab-*` lesson IDs long term or whether vocabulary completion needs its own domain.

Deliverables:

- Reward policy section in the milestone doc or source-of-truth doc.
- Tests for replay/idempotency on the pilot loop.
- A short list of reward calls to migrate in Milestone 2.

Acceptance criteria:

- Completing the same run twice cannot accidentally double-award one-time rewards.
- Replays can still be fun without corrupting mastery signals.
- Rewards are tied to effort and practice, not just opening/closing an overlay.

## Workstream 5: Hub UX Stabilization

Purpose: the hub should feel like a home base for a child, not a menu of app modules.

Tasks:

- Review Home, Learn, Pet, Collection, and Quest rooms through a child lens.
- Limit first-screen cognitive load.
- Ensure buttons use child-facing labels:
  - "Word practice" is probably clearer than "Learn" for the current implementation.
  - "Awards & skills" may need child testing later.
- Confirm locked content communicates "not yet" rather than "broken".
- Ensure every overlay has a safe close path.
- Ensure sound mute, sign out, and quest controls do not dominate the child task.

Deliverables:

- Hub UX checklist.
- Copy decisions for first-mile labels.
- Any critical UI fixes discovered during QA.

Acceptance criteria:

- A child can identify the next practice action within 5 seconds.
- The hub has no dead-end controls.
- Locked states are understandable.
- The hub state refreshes after completion.

## Workstream 6: QA, Testing, And Release Gates

Purpose: make the first-mile stable enough to build on.

Automated tests to add or verify:

- Student session helper tests.
- Reward idempotency tests for pilot vocabulary completion.
- Route/redirect helper tests if route logic changes.
- Existing `LessonPlayer` and vocabulary tests remain green.

Manual QA script:

1. Log in as a student.
2. Confirm redirect lands on `/home`.
3. Open Word practice.
4. Choose an unlocked vocabulary set.
5. Complete a run with at least one wrong answer.
6. Confirm feedback allows repair.
7. Confirm reward/completion screen appears.
8. Close or finish.
9. Confirm hub gold/XP/quest/pet state refreshes.
10. Reload the page and confirm progress persists.
11. Replay the same set and confirm rewards do not duplicate incorrectly.
12. Test mobile viewport and desktop viewport.

Release gates:

- No broken authenticated student route.
- No teacher-only interface in the primary child journey.
- No false completion on early close.
- No obvious duplicate reward bug.
- No activity overlay trapping the child without close/back.
- No severe mobile layout overlap on the pilot loop.

## Implementation Sequence

### Step 1: Route Inventory

Create a route table and decide the role of each student route. This is mostly documentation plus small redirects if needed.

### Step 2: Session Contract RFC

Add the TypeScript contract and pure helper tests. Keep it small.

### Step 3: Vocabulary Pilot

Wire vocabulary set runs into the contract. Preserve current behavior while adding unified events.

### Step 4: Hub Refresh Tightening

Make sure completion updates the visible hub state consistently. Fix stale state paths around rewards, quests, study-care pending, and exploration.

Also simplify the visible home activity model:

- Remove runner-style Explore spelling run entry points from the student home screen.
- Use top-down 2D scene areas as the primary story-world interaction.
- Treat non-scene explore areas as coming-soon story areas until rebuilt.

### Step 5: QA Pass

Run automated tests, then manually verify the first-mile script on mobile and desktop.

### Step 6: Milestone Review

Update this document with what was completed, what changed, and what should move to Milestone 2.

## Key Product Decisions Needed

Decision 1: Is `/home` the only authenticated student landing page?

Recommendation: yes. Use `/home` as the portal and let other routes support deep links or teacher-assigned lessons.

Decision 2: What should `/learn` be?

Decision: redirect `/learn` to `/home?room=learn` for Milestone 1. Do not leave it as the main first-mile path while it feels like a catalog.

Decision 3: Is `/activities` student-facing?

Recommendation: treat it as a preview/library route until it is redesigned. It currently uses teacher preview components and read-only catalog language, so it should not be promoted as the primary child path yet.

Decision 4: Should vocabulary completion write `completedLessonIds`?

Recommendation: keep the current behavior short term for compatibility, but introduce vocabulary-specific completion events so Milestone 2 can separate lesson completion from practice-run completion.

Decision 5: Should board-game work enter Milestone 1?

Recommendation: no. Keep it out of Milestone 1 unless it is already blocking student route coherence. Review it separately before deciding whether it becomes a lesson mode, explore mode, or archived prototype.

## Risks

- Refactoring progress too broadly could destabilize many existing games.
- Redirect changes could break teacher previews or deep links.
- A new event contract could become too abstract too early.
- Reward changes could accidentally make children lose earned progress.
- Vocabulary and quest code still using `teststartpage` names may obscure ownership.

Mitigations:

- Pilot with vocabulary only.
- Keep existing storage formats during Milestone 1.
- Add pure tests before UI refactors.
- Avoid deleting legacy code during this milestone.
- Record all route decisions before changing navigation.

## Definition Of Done

Milestone 1 is done when:

- `/home` is documented and implemented as the student portal home base.
- Student routes have documented roles.
- One vocabulary practice loop is polished, tested, and stable.
- A minimal student-session contract exists.
- The vocabulary pilot reports through that contract.
- Rewards and completion are visibly consistent in the hub.
- Early close, replay, wrong answers, and completion have known behavior.
- Manual QA passes on desktop and mobile.
- Follow-up work for Milestone 2 is documented.

## Milestone 2 Handoff

Milestone 2 should start by expanding the student-session contract from the vocabulary pilot to:

- Explore runs
- Pet mini-games
- Course lessons
- Activity library items
- Daily quests

It should also begin the naming cleanup from `teststartpage` into production domains once the behavior is covered by tests.
