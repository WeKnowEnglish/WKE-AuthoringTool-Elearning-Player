# WeKnow English — Codex Master Goals

Last reviewed: 2026-09-09

## 1. Purpose of This Document

This file defines the major engineering goals for the WeKnow English platform.

Codex should use this document as the persistent, platform-wide guide when creating, planning, implementing, reviewing, or updating goals for the application.

This document governs platform-level goal selection and execution. The repository remains the source of truth for the current implementation. The [Lesson Player Master Document](./lesson-player-master-document.md) remains the product and planning source of truth for the narrower student lesson-player experience. If the documents appear to conflict, identify the difference in scope and ask for or record a deliberate decision rather than silently choosing one.

The purpose is not simply to add features. The broader objective is to turn WeKnow English into a stable, scalable, maintainable learning platform that can support real teachers, students, parents, curriculum authors, and future developers.

Codex should prioritize:

1. Reliability
2. Student safety and data integrity
3. Teacher usability
4. Maintainability
5. Reusable architecture
6. Performance
7. Content creation speed
8. Scalability
9. Clear documentation
10. Sustainable infrastructure costs

---

# 2. Product Vision

WeKnow English is a story-first, student-centered eLearning platform designed primarily for primary and secondary learners.

The platform combines:

- self-paced lessons
- interactive learning activities
- live online classes
- teacher assignments
- curriculum tracking
- student mastery
- rewards and progression
- reading and learning libraries
- collaborative classroom tools
- assessment
- teacher analytics
- parent visibility
- curriculum authoring
- AI-assisted content creation

The platform should eventually support subjects beyond English.

The architecture should therefore avoid unnecessarily hard-coding the product around ESL-specific assumptions when a more general learning model is reasonable.

---

# 3. Current Technology Stack

Current major technologies include:

- Next.js
- React
- TypeScript
- Supabase
- Supabase Postgres
- Supabase authentication
- Supabase Realtime
- Daily for live video
- Liveblocks in some existing classroom systems
- Vercel for current deployment

Codex should inspect the repository before assuming these systems are implemented exactly as described here.

The repository is the source of truth for the current implementation.

---

# 4. Engineering Principles

Codex should follow these principles during all work.

## 4.1 Inspect Before Rebuilding

Do not replace an existing subsystem simply because another architecture appears cleaner.

Before significant architectural changes:

1. inspect the existing implementation
2. identify what is working
3. identify the actual failure or limitation
4. determine whether refactoring is necessary
5. preserve working functionality whenever possible

Prefer incremental migrations over large rewrites.

---

## 4.2 Protect Existing User Flows

Changes must not unnecessarily break:

- student login
- teacher login
- assignments
- homework submission
- activity completion
- student progress
- live classroom sessions
- teacher dashboards
- parent accounts
- existing curriculum content

When modifying these systems, add or update tests wherever practical.

---

## 4.3 Reuse Before Duplicating

Before adding:

- a new database table
- a new activity component
- a new scoring function
- a new authentication check
- a new reward calculation
- a new media system
- a new realtime channel
- a new curriculum structure

search the repository for an existing implementation first.

Avoid parallel systems solving the same problem.

---

## 4.4 Prefer Shared Systems

Where possible, shared platform services should handle:

- authentication
- activity attempts
- scoring
- mastery updates
- rewards
- assignments
- progress tracking
- media
- realtime events
- error reporting
- permissions

Avoid embedding the same logic independently inside multiple pages or activity types.

---

## 4.5 Database Integrity Over Convenience

Database changes should preserve historical student data.

Codex should:

- use migrations
- avoid destructive schema changes without clear justification
- preserve IDs and references
- inspect foreign-key relationships
- consider rollback strategy
- check row-level security
- avoid client-side trust for sensitive updates

---

## 4.6 Server Authority

Important systems should not depend solely on client-side state.

This includes:

- reward balances
- student progression
- mastery
- assessment results
- assignment completion
- permissions
- purchases
- teacher controls
- student authentication

The server/database should remain authoritative.

---

## 4.7 Mobile Matters

Teachers and students may use:

- desktop computers
- laptops
- tablets
- phones

Interfaces should not assume desktop-only usage unless explicitly intended.

Teacher live-class controls should receive particular attention on tablets and phones.

