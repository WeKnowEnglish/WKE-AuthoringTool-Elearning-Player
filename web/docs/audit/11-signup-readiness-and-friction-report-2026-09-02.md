# Application Friction and Signup Readiness Report

**Product:** We Know English  
**Audit date:** 2 September 2026  
**Primary question:** Where will teachers and students experience friction, and what should the team prioritize before inviting them to sign up?  
**Primary stakeholders:** Teachers and students  
**Supporting stakeholders:** Parents and administrators

---

## Executive verdict

## Ready for an assisted pilot; not ready for broad self-service signup

We Know English has considerably more educational and technical substance than a typical early product. It already connects teacher classes, activity authoring, homework, student practice, live teaching, progress evidence, parent reporting, and age-band experiences. The production build succeeds, the type system is clean, and more than 3,000 automated tests pass.

The main risk is no longer a lack of features. It is the absence of one consistently designed, measurable path from interest to learning value.

The recommended near-term strategy is a **teacher-led, invitation-based pilot** rather than an open public launch. The first release should optimize one loop:

> A teacher gets access, creates a class, shares a code, one student joins, the teacher assigns one activity, the student completes it, and the teacher sees useful evidence.

If that loop is fast, trustworthy, and measurable, the platform has a foundation for growth. If it is not, adding more activity types, games, or authoring tools will increase complexity without increasing adoption.

### Immediate decisions required

1. Decide whether teacher acquisition is an **application/approval flow** or true **self-service signup**. The current product markets self-service but operates as approval-only.
2. Decide whether students are created through a **teacher or parent relationship** or can create durable accounts independently. Public child self-registration with a short numeric PIN is not a safe general-launch identity model.
3. Define the activation event as the complete teacher-to-student learning loop, not merely account creation.
4. Pause expansion of the product surface until funnel measurement and first-run onboarding are in place.

---

## Overall readiness scorecard

Scores use a 0–5 scale, where 5 means ready for a broad public rollout.

| Area | Score | Assessment |
| --- | ---: | --- |
| Educational value | 4.0 | Strong breadth, age-band differentiation, practice, feedback, homework, mastery, and teacher reporting foundations |
| Technical compilation | 4.0 | Production build and typecheck pass; release checks are not fully green |
| Public value proposition | 3.0 | Broad promise is clear, but differentiation and proof are weaker than the feature list |
| Teacher signup conversion | 1.5 | “Start Teaching” leads to sign-in; actual access is approval-only and buried below the login form |
| Student signup conversion | 1.5 | Secondary creation path is coherent; the prominent Primary public doorway cannot complete new-account creation |
| Teacher first-run activation | 2.0 | Class creation exists, but no guided setup, seeded example, or single activation checklist is visible |
| Student first-run activation | 3.0 | Primary has a thoughtful mascot tour; Secondary is clear but less guided; class-linked first value still depends on teacher setup |
| Trust, privacy, and child identity | 2.0 | Good intent and safety language; identity, consent, legal review, and recovery need hardening before scale |
| Acquisition measurement | 1.0 | Marketing events are saved only in browser session storage and are not durable funnel analytics |
| Operational readiness | 2.0 | Teacher approval, email delivery, staging migrations, support response, and account provisioning require human coordination |

**Overall assessment: 2.5 / 5 — assisted-pilot readiness.**

---

## Stakeholder impact

### Teachers

Teachers are the most important acquisition and activation stakeholder. They create the class context, invite students, choose learning activities, and interpret progress. Their experience currently suffers from a mismatch between the public promise and the access model, followed by a feature-dense first destination with limited guidance.

The teacher’s first success should not be “I logged in.” It should be:

- I created a class.
- I understood the join process.
- I assigned or shared one high-quality activity.
- A student completed it.
- I could see what the student learned or struggled with.

### Students

Students need a low-friction, age-appropriate route into something their teacher has chosen. Primary students especially should not be responsible for choosing a durable identity model, remembering an unrecoverable credential, and selecting the correct learning band without adult support.

The student’s first success should be:

- I entered the code or credentials my teacher gave me.
- I immediately saw what to do next.
- I completed a short, achievable learning task.
- I received useful feedback and a visible sense of progress.

