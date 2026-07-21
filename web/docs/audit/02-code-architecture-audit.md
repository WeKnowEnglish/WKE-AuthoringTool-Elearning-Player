# 02 — Architecture and Code Health Audit

Audit date: 2026-07-20  
Workstream score: **2 / 5** (substantial blockers for scale; runnable product)

## Scoring rationale

Auth-gated Primary/Secondary journeys exist and mastery sync is real, but: page-only auth, dual primary hubs, unlock-all flag, unscoped session events, archived CMS with no replacement for Primary content, and oversized lesson runtime with curriculum content in TS modules. Not unsafe enough for score 0–1; not “workable with small gaps” (3) for large-scale authoring platform health.

---

## Findings

### ARCH-001 — Unlock-all flag enabled in source

| Field | Value |
|-------|-------|
| **ID** | ARCH-001 |
| **Severity** | P0 |
| **Confidence** | High |
| **Portal** | Primary (economy / progression) |
| **Classification** | Confirmed defect |
| **Evidence** | `lib/progress/unlock-registry.ts`: `UNLOCK_ALL_ACTIVITIES_DURING_DEV = true`; `isUnlockAvailable` / `nextLockedUnlocks` short-circuit |
| **User impact** | Level gates never apply; “unlock” UX and progression promises are false |
| **Curriculum impact** | Cannot sequence content by readiness/level using registry |
| **Correction** | Default `false` in production builds; env-gated or remove; add CI assert |
| **Scope** | Small |
| **Blocks curriculum work?** | Yes (sequencing / progression design) |

### ARCH-002 — Auth is page-level only; middleware does not enforce roles

| Field | Value |
|-------|-------|
| **ID** | ARCH-002 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Architectural risk |
| **Evidence** | `proxy.ts` / `lib/supabase/middleware.ts` refresh only; gates in individual pages (`requireStudent`, `requireSecondaryStudentAccess`, teacher layout) |
| **User impact** | Any new route that forgets a gate is open; inconsistent protection |
| **Curriculum impact** | Teacher authoring / student-only content routes easy to mis-ship |
| **Correction** | Central matcher for `/primary`, `/home`, `/secondary`, `/teacher` (+ exceptions list) |
| **Scope** | Medium |
| **Blocks curriculum work?** | No (process risk, not content model) |

### ARCH-003 — `/grammar` student routes lack page-level student auth

| Field | Value |
|-------|-------|
| **ID** | ARCH-003 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Shared / Primary entry |
| **Classification** | Product decision required + incomplete if practice should be private |
| **Evidence** | `app/(student)/grammar/**` — no `requireStudent` matches; published-only content gate via `notFound()` |
| **User impact** | Anonymous can read published posters; mastery/practice attribution ambiguous if used logged-out |
| **Curriculum impact** | Public catalog may be intentional; mastery still needs auth for durable evidence |
| **Correction** | Product: public read vs auth-required practice; enforce accordingly |
| **Scope** | Small–medium |
| **Blocks curriculum work?** | No |

### ARCH-004 — Dual Primary homes (`/primary` + `/home`)

| Field | Value |
|-------|-------|
| **ID** | ARCH-004 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Incomplete implementation / product decision |
| **Evidence** | `STUDENT_DEFAULT_PATH=/primary`; `/home` still student-gated live hub; Games → world hub |
| **User impact** | Split mental model; progress/rewards may diverge by surface |
| **Curriculum impact** | Authors cannot assume one navigation/progress context |
| **Correction** | Product: sunset `/home` or redefine as Games-only; single progress chrome |
| **Scope** | Large |
| **Blocks curriculum work?** | Partially (path design unclear) |

### ARCH-005 — Student practice session events are not student-scoped