---

# 5. Definition of Done

A goal is not complete simply because code was written.

Unless otherwise specified, completion should include:

- implementation
- testing
- validation against existing flows
- error handling
- appropriate loading states
- appropriate empty states
- appropriate permission checks
- mobile review where relevant
- database migration where required
- documentation updates
- removal or documentation of obsolete code
- clear explanation of any remaining limitations

For major architecture changes, Codex should also document:

- what changed
- why it changed
- migration considerations
- major files affected
- known risks
- future work

---

# 6. Priority Levels

Use the following priority system.

## P0 — Critical

Problems that can:

- prevent users from accessing the application
- lose student data
- corrupt progress
- create security problems
- break core classroom functionality

## P1 — High

Problems or features that materially affect:

- teaching
- learning
- assignments
- authoring
- platform reliability

## P2 — Medium

Important improvements that increase:

- usability
- maintainability
- performance
- analytics
- workflow efficiency

## P3 — Future

Useful capabilities that should not distract from current platform stability.

---

## 6.1 Goal Definition Standard

Use this standard whenever creating a new platform goal or turning a master goal into an executable slice.

### Goal-Writing Rules

1. **Start with the affected stakeholder and learning purpose.** Identify the primary stakeholder—student, teacher, parent, curriculum author, or administrator—and explain how the goal improves learning or the conditions that support learning.
2. **Describe the verified problem, not an assumed solution.** Cite repository evidence, user reports, production evidence, research, or measured workflow friction where available.
3. **Assign one primary priority.** Use exactly one of P0, P1, P2, or P3. If urgency is uncertain, record the uncertainty in Risks. `Ongoing` describes cadence, not priority; pair it with a P-level.
4. **Define a bounded outcome.** A goal should be small enough to complete and verify without authorizing a broad subsystem rewrite. Split large ambitions into milestones or vertical slices.
5. **Separate scope from non-goals.** State what this goal will change and what it deliberately will not change.
6. **Make success observable.** Each acceptance criterion must identify the expected behavior and the evidence that will prove it. Avoid terms such as “better,” “fast,” “reliable,” or “10×” without a baseline and measurement method.
7. **Protect existing users and data.** Include permissions, privacy, student safety, data migration, compatibility, and regression concerns where relevant.
8. **Design for real access needs.** Consider mobile use, keyboard access, screen readers, contrast, captions or transcripts, reduced motion, language level, and age appropriateness where relevant.
9. **Plan safe delivery.** Identify rollout, rollback, monitoring, and recovery expectations for changes that affect production behavior or stored data.
10. **Record dependencies and decisions.** A goal should make clear what must happen first, what it may block, and which unresolved decisions require human judgment.

### Required Goal Template

Copy and complete this template when defining a new goal. Remove instructional placeholder text before treating the goal as ready for implementation.

```md
# GOAL <ID> — <Outcome-oriented title>

Status: Proposed | Investigating | Ready | In Progress | Blocked | Complete
Priority: P0 | P1 | P2 | P3
Cadence: One-time | Ongoing
Last updated: YYYY-MM-DD

## Primary Stakeholder

Student | Teacher | Parent | Curriculum Author | Administrator

Other affected stakeholders:
- ...

## Learning or Educational Purpose

Explain how this goal improves learning, teaching, curriculum quality, student
safety, or the reliability of a learning-critical workflow.

## Problem and Evidence

Describe the verified problem. Include relevant routes, files, database objects,
user reports, production signals, workflow observations, or baseline measurements.

Known facts:
- ...

Assumptions to verify:
- ...

## Objective

State the user-visible or system outcome. Do not prescribe a larger rewrite than
the evidence requires.

## In Scope

- ...

## Non-Goals

- ...

## Current Implementation

Summarize what already exists and should be reused or preserved.

Relevant areas:
- Routes: ...
- Components/services: ...
- Database/migrations: ...
- Tests: ...
- Documentation: ...

## Dependencies and Sequencing

Depends on:
- ...

Blocks or enables:
- ...

External services or decisions:
- ...

## Constraints and Safeguards

- Authentication and permissions: ...
- Student privacy and safeguarding: ...
- Data integrity and migration: ...
- Accessibility: ...
- Mobile and device support: ...
- Performance and cost: ...
- Backward compatibility: ...

Use `Not applicable — <reason>` rather than silently omitting a safeguard.

## Deliverables

- ...

## Acceptance Criteria

1. Given <starting state>, when <action>, then <observable result>.
   Evidence: <automated test, measurement, screenshot, query, or review record>.
2. ...

For quantitative targets:

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| ... | ... | ... | ... |

## Validation Plan

- Automated tests: ...
- Manual flow checks: ...
- Permission/RLS checks: ...
- Mobile/accessibility checks: ...
- Performance or load checks: ...
- Commands or environments: ...

## Rollout, Monitoring, and Rollback

- Rollout approach: ...
- Signals to monitor: ...
- Failure threshold or stop condition: ...
- Rollback/recovery approach: ...

Use `Not applicable — <reason>` only for changes with no production, data, or
user-flow impact.

## Risks and Open Decisions

- Risk: ...
  Mitigation: ...
- Decision requiring human judgment: ...

## Completion Record

Completed:
- ...

Remaining:
- ...

Evidence:
- ...

Known limitations:
- ...

Recommended next task:
- ...
```