### Parents

The parent acquisition proposition is currently more coherent than the teacher proposition: create an account, book a trial, meet a teacher, then follow the class journey. The parent portal also has strong privacy boundaries and teacher-reviewed reporting. However, the last internal verification report states that its evidence was local and that staging migrations and real email acceptance still needed validation. This should be treated as historical evidence, not proof of current production readiness.

Parents should become the owner of independent-child account creation and recovery if the platform supports children outside a teacher-managed class.

### Administrators

Administrators currently absorb hidden funnel work: reviewing teacher requests, selecting Light or Plus, provisioning an account, sending temporary credentials, managing failed email delivery, and supporting confused users. That is acceptable for a small pilot only if there is an explicit service level and a visible request pipeline.

---

## Current product strengths

The launch plan should preserve and expose these strengths rather than replacing them.

1. **Connected learning loop:** classes, homework, activities, live sessions, evidence, and parent reporting share one product.
2. **Age-band differentiation:** Primary and Secondary have distinct tone, information architecture, and learning experiences.
3. **Primary onboarding:** the Learning Home tour adapts based on class enrollment and points children toward assignments, learning, progress, and class joining.
4. **Educational depth:** the product includes vocabulary, grammar, reading, writing, speaking, live participation, formative evidence, and teacher-reviewed progress.
5. **Teacher-class foundation:** class creation is simple, generates a six-character join code, and leads naturally toward roster and homework.
6. **Parent safety model:** guardian access is relationship-based, raw mastery data is not exposed, and reports are teacher-reviewed snapshots.
7. **Technical foundation:** the production build succeeds, typecheck passes, and the automated suite is extensive.
8. **Free proof of learning:** public activities and grammar materials let visitors experience real content before creating an account.

---

## Funnel map and friction

### Teacher journey

| Stage | Current experience | Friction | Consequence |
| --- | --- | --- | --- |
| Discover | Homepage promises an all-in-one platform for creating, teaching, assigning, and reporting | The promise is broad; there is no pricing, plan comparison, eligibility explanation, or strong social proof | Teachers cannot quickly decide whether the product is for them or what happens after clicking |
| Start | Main CTA says “Start Teaching” | CTA opens a teacher sign-in form even though public registration is disabled | New teachers may assume they are in the wrong place or that signup is broken |
| Request | “Request teacher access” appears below email, password, and forgot-password controls | Four required fields, including a long explanation; approval timing is not stated | High-intent prospects face unnecessary work and uncertainty |
| Approval | Administrator approves Light or Plus and sends a welcome email with a temporary password | Human dependency, email dependency, no visible SLA, and no progress status for the requester | Requests can become silent dead ends |
| First login | Teacher may be forced to set a password, then lands in Classes | Secure, but the user has crossed several steps before seeing value | Drop-off risk before activation |
| First workspace | Classes page shows Activity Bank, tools, Private Classes, and Classroom Wall | Several concepts compete; empty Activity Bank instructs the user to use EDU Studio/Lesson Player, introducing product vocabulary immediately | New teachers must understand the architecture before doing one useful job |
| Create class | Short form creates a regular or trial class | This step is relatively good, but it is not embedded in a setup checklist | Teachers may not know the recommended next step |
| Invite and assign | Join code, roster, homework, wall, activity bank, and live tools are available | No single guided “share code → student joins → assign starter activity” path | The platform exposes capability without ensuring activation |

### Primary student journey

| Stage | Current experience | Friction | Consequence |
| --- | --- | --- | --- |
| Discover | Student sign-in leads to a Primary/Secondary choice | Clear and age-appropriate | Good starting point |
| Primary account creation | Primary card links to `/login?portal=student&next=/primary` | The login panel receives no learning band; choosing “I’m new” produces “Pick Primary or Secondary on the home screen first” | A new Primary student cannot create an account through the main student doorway |
| Secondary account creation | Secondary card leads to `/secondary/login`, which supplies the A2 band | Flow can create an account | Primary and Secondary behave inconsistently |
| Credential model | Public users choose a username and 4–6 digit secret code | Low-entropy credential, no visible registration rate limit, no recovery path, and no teacher/guardian approval | Abuse, impersonation, forgotten accounts, and unclear consent risk |
| Join class | Unauthenticated users are sent through login and then return to the join page | Functional in concept, but adds account creation before class value | Students need adult help and may abandon the code journey |
| First home | Primary has an adaptive mascot tour and join-class prompt | Tour is a strength, but the child may arrive without a class, assignment, or curated first task | The hub can feel broad before the teacher has created purpose |

