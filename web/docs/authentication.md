# Student Authentication and Homework Continuity

## Purpose

Student homework must remain secure without turning an expired or temporarily unavailable session into lost work. Authentication is checked on the server for every protected route and every Server Action. Client state is never treated as authorization.

## Shared server boundary

Homework Server Actions use `resolveStudentActionSession` from `lib/auth/student-action-auth-server.ts`.

The resolver:

1. reads the cookie-backed Supabase session with `auth.getUser()`;
2. verifies the authenticated account has the `student` app role;
3. returns the verified student ID and the same Supabase client on success; and
4. returns a small, privacy-safe recovery result on failure.

Actions must not repeat their own `getUser()` plus role check. Keeping this decision in one boundary prevents different homework formats from interpreting the same session differently.

The Next proxy attempts Supabase validation/refresh on every matched homework and login request. If that preliminary call throws because of a temporary network/provider outage, the proxy continues to the downstream route or Server Action, where the same authoritative resolver returns the structured retry state. The proxy does not grant access, and RLS remains enforced.

## Failure contract

Authentication and homework-access failures use one of six stable error codes:

| Code | Meaning | Student recovery |
| --- | --- | --- |
| `student_session_required` | The session is missing, expired, or rejected by the identity provider. | Sign in, then return to the same homework. |
| `student_role_required` | A signed-in account is not a student account. | Use a student account. |
| `student_session_unavailable` | The identity provider or session check failed temporarily. | Keep work in place and retry. |
| `student_homework_forbidden` | The verified student is not enrolled for or targeted by this assignment. | Return home without a protected write. |
| `student_homework_unavailable` | The homework is missing, unopened, or otherwise unavailable. | Return home without exposing protected details. |
| `student_homework_service_unavailable` | A homework, enrollment, or completion lookup failed temporarily. | Keep current work in place, dismiss the notice, and try the action again. |

Provider error messages are not returned to the browser. A temporary provider failure must never be mislabeled as an expired session.

Enrollment and assignment-target failures use the same child-safe message so the response does not reveal class or student details.
If the homework or enrollment lookup itself fails, scoped actions return `student_homework_service_unavailable` instead of forwarding the database or RPC message to the student.

Database policies provide defense in depth. Migration `144_student_homework_write_rls_hardening.sql` requires the student role, the authenticated student's own ID, current class enrollment, an assigned/closed status where applicable, and assignment targeting for direct completion and speaking-recording writes. Service-role collection tables remain unavailable for direct student inserts and updates.

Recovery paths are local application paths only. External and protocol-relative return URLs are rejected.

## Student experience

- Protected homework routes send unauthenticated students to sign-in with a safe return path.
- If a teacher or other wrong-role account opens homework, the route opens the student login portal with the exact homework return path. The login page suppresses its normal auto-redirect only for this explicit cross-role switch, allowing student sign-in to replace the current session.
- Server Action failures show an accessible alert with the correct next action.
- Retryable service failures use the same stable result on routes and actions. Every scoped client exposes a “Try again” control that clears the notice without reloading, preserving unsaved answers and media selections.
- Writing work is stored locally under an account-scoped key while the student types and is removed after a successful save or submission.
- Incrementally saved template and collection answers remain in their server-side drafts.
- Unsaved audio recordings and selected media files are not copied into persistent browser storage. This avoids retaining sensitive media unexpectedly; the interface must not claim those unsaved files are preserved.

## Diagnostics and privacy

Homework authentication failures emit the `homework_auth_failed` diagnostic event on the `student` surface and `homework_auth` phase.

Allowed fields are limited to:

- action name;
- recovery category;
- homework ID;
- route pathname only (never its query string);
- response status;
- stable error code; and
- device category supplied by the existing diagnostics pipeline.

Never include answers, writing text, recordings, media contents, access tokens, cookies, email addresses, student names, query strings, or raw identity-provider messages.

The diagnostics endpoint still requires authentication before accepting these events, but `homework_auth_failed` rows are identity-minimized during ingestion: `user_id`, `participant_id`, and `participant_display_name` are stored as null. Other diagnostic families retain their existing identity behavior.

## Scoped actions

The shared boundary applies to:

- writing draft save and submission;
- collection attempt save and submission;
- template part save and submission;
- template speaking submission;
- collection speaking submission;
- collection media submission; and
- catalog homework completion.

## Validation expectations

Automated checks must cover failure classification, safe return-path handling, account-scoped writing drafts, privacy-safe homework/enrollment lookup failures, and the source contract for every scoped action. Before release, validate the protected routes and save/submit flows using student accounts on desktop and mobile-sized layouts, including expired-session and temporary-provider-failure scenarios. Purpose-created staging fixtures can run the artifact-disabled live suite with `npm run test:e2e:wke-001-live`; credentials belong only in `.env.local`.