### Ready-for-Implementation Gate

A goal is ready for implementation only when:

- its primary stakeholder and educational purpose are clear
- the current implementation has been inspected
- facts are separated from assumptions
- scope and non-goals are explicit
- dependencies and unresolved decisions are visible
- acceptance criteria are observable and testable
- relevant safeguards have been addressed or marked not applicable with a reason
- the proposed slice can be completed without an implicit broad rewrite

P0 and P1 goals must not be marked Complete without recorded validation evidence. If full validation is temporarily impossible, keep the goal In Progress or Blocked and document the missing evidence and risk.

### Active Goal Definitions

The current executable goal sequence is maintained in [Active Codex Goals](./goals/README.md). Update that index and the individual goal document together whenever a goal's status changes.

---

# MASTER GOAL 01 — Production Reliability

**Priority: P0**

## Objective

Make WeKnow English reliable enough to support the first 100 active students without frequent manual intervention.

## Key Areas

Audit and improve:

- application errors
- authentication failures
- failed API requests
- failed database queries
- assignment submissions
- quiz submissions
- activity attempts
- reward transactions
- live classroom recovery
- page refresh behavior
- unexpected logout
- network interruptions
- stale client state

## Required Work

Codex should:

1. identify major failure points
2. reproduce known failures where possible
3. improve logging
4. improve error handling
5. add user-safe recovery behavior
6. add tests for critical flows
7. remove silent failures
8. document remaining reliability risks

## Success Criteria

A normal student should be able to:

- log in
- enter their dashboard
- open an assignment
- complete an activity
- submit work
- receive progress
- refresh the page
- return later

without losing work or entering an invalid state.

---

# MASTER GOAL 02 — Authentication and Authorization

**Priority: P0**

## Objective

Create one reliable authentication and authorization model across student, teacher, parent, and administrative areas.

## Known Concern

Some existing students have encountered:

> Student authentication required

despite previously being able to submit assignments.

This type of inconsistent authentication behavior must be eliminated.

## Required Work

Audit:

- Supabase sessions
- cookies
- middleware
- client auth state
- server auth checks
- route protection
- student profiles
- role resolution
- token refresh
- assignment authorization
- classroom authorization

Identify every place where student authentication is independently checked.

Move toward shared auth utilities where appropriate.

## Success Criteria

Authentication should behave consistently across:

- refresh
- browser reopen
- mobile browser
- assignment submission
- homework
- live classroom access
- API routes
- server actions

No page should implement conflicting authentication assumptions.

---

# MASTER GOAL 03 — Automated Testing

**Priority: P0/P1**

## Objective

Create enough automated coverage that major changes can be made without accidentally breaking the platform.

## Initial Critical Test Flows

Automate:

1. student login
2. teacher login
3. student dashboard load
4. assignment opening
5. assignment submission
6. quiz completion
7. progress saving
8. reward awarding
9. classroom joining
10. classroom reconnection
11. teacher assignment creation
12. permission enforcement

## Testing Layers

Use appropriate combinations of:

- unit tests
- integration tests
- database tests
- API tests
- end-to-end tests