### Secondary student journey

| Stage | Current experience | Friction | Consequence |
| --- | --- | --- | --- |
| Account entry | Dedicated Secondary sign-in/create screen with the correct band | Clearer than Primary | Good foundation |
| First home | Goal, assignments, live status, and class state are visible | No equivalent first-run walkthrough; independent practice and teacher-assigned work compete | Some students may not understand the recommended first action |
| Learning scope | Copy describes lower-secondary vocabulary practice while the wider product promises vocabulary, grammar, homework, and progress | Product promise and immediately available depth may differ | Expectations may be higher than the first experience |

### Parent journey

| Stage | Current experience | Friction | Consequence |
| --- | --- | --- | --- |
| Discover | Clear family page with trial pathway and parent account CTA | Stronger than other audience paths | Good foundation |
| Create account | Email, display name, password, and email confirmation | No visible forgot-password flow on the parent login form | Support burden when credentials are lost |
| Find teacher | Public directory lists teachers accepting trials | Empty directory state is possible; supply is operationally dependent | A parent can reach a dead end even after account creation |
| Link child | Invitation relationship model is secure and deliberate | Depends on teacher/admin setup and live email delivery | Must be validated in staging before promotion |

---

## Highest-priority findings

### P0 — Correct before inviting external users

#### ACQ-001: Teacher CTA contradicts the account model

**Evidence:** Homepage “Start Teaching” and “Explore more tools” links open `/login?portal=teacher`. The login interface states that teacher accounts are administrator-approved and hides the access request below the sign-in form.

**Fix:** For the pilot, replace acquisition CTAs with **Apply for teacher pilot** and route directly to a short request form. Keep **Teacher sign in** as a separate, secondary action. If self-service Teacher Light is the intended model, implement real email-verified signup before using “Start Teaching.”

#### STU-001: Primary account creation is broken from the main student doorway

**Evidence:** `/students` links Primary to a generic login without the `learningBand` prop required by `PortalLoginPanel` for signup.

**Fix:** Pass the Primary band through a dedicated Primary login route or an explicit validated query parameter. Add an end-to-end test from `/students` through Primary account creation and first `/primary` render.

#### SAFE-001: Public child self-registration is not ready for scale

**Evidence:** Anonymous users can call the student registration server action, which creates a Supabase user through the service role. Credentials are a public username and 4–6 digit numeric PIN. The registration action does not apply the visible memory rate limiter used by teacher-access requests.

**Fix:** Use two explicit identity lanes:

- **Class student:** teacher creates or invites the student; class code or one-time claim code establishes the account; teacher/parent can reset access.
- **Independent child:** parent creates and owns the child profile, consent, and recovery relationship.

Do not promote unmediated durable child accounts until abuse controls, recovery, consent, and threat modeling are complete.

#### MEAS-001: The acquisition funnel is not measurable

**Evidence:** Marketing events are stored only in `sessionStorage` and logged to the console in development. They are not sent to a durable, privacy-reviewed analytics system. Existing application diagnostics record some login and hub events but do not form a full acquisition funnel.

**Fix:** Add privacy-safe, durable funnel events with anonymous/session identifiers before the pilot. Never include names, emails, join codes, child answers, chat, or recordings.

#### QUAL-001: Release checks are not fully green

**Evidence:** Production build and typecheck pass, but the full automated suite has two failures and lint has two errors plus 513 warnings.

**Fix:** Resolve the two test failures and two lint errors before defining a pilot release candidate. Establish a smaller mandatory signup/activation smoke suite that must pass on every deployment.

### P1 — Complete during the first pilot cycle

#### ACT-001: Teacher onboarding teaches the product structure, not the first job

