# Secret Roles live activity

Status: functional vertical slice implemented on `feat/activity-builder`; migration 155 applied; authenticated browser pilot still required
Working name: **Secret Roles**
Primary stakeholders: students and teachers; secondary stakeholders: parents and school leaders through later progress evidence

## Product decision

Build a reusable private-information activity, not a literal Werewolf clone. A teacher gives every student a role card containing information and a communication mission. Students question one another, form an evidence-based decision, and explain their reasoning. Nobody is eliminated: every learner speaks, listens, decides, and joins the debrief.

This preserves the motivating parts of social deduction while better serving language learning, psychological safety, and classroom participation.

## Learning design

The activity should make these outcomes measurable:

- use a target question or sentence frame in a real information gap;
- listen for specific details and record useful evidence;
- ask at least one follow-up question;
- make a claim and justify it with evidence;
- reflect on which clue or language move changed the group's thinking.

Recommended first template: **The Missing Bag** for CEFR A1–A2.

- Scenario: a bag moved during break time.
- Roles: witnesses with partial clues, a helpful student who moved it, and optional red-herring observers.
- Language: past simple at A2; present/past location frames at A1.
- Decision: “Who moved the bag, and why?”
- Success criteria: ask two classmates, use one follow-up question, and support the final answer with one clue.

## Complete teacher flow

1. Open **Activity → Live activities → Secret Roles** inside the active Virtual Classroom.
2. Choose a saved template or enter title, scenario, learning objective, success criteria, and decision prompt.
3. Add role cards. Each card has a role name, private information, mission, sentence frames, and number of copies.
4. Review the live roster. The launch check blocks if there are fewer card copies than students.
5. Choose automatic assignment or manually pin selected cards to students.
6. Launch into **Briefing**. The teacher sees the assignment matrix and readiness, never on the shared projector by default.
7. Move the class through **Discussion**, **Decision**, **Reveal**, and **Debrief**.
8. Complete the round. Students return to the classroom Activity stage; the classroom session remains active.

The teacher dashboard should always show absent/late students, ready count, submitted decisions, and a safe “assign late joiner” action.

## Complete student flow

1. The Activity stage changes to a private “Your role is ready” screen.
2. The student reveals their card locally and reads the private information and mission.
3. They can mark **Ready**. The teacher sees readiness only, not whether the card is expanded.
4. During Discussion they keep their card available and use the sentence frames. The screen reminds them: “Share ideas in your own words. Do not show your card.”
5. During Decision they submit an answer and one short reason.
6. During Reveal they see the class answer and the complete role map only when the teacher reveals it.
7. During Debrief they complete one retrieval/reflection prompt.

## Phase contract

| Phase | Student action | Teacher action | Shared evidence |
| --- | --- | --- | --- |
| Briefing | Privately read card; mark ready | Check coverage and readiness | Ready count only |
| Discussion | Ask, answer, and note clues | Coach language; add time | Timer and phase |
| Decision | Submit claim + reason | Watch submission count | Submission count only |
| Reveal | Compare conclusion with full story | Reveal roles in a controlled order | Role map after reveal |
| Debrief | Reflect or retry a sentence | Highlight evidence and language | Model response / reflection |
| Completed | Return to class | Continue the live lesson | Summary record |

Backward moves are permitted before Completed, but changing assignments after Discussion starts is not. Pause is a classroom timer concern rather than a separate activity phase.

## Technical architecture

Use the existing Virtual Classroom as the parent session and register a new active activity kind, `secret_roles`.

The shared `activeActivity` object contains only:

```ts
{
  kind: "secret_roles",
  joinCode: roundId,
  roundId,
  label: title,
  roomId: null
}
```

Never put cards, assignments, answers, or role names in Liveblocks storage, Presence, Supabase Broadcast payloads, browser storage, HTML data attributes, or query strings. The signed `wke-vc-member` cookie is the student identity boundary.

Persistence is introduced by migration `155_secret_role_rounds.sql`:

- `secret_role_rounds`: public prompt, phase, settings, and lifecycle timestamps;
- `secret_role_cards`: teacher-authored private card content;
- `secret_role_assignments`: one server-side card assignment per student;
- `secret_role_responses`: one claim/reason response per student.

All four tables are service-role only. Student and teacher pages call Next.js routes. A student route verifies the Virtual Classroom member cookie matches the round's session, then selects by both `round_id` and `student_id`. The response is built with `toSecretRoleStudentView`; it cannot contain the assignment collection.

### API surface

- `POST /api/virtual-classroom/[sessionId]/secret-roles`
  - host only;
  - validates content and current roster;
  - creates the round, cards, and assignments in one database transaction/RPC;
  - sets `activeActivity.kind = "secret_roles"` and Learn stage to Activity.
- `GET /api/secret-roles/[roundId]/me`
  - member cookie only;
  - returns public round fields plus exactly one private card.