Do not over-test simple presentation components while critical platform flows remain uncovered.

## Success Criteria

A developer or Codex should be able to run a documented test command and quickly determine whether critical platform functionality remains intact.

---

# MASTER GOAL 04 — Live Classroom Architecture

**Priority: P1**

## Objective

Create a stable live classroom system that survives refreshes, disconnects, and network changes.

## Architecture Direction

Current intended architecture:

- Supabase/Postgres for durable classroom state
- Supabase Realtime for synchronized classroom events/state
- Daily for video/audio
- Liveblocks may remain temporarily where migration is incomplete

Codex should verify actual implementation before changing it.

## Durable State Examples

Potential durable data includes:

- class session
- teacher
- students
- assigned activity
- current learning stage
- responses
- scores
- session history

## Ephemeral State Examples

Potential ephemeral data includes:

- cursor position
- temporary animation state
- transient presence
- short-lived UI interactions

## Required Work

Codex should map:

- what is stored
- where it is stored
- who owns it
- how it synchronizes
- how it recovers after reconnection

## Success Criteria

A student should be able to:

1. join a classroom
2. participate
3. temporarily lose connection
4. reconnect
5. recover the correct session state

without requiring teacher intervention.

---

# MASTER GOAL 05 — Unified Activity Engine

**Priority: P1**

## Objective

Create a shared activity architecture instead of maintaining isolated implementations for each activity type.

## Activity Types May Include

- multiple choice
- true/false
- matching
- ordering
- drag and drop
- hotspot
- gap fill
- open response
- speaking response
- reading tasks
- image-based activities
- interactive story tasks
- listening tasks

## Shared Activity Capabilities

Where appropriate, activities should use shared systems for:

- instructions
- prompts
- media
- answers
- attempts
- scoring
- hints
- feedback
- time limits
- mastery mapping
- EXP
- gold
- teacher review
- assignment status
- accessibility
- analytics

## Success Criteria

Adding a new activity type should not require rebuilding:

- scoring
- progress tracking
- rewards
- assignment submission
- analytics

from scratch.

---

# MASTER GOAL 06 — Learning Track Engine

**Priority: P1**

## Objective

Create a reusable system for guided sequences of learning experiences.

One current model is:

1. Look
2. Think
3. Share
4. Listen
5. Respond

However, learning tracks should support other structures.

## Required Capabilities

Authors should be able to define:

- stages
- stage order
- activity type
- instructions
- media
- completion requirements
- branching
- support
- extension
- rewards
- mastery objectives

## Success Criteria

A curriculum author can construct a multi-step lesson flow without requiring custom application code for every lesson.

---

# MASTER GOAL 07 — Mastery Engine

**Priority: P1**

## Objective

Create one authoritative mastery system that connects student activity to measurable learning progress.

## Existing Direction

Current mastery concepts include a 0–5 skill/mastery scale.

Codex should inspect existing implementation before modifying it.

## Mastery May Track

- vocabulary
- grammar
- reading
- listening
- speaking
- writing
- communication skills
- pronunciation
- curriculum objectives
- subject-specific skills

## Required Work

Define:

- mastery entities
- mastery evidence
- scoring rules
- attempt weighting
- decay/review logic if applicable
- teacher overrides
- aggregation rules
- display rules

## Success Criteria

Every meaningful learning activity can answer:

> What skill did the student practice, and how did this attempt affect their mastery?

---

# MASTER GOAL 08 — Rewards and Progression

**Priority: P1**

## Objective

Create one reliable student progression and reward service.

## Existing Reward Concepts

The platform may use:

- EXP
- levels
- gold
- game credits
- skill points
- customization unlocks
- items
- streaks
- bonuses

## Required Work

Avoid awarding rewards independently in multiple client components.

Create shared rules and server-authoritative transactions.

Prevent:

- duplicated rewards
- refresh exploits
- repeated submissions
- negative balances
- client manipulation

## Success Criteria

The same completed activity cannot unintentionally award rewards multiple times.

All balances can be traced to recorded transactions or events.

---

# MASTER GOAL 09 — Curriculum Architecture

**Priority: P1**

## Objective

Connect curriculum planning directly to the platform data model.

## Desired Hierarchy

A useful general model may include:

Course  
→ Level  
→ Unit  
→ Lesson  
→ Learning Track  
→ Activity  
→ Objective  
→ Skill  
→ Mastery Evidence

Codex should inspect current structures before enforcing this exact hierarchy.

## Required Capabilities

The system should support:

- learning objectives
- CEFR level
- grade range
- language targets
- vocabulary
- grammar
- skill strands
- prerequisite skills
- assessment links
- curriculum progression
- teacher assignment

## Success Criteria

It should be possible to trace:

> curriculum objective → lesson → activity → student attempt → mastery result

---

# MASTER GOAL 10 — Student Learning Dashboard

**Priority: P1/P2**

## Objective

Create a student experience where learners immediately understand:

- what they are learning
- what they have completed
- what comes next
- how they are progressing
- what they have earned

## Dashboard Areas

Potential areas include:

- current learning track
- assignments
- mastery
- level
- EXP
- gold
- streaks
- recommended next activity
- recently completed work
- unlocked rewards
- teacher feedback

## Design Principle

The dashboard should feel motivating rather than administrative.

For younger learners, prioritize:

- visual progress
- simple language
- characters
- clear next actions

---

# MASTER GOAL 11 — Teacher Analytics

**Priority: P2**

## Objective

Give teachers actionable information rather than overwhelming them with raw data.

## Teacher Questions the System Should Answer

- Who needs help?
- Who has not completed the assignment?
- Which skills are weak across the class?
- Which students have mastered the target?
- Who has stopped making progress?
- Which questions caused difficulty?
- What should I teach next?

## Success Criteria

A teacher should be able to identify meaningful class problems within approximately one minute of opening the analytics view.

---

# MASTER GOAL 12 — Teacher Live-Class Controls

**Priority: P2**

## Objective

Make live teaching practical from desktop, tablet, and phone.

## Potential Tools

- student picker
- timer
- group maker
- spin wheel
- scoreboard
- participation tracker
- classroom pulse
- activity launcher
- student response states
- mute/video controls
- learning track navigation

## Success Criteria

A teacher should not need multiple separate browser tabs to manage a normal class.

---

# MASTER GOAL 13 — Content Authoring Speed

**Priority: P1/P2**

## Objective

Make curriculum creation significantly faster.

Target:

> Reduce the amount of manual work required to build a complete lesson or activity set by approximately 10×.

## Potential Improvements

- reusable templates
- duplicate activity
- duplicate lesson
- bulk editing
- keyboard workflows
- reusable blocks
- media library
- vocabulary imports
- curriculum tagging
- objective linking
- batch publishing
- activity preview
- responsive previews

## Success Criteria

A curriculum author should spend most of their time thinking about pedagogy and content rather than repetitive data entry.

---

# MASTER GOAL 14 — AI-Assisted Authoring

**Priority: P2**

## Objective

Use AI to generate structured learning content that fits the platform's actual schemas.

## Example Input

An author could provide:

- CEFR level
- learner age
- topic
- vocabulary
- grammar target
- skill objective
- lesson length

## Example Output

AI could generate:

- lesson outline
- story
- reading
- vocabulary tasks
- grammar tasks
- speaking prompts
- assessment questions
- support activities
- extension activities

## Important Constraint

AI should generate structured editable drafts.

It should not publish directly without review.

---

# MASTER GOAL 15 — Content Validation

**Priority: P2**

## Objective

Automatically detect broken or incomplete learning content before students encounter it.

## Validation Examples

Detect:

- missing correct answers
- invalid scoring
- empty prompts
- missing images
- missing audio
- broken media references
- invalid activity configuration
- unreachable branches
- duplicate IDs
- unsupported activity types
- unpublished dependencies
- missing curriculum objectives

## Success Criteria

Authors should receive clear validation errors before publishing.

---

# MASTER GOAL 16 — Media and Character Library

**Priority: P2**

## Objective

Create a reusable asset system for educational media.

## Assets May Include

- character artwork
- Keelan poses
- Mia
- Zara
- Leo
- Ethan
- teacher characters
- backgrounds
- props
- icons
- illustrations
- audio
- animations
- video
- lesson graphics

## Desired Metadata

Assets may need:

- name
- category
- character
- pose
- expression
- age/version
- tags
- curriculum topic
- file type
- dimensions
- usage rights

## Success Criteria

Authors should be able to reuse approved assets without repeatedly uploading duplicates.

---

# MASTER GOAL 17 — Database Architecture Audit

**Priority: P1**

## Objective

Keep the database understandable, secure, and performant.

## Audit Areas

Look for:

- duplicate tables
- obsolete tables
- unused columns
- missing indexes
- poor foreign-key relationships
- inconsistent naming
- orphaned records
- weak RLS
- duplicate data
- excessive JSON blobs
- client-side permission assumptions

## Deliverable

Maintain a living database architecture document.

Document major tables and their purpose.

---

# MASTER GOAL 18 — Performance

**Priority: P2**

## Objective

Keep the platform responsive as content and student numbers grow.

## Audit

Check:

- JavaScript bundle size
- unnecessary client components
- expensive React renders
- image loading
- database query counts
- N+1 queries
- repeated API requests
- realtime traffic
- large payloads
- caching
- route loading
- slow dashboards

## Success Criteria

Performance improvements should be measured rather than assumed.

---

# MASTER GOAL 19 — Observability and Platform Health

**Priority: P1**

## Objective

Make failures visible before they become recurring user complaints.

## Track

Where practical:

- frontend exceptions
- API errors
- auth failures
- failed submissions
- database failures
- classroom disconnects
- realtime failures
- Daily errors
- slow operations
- deployment-related failures

## Potential Admin View

Create a lightweight platform health area showing:

- recent errors
- frequency
- affected user type
- affected route
- status
- first occurrence
- latest occurrence

Do not expose sensitive user information unnecessarily.

---

# MASTER GOAL 20 — Deployment Independence

**Priority: P2**

## Objective

Reduce unnecessary dependence on any single hosting provider.

Vercel is currently used, but the application should not become impossible to deploy elsewhere.

## Required Work

Identify:

- Vercel-specific services
- serverless assumptions
- environment variables
- build requirements
- background workloads
- media dependencies
- edge runtime dependencies

## Desired Outcome

Where practical, maintain the ability to deploy using:

- Vercel
- container hosting
- VPS
- other Node-compatible infrastructure

Do not migrate simply for the sake of migration.

---

# MASTER GOAL 21 — Documentation for Future Agents and Developers

**Priority: P1**

## Objective

Make the repository understandable without requiring the original developer to explain every subsystem.

## Suggested Documentation

Create or maintain:

```text
/docs
  architecture.md
  authentication.md
  database.md
  classroom.md
  realtime.md
  activities.md
  assignments.md
  mastery.md
  rewards.md
  curriculum.md
  authoring.md
  deployment.md
  testing.md
```

Documentation should describe the actual implementation, not an imagined ideal architecture.

---

# MASTER GOAL 22 — Technical Debt Control

**Priority: Ongoing**

## Objective

Prevent rapid feature development from creating an unmaintainable codebase.

## Codex Should Regularly Identify

- duplicated logic
- oversized components
- abandoned experiments
- old APIs
- dead code
- obsolete database structures
- duplicate types
- inconsistent utilities
- TODO comments
- temporary hacks

Do not perform broad cleanup during unrelated feature work unless the cleanup is necessary.

Instead, record meaningful technical debt for future work.

---

# 7. Recommended Execution Order

Codex should generally prioritize work in this sequence:

## Phase 1 — Stability

1. Production reliability
2. Authentication
3. Automated testing
4. Database audit
5. Observability

## Phase 2 — Core Learning Architecture

6. Live classroom architecture
7. Unified activity engine
8. Learning track engine
9. Mastery
10. Rewards
11. Curriculum architecture

## Phase 3 — User Experience

12. Student learning dashboard
13. Teacher analytics
14. Teacher live-class controls

## Phase 4 — Content Scale

15. Authoring workflow
16. AI-assisted authoring
17. Content validation
18. Media library

## Phase 5 — Infrastructure

19. Performance
20. Deployment independence
21. Documentation
22. Technical debt reduction

---

# 8. Codex Workflow for Each Goal

When instructed to work on one of these goals, Codex should follow this workflow.

## Step 1 — Inspect

Search the repository and determine:

- current implementation
- relevant files
- current database structures
- current tests
- dependencies
- related systems

Do not begin with assumptions.

## Step 2 — Report Findings

Provide a concise summary of:

- what currently exists
- what works
- what appears incomplete
- major risks
- proposed approach

## Step 3 — Break the Goal Into Tasks

Create manageable tasks.

Prefer small safe milestones over one massive refactor.

## Step 4 — Implement the Highest-Value Slice

Complete a working vertical slice where possible.

## Step 5 — Test

Run relevant:

- linting
- type checking
- automated tests
- build validation

If testing cannot be completed, explain why.

## Step 6 — Review for Regressions

Check related flows that could have been affected.

## Step 7 — Document

Update documentation where architecture or developer behavior changed.

## Step 8 — Update Goal Status

Record:

- completed work
- remaining work
- blockers
- recommended next task

---

# 9. Goal Status Format

Use this structure when updating progress.

```md
## Goal Status

Status: Not Started | Investigating | In Progress | Blocked | Complete

Completed:
- ...

Current:
- ...

Remaining:
- ...

Risks:
- ...

Recommended Next Task:
- ...
```

---

# 10. Instructions for Autonomous Codex Work

When given a command such as:

> Work on Master Goal 03.

Codex should not interpret that as permission to rewrite the entire related subsystem.

Instead:

1. read this document
2. inspect the repository
3. identify the highest-impact unfinished work
4. explain the intended change
5. implement a safe meaningful slice
6. run validation
7. document the result
8. recommend the next slice

When several solutions are possible, prefer:

- simpler architecture
- existing dependencies
- fewer new abstractions
- fewer new services
- lower hosting cost
- easier maintenance

unless another option provides a clear product benefit.

---

# 11. Things Codex Should Not Do Without Strong Justification

Avoid:

- rewriting the whole application
- replacing Supabase unnecessarily
- replacing Daily unnecessarily
- introducing microservices prematurely
- introducing new state-management libraries without need
- duplicating existing systems
- changing database IDs casually
- deleting production data
- bypassing RLS
- trusting reward values from the client
- hard-coding user IDs
- exposing secrets
- adding dependencies for trivial tasks
- redesigning unrelated interfaces during backend work
- silently changing existing curriculum data structures

---

# 12. First Major Milestone

## Milestone: Production-Safe First 100 Students

The immediate engineering milestone for WeKnow English is:

> Make the platform stable and reliable enough to comfortably support the first 100 active students.

This milestone requires particular attention to:

- authentication
- student sessions
- assignment submission
- classroom recovery
- database integrity
- progress saving
- reward integrity
- automated tests
- monitoring
- performance

New experimental features should not take priority over major reliability problems affecting these systems.

---

# 13. Second Major Milestone

## Milestone: Unified Learning Platform

After the production reliability milestone, the next major objective is:

> Turn the existing collection of learning tools into one coherent learning platform architecture.

The following systems should work together:

```text
Curriculum
    ↓
Learning Objectives
    ↓
Lessons / Learning Tracks
    ↓
Activities
    ↓
Student Attempts
    ↓
Scoring
    ↓
Mastery
    ↓
Progress
    ↓
Rewards
    ↓
Teacher Analytics
```

Each layer should have clearly defined responsibilities.

---

# 14. Third Major Milestone

## Milestone: 10× Curriculum Production

The third major objective is:

> Enable one curriculum author to create and maintain significantly more high-quality learning content without significantly increasing manual workload.

This requires:

- reusable templates
- unified activities
- curriculum metadata
- media reuse
- fast preview
- validation
- AI-assisted drafting
- bulk tools
- reliable publishing

The platform should eventually allow educational expertise—not repetitive technical work—to be the main constraint on curriculum creation.

---

# 15. Long-Term Direction

WeKnow English should evolve toward a platform where:

- students know exactly what to learn next
- teachers know exactly who needs support
- parents can understand student progress
- authors can rapidly build high-quality content
- curriculum objectives connect directly to measurable mastery
- live and self-paced learning work together
- rewards reinforce learning rather than distract from it
- AI accelerates authoring without replacing teacher judgment
- infrastructure remains affordable
- the system can grow without repeated architectural rewrites

All major technical decisions should be evaluated against this direction.