The first workspace exposes Activity Bank, Teacher tools, Private Classes, Classroom Wall, plans, and live features. The empty Activity Bank message refers to EDU Studio and Lesson Player. This is meaningful to the product team, not to a first-time teacher.

**Fix:** Add a persistent activation checklist:

1. Create your first class.
2. Copy or share the student join link.
3. Preview the starter activity.
4. Assign it to the class.
5. See a sample result.

Provide one seeded, editable starter activity so teachers can experience the loop before authoring.

#### OPS-001: Approval operations need a service level

Teacher requests can fail if database storage or notification email is not configured. The requester has no status page and no promised response time.

**Fix:** For the assisted pilot, publish “We review applications within one business day,” send a request receipt independent of admin notification, show request status, and monitor pending requests daily. Track median and 90th-percentile approval time.

#### TRUST-001: Plans, eligibility, and pricing are unclear

Public pages mention Teacher Light and Teacher Plus only after login or inside the portal. A prospect cannot understand who can join, which features require Plus, whether the pilot is free, or what future pricing may be.

**Fix:** Publish a simple pilot offer page. It can state “free during the pilot” without committing to long-term pricing. Explain Light versus Plus, who the pilot is for, what support is included, and what data is collected.

#### TRUST-002: The product needs stronger proof

The landing page explains features and offers real activities, but it lacks teacher testimonials, a short product walkthrough, sample class screenshots/results, quantified learning stories, or school/teacher proof.

**Fix:** Add one three-minute teacher walkthrough and two evidence-backed case stories from the pilot. Avoid inflated claims; show a real assignment and the resulting teacher insight.

#### SCOPE-001: Product breadth obscures the core

The repository contains 205 page files, 92 API route files, approximately 600 test files, and many public pilot/test routes. The production build emits 153 static pages. Breadth is now a product-management risk.

**Fix:** Define a pilot allowlist of supported routes. Gate or mark prototype/test routes as noindex and unavailable in production unless they are explicitly part of the pilot. Reduce the Teacher Light navigation to the core jobs.

#### LEGAL-001: Privacy language is an intent statement, not launch-grade policy

The privacy page says formal legal counsel may revise it as the platform scales, and the child-safety page does not claim certification across national regimes. This transparency is good, but broad child signup increases the legal and trust burden.

**Fix:** Before public acquisition, obtain jurisdiction-specific review for the initial market, document data retention and deletion, add guardian/teacher recovery rules, and clarify the lawful basis for child accounts and learning evidence.

### P2 — Improve after the activation loop is proven

- Add parent password recovery and confirm the full invitation journey in staging.
- Add a Secondary first-run guide centered on goals, class assignments, and progress.
- Improve teacher templates and “copy an example” workflows.
- Add in-product support, contextual help, and a searchable teacher guide.
- Run accessibility testing with keyboard, screen reader, touch, and lower-end mobile devices.
- Simplify terminology across “Activity Bank,” “Classroom Wall,” “Teacher Space,” “EDU Studio,” “Lesson Player,” and “Learning Track.”

---

## Recommended launch strategy

### Stage 1: Founder-assisted pilot

**Cohort:** 8–12 teachers, 30–60 students, and a small number of linked parents.  
**Duration:** Four weeks.  
**Offer:** Free pilot access with direct onboarding and a clear feedback agreement.  
**Supported scope:** Classes, one starter assignment workflow, Primary and Secondary student entry, progress/results, and only the live features the team can support reliably.

The goal is not to maximize account count. It is to learn whether teachers can repeatedly produce student learning value with acceptable effort.

### Stage 2: Invite-only beta

Move here only after at least 70% of approved teachers complete the core activation loop without live intervention, the security model is resolved, and the funnel is measurable.

### Stage 3: Self-service Teacher Light

Open teacher signup only after email verification, plan clarity, sample content, automated onboarding, support processes, and abuse monitoring are established. Student accounts should remain relationship-mediated.

---

## Six-week focus plan

### Days 1–3: Remove conversion blockers