- `POST /api/secret-roles/[roundId]/ready`
  - member cookie only; idempotently records readiness.
- `POST /api/secret-roles/[roundId]/response`
  - member cookie only; accepts answer/reason only during Decision.
- `GET /api/secret-roles/[roundId]/host`
  - session host only; returns all assignments, readiness, and responses.
- `POST /api/secret-roles/[roundId]/commands`
  - session host only; phase transition, late-join assignment, reveal, complete.

For the first release, clients may poll `me`/`host` every 1.5–2 seconds while the activity is visible. This is simpler and safer than introducing a second realtime authority. A later slice can broadcast only `{ roundId, phase, version }`, followed by an authorized refetch.

### Integration points

1. Add `secret_roles` to `VirtualClassroomActivityKind`, metadata, interaction config, registry, active-activity routing, initial storage, runtime snapshot normalization, and server activity setters.
2. Add a **Live activities** block to `VirtualClassroomLearnStage` for hosts. Launching Secret Roles selects the Activity tab for everyone.
3. Render `SecretRolesSessionView` directly in the Activity stage when the active kind is `secret_roles`; do not use the Studio `LessonPlayer`.
4. Keep standalone fallback routes at `/secret-roles/[roundId]` and `/teacher/secret-roles/[roundId]` for reconnects and debugging.
5. Completing a round clears `activeActivity` but does not end the Virtual Classroom session.

## Implemented vertical slice

- `lib/secret-roles/domain.ts`
  - phase vocabulary;
  - deterministic, retry-safe assignment;
  - copy-count validation;
  - public and single-student privacy projections.
- `lib/secret-roles/domain.test.ts`
  - assignment determinism and completeness;
  - insufficient-card launch failure;
  - proof that another student's secret cannot enter the student response shape.
- `supabase/migrations/155_secret_role_rounds.sql`
  - service-only round, card, assignment, and response storage;
  - atomic launch RPC so a partial assignment can never become visible.
- `app/api/virtual-classroom/[sessionId]/secret-roles` and `app/api/secret-roles/[roundId]/*`
  - host-authorized launch and phase control;
  - member-cookie student projection, ready signal, and decision submission;
  - host overview plus explicit late-join assignment.
- `components/secret-roles/*`
  - editable Missing Bag launch panel with roster coverage checks;
  - private student card, speaking supports, decision, reveal, and debrief;
  - teacher readiness/submission dashboard and phase controls.
- Virtual Classroom runtime and Activity-stage integration
  - registered `secret_roles` activity kind;
  - compatible with both current classroom shells;
  - completion clears only the activity and leaves the classroom running.

## Remaining implementation order

Each step should leave tests and typecheck green.

1. Apply migration 155 to the linked preview and verify the atomic RPC through the launch route. The preview's existing admin-audit migration 154 has been restored locally from its source branch.
2. Add route-level authorization tests for wrong session, expired cookie, missing assignment, and host/student response separation.
3. Add an end-to-end test with one teacher and two isolated student browser contexts. Assert that each student's network responses and rendered DOM never contain the other card's private text.
4. Pilot reconnects, a late joiner, and both classroom realtime shells with 3–6 test accounts.
5. Replace polling with a public phase/version broadcast only if classroom testing shows polling latency or load is material.
6. Add activity summary events: started, ready, decision submitted, completed. Avoid storing raw private card text in analytics.

## Thin vertical slice acceptance criteria

- A teacher in a live class can launch the Missing Bag template for two or more present students.
- Every present student receives exactly one stable assignment, including after refresh/reconnect.
- Student A cannot obtain Student B's card through API response, page source, realtime payload, or browser storage.
- The teacher can advance all six phases and see readiness/submission counts.
- Every student can submit a conclusion and reason; the teacher can reveal and debrief.
- A late joiner gets an explicit teacher-assigned card and never changes existing assignments.
- Complete returns the class to the Activity stage without ending the call or classroom session.
- The feature works in both the Liveblocks compatibility shell and the Supabase-native classroom shell.

## Deliberately deferred

- AI-generated role packs;
- student-to-student private chat;
- voice recording or automatic speaking analysis;
- open-ended peer voting;
- parent-facing reports;
- competitive scoring or elimination;
- generalized branching story logic.

These can follow after the privacy boundary and teacher-controlled live loop are proven in a real class.

## Cursor handoff prompt

> Continue the Secret Roles live-activity vertical slice on `feat/activity-builder`. Read
> `web/docs/secret-roles-live-activity.md` first and preserve unrelated working-tree changes. The
> domain, migration, APIs, runtime registration, launch panel, host view, and student flow are now
> implemented. Apply migration 155, add route authorization tests,
> then run a teacher plus two isolated-student browser pilot across the full phase loop. Prove that
> Student A never receives Student B's private text before Reveal, including API responses, DOM,
> realtime payloads, and browser storage. Fix findings without putting private cards into shared
> realtime state. Do not add AI generation, elimination, scoring, or generalized story branching.
