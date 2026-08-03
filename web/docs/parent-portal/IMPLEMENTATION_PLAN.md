# Parent Portal Implementation Plan

Status: local implementation complete; staging acceptance pending

Last reviewed: 2026-08-03

Verification record: [VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md)

## Product outcome

The parent portal is a private, read-only family surface that helps a parent or guardian answer:

1. What has my child been learning?
2. What is going well, and what needs practice?
3. What is one useful thing we can do at home?

The parent surface interprets teacher-approved learning information. It does not reproduce the
student or teacher portals, expose raw assessment records, or publish internal AI observations.

## Stakeholder contract

### Parent or guardian

- Understand the selected child's recent learning within 30 seconds.
- Switch between linked children without losing context.
- See only information that has been deliberately shared with guardians.
- Receive plain-language, encouraging, evidence-aware progress explanations.

### Student

- Keep work, recordings, assessment answers, and identity private by default.
- Avoid labels based on too little evidence or a single poor attempt.
- Be represented through strengths, next steps, and meaningful recent evidence.

### Teacher

- Invite or revoke a guardian from the existing student/class workflow.
- Decide which class updates are visible to guardians.
- Review and publish a parent progress report in under two minutes.
- Preview exactly what a parent will see.

### Administrator

- Investigate invitations and active relationships.
- Revoke access when a safety or support issue occurs.
- Inspect an audit trail without exposing confidential learning content in general logs.

## Launch scope

### Included

- Verified-email guardian invitation and acceptance.
- Multiple children per guardian and multiple guardians per student.
- Relationship-aware parent access that can coexist with a teacher role.
- Mobile-first parent shell with student selector.
- Class Stream and Progress tabs.
- Teacher updates explicitly marked guardian-visible.
- Teacher-curated student highlights and meaningful milestones.
- Versioned, teacher-reviewed, published progress reports.
- Parent settings, restrained notifications, audit logging, and administrator support.
- English-ready copy with locale storage and an internationalization-safe UI contract.

### Deferred

- Parent-to-teacher messaging and family discussion threads.
- Raw answers, unpublished grades, recordings, or behavior records.
- Automatic publication of AI summaries.
- Overall CEFR claims derived from `student_profiles.learning_band`.
- Payments, attendance disputes, formal report cards, and SIS imports.
- Complex custody permissions and school-wide directories.
- Guardian-visible student photos until a private media path with signed URLs exists.

## Current-system constraints

- `AppRole` is currently the exclusive union `teacher | student`. Guardian access must be a
  relationship-derived capability so a teacher can also be a parent without a second account.
- `student_mastery_records.masteryScore` is 0-1 and evidence coverage is vocabulary-heavy.
  Parent reports must not use the older 0-5 assumption or imply whole-language proficiency.
- The existing `class_posts` feed is teacher-authored and visible to enrolled students only.
- Existing class-photo uploads use the public `lesson_media` bucket. Those URLs are not suitable
  for guardian-only photos containing students.
- The application has no durable teacher public display profile or school/organization model.
  The first parent header will show student name and class; teacher name is optional until a safe
  teacher display-name source is established. School identity is not an MVP dependency.
- Parent data must be server-persisted. Browser-local progress is never an authorization or
  reporting source.

## Domain decisions

### Access capability

An authenticated user can open the parent surface when either:

- the user has an active `student_guardians` relationship, or
- the user has a pending invitation addressed to the user's verified email and is completing the
  invitation flow.

The relationship, not an exclusive JWT role, authorizes student data. Existing teacher and student
role behavior remains compatible.

### Invitation and relationship state

`guardian_invitations` owns temporary invitation state:

- `pending`
- `accepted`
- `declined`
- `expired`
- `cancelled`

`student_guardians` owns durable relationship state:

- `active`
- `revoked`

Acceptance is transactional: validate token hash, expiry, invitation status, and verified email;
activate or restore the relationship; mark the invitation accepted; and append audit records.
Pending invitation state is not duplicated in the relationship table.

### Parent stream

The parent data service returns a normalized `ParentStreamItem` contract while source records remain
in their existing domains. Initial source types are:

- guardian-visible teacher update from `class_posts`;
- teacher-published student highlight;
- teacher-published meaningful milestone;
- published progress-report notice.

Existing class posts default to guardian-hidden. Student-specific associations use normalized join
rows rather than names or student identifiers embedded in post text.

### Progress publication

Progress is a versioned publication snapshot, not a live query rendered directly from mastery rows.
A report has `draft`, `ready_for_review`, `published`, or `archived` status. Parents can read only a
published report for an actively linked student.

The parent report contains:

- reporting period;
- current learning topic;
- recent learning activity;
- doing-well area;
- next-focus area;
- parent-friendly skill summaries with evidence-confidence language;
- selected recent evidence;
- teacher summary;
- one short at-home support action;
- generation, review, and publication timestamps.

The snapshot stores stable presentation data so later mastery changes cannot silently rewrite an
already published report.

### Parent-friendly mastery language

Internal values remain internal. Parent status labels are:

- `collecting_evidence` — insufficient quantity or confidence;
- `getting_started` — initial supported practice;
- `developing` — progress is visible but not stable or independent;
- `secure` — repeated success with moderate or low support;
- `strong` — high-confidence success with independence or transfer.

The formatter considers evidence volume, confidence, recency, first-try success, scaffolding, and
task mode. It does not derive `strong` from score alone.