- Change teacher CTA language and route directly to the appropriate application/signup experience.
- Fix Primary student account creation from `/students`.
- Add registration rate limits and temporarily restrict independent student signup if needed.
- Fix the two failing tests and two lint errors.
- Add a production route allowlist or production gating for pilot/test pages.

### Week 1: Instrument the complete loop

- Record homepage visit, teacher application start, application submit, approval, first login, class creation, join-link copy, student join, first assignment, first completion, teacher result view, and seven-day return.
- Create a funnel dashboard segmented by teacher cohort and Primary/Secondary band.
- Add error reasons and time-to-complete for each funnel stage.

### Week 2: Build first-run activation

- Add the five-step teacher activation checklist.
- Seed one high-quality starter activity for every new teacher.
- Provide a demo class/result so value is visible before a real student joins.
- Generate a shareable join link as well as a code.
- Make the post-class-creation screen say exactly what to do next.

### Weeks 3–4: Run the assisted pilot

- Observe at least five teacher onboarding sessions.
- Observe Primary and Secondary students joining and completing an assignment.
- Interview parents about trust, progress language, and account expectations.
- Log every support request and classify it as access, comprehension, technical, pedagogical, or trust friction.
- Ship fixes twice weekly, keeping the supported scope stable.

### Weeks 5–6: Simplify and prepare invite beta

- Remove or hide features that distract from the activation loop.
- Publish the pilot offer, plan comparison, short walkthrough, and first case studies.
- Complete staging verification of email, database migrations, parent invitation, account recovery, and cross-account access controls.
- Decide whether activation and retention evidence justify an invite-only beta.

---

## Measurement framework

### North-star activation event

**Activated teacher-class pair:** Within seven days of teacher approval, the teacher creates a class, at least one student joins, at least one teacher-selected activity is completed, and the teacher opens the resulting evidence.

This is more meaningful than teacher signup, student signup, or activity completion alone because it proves the connected ecosystem is working.

### Funnel events

| Funnel stage | Event | Key property |
| --- | --- | --- |
| Acquisition | `homepage_view` | audience/source |
| Intent | `teacher_application_started` | CTA/source |
| Conversion | `teacher_application_submitted` | cohort |
| Operations | `teacher_access_approved` | tier and approval latency |
| Account | `teacher_first_login` | time from approval |
| Setup | `teacher_class_created` | regular/trial |
| Invitation | `class_join_link_copied` | link/code |
| Student access | `student_join_completed` | Primary/Secondary; never include code |
| Assignment | `first_assignment_published` | activity format |
| Learning | `student_first_activity_completed` | band, format, duration bucket |
| Teacher value | `teacher_first_result_viewed` | result type |
| Retention | `teacher_week_1_returned` | activated/not activated |

### Initial pilot targets

These are hypotheses to test, not industry benchmarks.

| Metric | Initial target |
| --- | ---: |
| Application start → submitted | ≥ 60% |
| Approved → first login within 48 hours | ≥ 80% |
| First login → class created within 15 minutes | ≥ 70% |
| Class created → first student joined within 72 hours | ≥ 60% |
| Student joined → first assigned activity completed | ≥ 70% |
| First completion → teacher opens result | ≥ 70% |
| Approved teachers completing full activation in 7 days | ≥ 60% assisted; ≥ 70% before invite beta |
| Activated teacher returns in week 2 | ≥ 60% |

Also track median time, 90th-percentile time, error rate, support contacts, and drop-off reason at every stage.

---

## Research plan

Analytics will identify where users stop. Observation will explain why.

### Teacher usability sessions

Recruit five teachers across different levels of technical confidence. Ask them to:

1. Explain what they think the product does from the homepage.
2. Get access without help.
3. Create a class.
4. Invite a student.
5. Assign the starter activity.
6. Find the student’s result.

Measure completion, time, hesitation, terminology confusion, and where the facilitator must intervene.

### Student sessions

Observe three Primary and three Secondary students, with appropriate adult consent. Test:

- entering from a class join link;
- understanding credentials;
- identifying the next task;
- completing one activity;
- interpreting feedback and progress;
- recovering from a mistake or lost context.

### Parent interviews

Ask four parents to interpret the landing proposition, trial pathway, child account model, progress report, and privacy language. The key test is whether they can explain what data the product uses and who controls the child’s account.