| Field | Value |
|-------|-------|
| **ID** | ARCH-005 |
| **Severity** | P0 |
| **Confidence** | High |
| **Portal** | Shared (Primary grammar completion, session analytics) |
| **Classification** | Confirmed defect |
| **Evidence** | `STUDENT_SESSION_EVENTS_STORAGE_KEY = "wke-student-session-events-v1"`; `readStudentPracticeSessionEvents` uses raw key; mastery uses `scopedLocalStorageKey` |
| **User impact** | Shared device: Student B inherits Student A’s session/completion signals |
| **Curriculum impact** | Grammar completion / loop derived from unscoped events can corrupt learning evidence UI |
| **Correction** | Scope key like mastery; migrate/clear legacy key |
| **Scope** | Medium |
| **Blocks curriculum work?** | Yes (evidence integrity) |

### ARCH-006 — No general curriculum CMS; Primary content is code

| Field | Value |
|-------|-------|
| **ID** | ARCH-006 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Incomplete implementation |
| **Evidence** | Course CMS archived (`/activities` → `notFound`); sets under `lib/vocabulary-templates/sets/*.ts`; Secondary JSON pack is deploy artifact |
| **User impact** | Teachers cannot author Primary curriculum in-product |
| **Curriculum impact** | Large-scale authoring requires engineers + deploys; schema changes per set type |
| **Correction** | Content package format + import pipeline (or CMS) with validation; keep runtime contracts |
| **Scope** | Large |
| **Blocks curriculum work?** | **Yes** for Primary scale authoring |

### ARCH-007 — Oversized lesson runtime vs narrow curriculum materialization

| Field | Value |
|-------|-------|
| **ID** | ARCH-007 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Architectural risk |
| **Evidence** | `lib/lesson-schemas.ts` many subtypes; Primary materializes vocab template screens only (`build-screens.ts`) |
| **User impact** | Complexity cost; harder QA |
| **Curriculum impact** | Authors may assume unimplemented subtypes are curriculum-ready |
| **Correction** | Publish “supported for curriculum” subtype allowlist; freeze unused |
| **Scope** | Medium |
| **Blocks curriculum work?** | No if allowlist enforced |

### ARCH-008 — Hardcoded curriculum assumptions in unlock registry

| Field | Value |
|-------|-------|
| **ID** | ARCH-008 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Confirmed defect pattern |
| **Evidence** | `UNLOCK_REGISTRY` enumerates every `vocab_set:*` id; new set requires code edit |
| **User impact** | New content missed unlock metadata |
| **Curriculum impact** | Scaling sets = registry churn |
| **Correction** | Derive unlocks from content catalog metadata |
| **Scope** | Medium |
| **Blocks curriculum work?** | Yes at scale |

### ARCH-009 — Mixed responsibilities: economy + curriculum unlocks

| Field | Value |
|-------|-------|
| **ID** | ARCH-009 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Primary |
| **Classification** | Architectural risk |
| **Evidence** | Same registry gates games and vocab sets by player XP level |
| **User impact** | Learning path conflated with game economy |
| **Curriculum impact** | CEFR/grade sequencing cannot use this model cleanly |
| **Correction** | Separate **curriculum unlock** (objective readiness) from **economy unlock** (cosmetics/games) |
| **Scope** | Large |
| **Blocks curriculum work?** | Yes if sequenced curriculum required |

### ARCH-010 — Loading / empty / error / resume: uneven

| Field | Value |
|-------|-------|
| **ID** | ARCH-010 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Both |
| **Classification** | Incomplete implementation |
| **Evidence** | Primary SSR placeholders (`ssr-primary-placeholders.ts`); Secondary “Loading today's practice...”; resume via `initialScreenIndex` / continue helpers; no unified error boundary inventory in this audit |
| **User impact** | Hydration fixes landed; failure/retry patterns vary by surface |
| **Curriculum impact** | Authors cannot rely on standard empty/error copy or resume contract |
| **Correction** | Shared student error/empty/resume primitives per portal |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

---

## Summary table

| ID | Sev | Blocks curriculum? |
|----|-----|--------------------|
| ARCH-001 | P0 | Yes |
| ARCH-005 | P0 | Yes |
| ARCH-002 | P1 | No |
| ARCH-004 | P1 | Partial |
| ARCH-006 | P1 | Yes (Primary scale) |
| ARCH-003 | P2 | No |
| ARCH-007–010 | P2 | Mostly no / scale yes for 008–009 |

**Workstream score: 2 / 5**