## Data visibility matrix

| Data | Parent | Teacher | Administrator | Publication rule |
| --- | --- | --- | --- | --- |
| Student name and active class | Linked child only | Enrolled student | Support access | Active relationship |
| Guardian-visible class update | Linked child's class | Owned class | Support access | Teacher explicitly shares |
| Student highlight | Linked child only | Enrolled student | Support access | Teacher publishes |
| Parent report | Linked child only | Enrolled student | Support access | Status is `published` |
| Mastery records | Never directly | Enrolled student | Restricted support | Internal source only |
| Learning evidence event JSON | Never directly | Limited diagnostic use | Restricted support | Internal source only |
| Assessment answers | Not in MVP | Assignment owner | Restricted support | Never auto-published |
| Speaking recordings | Not in MVP | Assignment owner | Restricted support | Never auto-published |
| Internal teacher notes | Never | Author/authorized teacher | Restricted support | Separate from report |
| Other students' profiles | Never | Enrolled roster only | Restricted support | No guardian path |
| Guardian email/account data | Own account only | Invitation address/status only | Support access | Minimize disclosure |

## Delivery phases and gates

### Phase 0 — Product and technical contract

Deliverables:

- This implementation plan and data-visibility matrix.
- Repository and schema audit.
- Confirmed MVP boundaries and reporting vocabulary.
- Migration numbering coordinated with current worktree.

Gate:

- No unresolved ambiguity about what a guardian may read or write.

### Phase 1 — Guardian identity and authorization

Deliverables:

- Parent profiles, invitations, relationships, and audit log.
- Token hashing, expiry, resend/cancel/accept flows, and generic anti-enumeration responses.
- Teacher invitation management and administrator support actions.
- Relationship-derived authorization helper and RLS policies.
- Negative security tests for unrelated, pending, expired, wrong-email, and revoked access.

Gate:

- Changing a route parameter or direct database query cannot reveal an unrelated student.
- Revocation removes access immediately.

### Phase 2 — Parent shell and curated stream

Deliverables:

- Parent route guard, layout, mobile navigation, student selector, and manage-children page.
- Guardian-visibility controls for class updates.
- Normalized parent stream service and view model.
- Empty, loading, error, expired, and no-linked-child states.

Gate:

- Existing posts remain guardian-hidden.
- No parent stream item reveals another student's private profile or work.

### Phase 3 — Published progress

Deliverables:

- Versioned report snapshots and publication workflow.
- Confidence-aware formatter using server-persisted evidence only.
- Teacher report editor, exact parent preview, publish/archive actions.
- Parent Progress tab with current topic, strengths, focus, evidence, teacher note, and home action.

Gate:

- Parents cannot read draft or archived reports.
- Low-evidence results say that evidence is still being collected.
- Vocabulary-only evidence is not presented as overall English proficiency.

### Phase 4 — Notifications, administration, and pilot hardening

Deliverables:

- Invitation, report-published, and access-changed notifications.
- In-app notification center and preferences.
- Administrator guardian-support view and audit timeline.
- Privacy-safe analytics for invitation, stream, and report use.
- Mobile and accessibility hardening.

Gate:

- Account emails do not contain detailed student learning data.
- Product analytics do not contain raw answers, report narrative, or confidential notes.

### Phase 5 — Completion verification

Deliverables:

- Requirement-by-requirement security and product audit.
- RLS and server authorization tests.
- Unit, integration, typecheck, lint, build, and relevant route smoke results.
- Manual multi-child, multi-guardian, multi-role, expired, revoked, empty-data, and mobile checks.
- Documented remaining risks and post-MVP expansion order.

Gate:

- Every definition-of-done item below has direct evidence.

Local completion note: the code, migrations, security contracts, automated regression suite, and
public-route browser checks are complete. Applying migrations and running authenticated
multi-account acceptance scenarios are deliberately reserved for staging because this work was not
authorized for deployment.

## Definition of done

1. A teacher can invite a guardian by email for a currently managed student.
2. The guardian can sign in or create an account using the invited, verified email.
3. Acceptance creates one active relationship without duplicate state.
4. A guardian can switch between every actively linked child.
5. The stream contains only deliberately guardian-visible information relevant to the selected child.
6. The Progress tab contains only published, parent-friendly report snapshots.
7. A teacher can preview, publish, archive, and replace a report.
8. A teacher or administrator can revoke access, and revocation is immediate.
9. Pending, expired, declined, cancelled, and wrong-email invitations grant no student access.
10. Route-parameter changes and direct queries cannot expose unrelated students.
11. A teacher who is also a guardian can use both surfaces from one account.
12. Mobile layouts include clear loading, empty, error, and expired states.
13. Report claims are limited by evidence scope and confidence.
14. Parent-visible media is private or deliberately public learning media; student photos are not
    shared through the public lesson-media bucket.
15. Invitation, acceptance, revocation, and report publication are auditable.
16. Existing teacher and student behavior continues to pass regression checks.

## Post-MVP order

1. Private guardian-visible media with signed URLs and consent controls.
2. Broader reading, writing, speaking, grammar, and fluency evidence coverage.
3. Reviewed Vietnamese report translation and weekly summaries.
4. Parent acknowledgement or restrained reactions.
5. Carefully designed teacher messaging.
6. Organization and SIS integrations.