---

## Pilot release gates

Do not invite the pilot cohort until all P0 gates pass.

### Product gates

- [ ] Teacher acquisition CTA matches the actual access model.
- [ ] Primary and Secondary new-student paths both complete successfully.
- [ ] Class-code journey returns the student to the intended class.
- [ ] New teacher receives a clear setup checklist and starter activity.
- [ ] Teacher can see a result from the starter activity.
- [ ] Light/Plus eligibility is explained before application.

### Safety and trust gates

- [ ] Student registration model is teacher- or parent-mediated, or an explicit risk exception is documented for the limited pilot.
- [ ] Signup, login, join, and reset endpoints have rate limiting and abuse monitoring.
- [ ] Account recovery exists for teachers and student owners.
- [ ] Initial-market privacy and child-account review is complete.
- [ ] Data deletion, retention, and support escalation processes are documented.

### Operational gates

- [ ] Teacher request receipt, approval email, temporary password, and password change are verified in staging.
- [ ] Administrator checks pending requests daily and follows an explicit response SLA.
- [ ] Support email is monitored and has response ownership.
- [ ] Parent invitation and guardian relationship flows are verified against the live staging database.

### Technical gates

- [ ] Production build passes without an unexplained file-tracing warning.
- [ ] Typecheck passes.
- [ ] Full tests pass with zero failures.
- [ ] Lint has zero errors.
- [ ] Signup/activation smoke tests pass on desktop and narrow mobile.
- [ ] Keyboard and screen-reader checks cover login, class join, first assignment, and result view.

---

## Verification performed for this report

| Check | Result |
| --- | --- |
| Project and route inventory | 205 page files, 92 API route files, approximately 600 test files |
| Production build | Pass; 153 static pages generated; one file-tracing warning tied to a development API route |
| TypeScript typecheck | Pass |
| Targeted auth, landing, and trial-onboarding tests | 47 passed across 8 files |
| Full automated suite | 3,074 passed, 2 failed, 1 skipped across 599 files |
| Lint | 2 errors and 513 warnings |
| Live browser walkthrough | Not completed; the local browser-control runtime was blocked by the workspace security layer |

The live-browser limitation means visual hierarchy, touch ergonomics, real email delivery, production database state, and end-to-end timing still require staging observation. Code paths, page copy, routes, tests, and build output were inspected directly.

---

## Evidence references

- `README.md` — current account model, teacher approval, environment dependencies, and route overview
- `app/(student)/page.tsx` and `components/landing/*` — homepage positioning and acquisition CTAs
- `app/students/page.tsx` — Primary/Secondary student doorway
- `components/auth/PortalLoginPanel.tsx` — student and teacher authentication behavior
- `lib/actions/student-auth.ts` — student account creation and service-role dependency
- `components/auth/TeacherAccessRequestForm.tsx` and `lib/actions/teacher-access.ts` — teacher application flow
- `app/teacher/(secure)/classes/page.tsx` and `components/teacher/TeacherClassesHome.tsx` — teacher first destination
- `components/primary/PrimaryHomeGuide.tsx` — Primary first-run onboarding
- `components/secondary/SecondaryHome.tsx` — Secondary first destination
- `lib/seo/marketing-events.ts` — local-only acquisition measurement
- `app/(student)/privacy/page.tsx`, `terms/page.tsx`, and `child-safety/page.tsx` — public trust commitments
- `docs/parent-portal/VERIFICATION_REPORT.md` — prior local parent-portal verification and staging gaps
- `docs/audit/00-executive-summary.md` — July curriculum-readiness baseline

---

## Final recommendation

For the next six weeks, make the product narrower in practice even if the underlying platform remains broad.

The focus should be:

1. **A truthful teacher acquisition path.**
2. **A safe student identity and joining model.**
3. **A guided first class and first assignment.**
4. **A complete, measurable teacher-to-student activation loop.**
5. **A small assisted pilot that produces real learning and usability evidence.**

The platform does not need another impressive feature to earn its first committed users. It needs to make the value already built easy to reach, safe to trust, and simple to repeat.
