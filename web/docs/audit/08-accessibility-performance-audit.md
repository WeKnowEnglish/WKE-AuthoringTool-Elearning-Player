# 08 — Accessibility, Resilience, Performance, and Release Readiness

Audit date: 2026-07-20  
Scores: Accessibility/safety/resilience **2 / 5**; Performance/release **3 / 5**

Method note: This pass is **code-trace based**. Items marked **hypothesis** were not measured with Lighthouse/profiler. Items marked **confirmed** cite files.

---

## Accessibility and resilience findings

### A11Y-001 — No systematic a11y test suite found for student portals

| Field | Value |
|-------|-------|
| **ID** | A11Y-001 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Shared |
| **Classification** | Missing evidence |
| **Evidence** | Unit tests for mastery/secondary logic; no axe/playwright a11y suite located in this audit |
| **User impact** | Keyboard/AT regressions possible |
| **Curriculum impact** | Low |
| **Correction** | Add smoke a11y on `/primary`, `/secondary`, one LessonPlayer flow |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

### A11Y-002 — Drag_match and timed/game surfaces are high a11y risk

| Field | Value |
|-------|-------|
| **ID** | A11Y-002 |
| **Severity** | P1 |
| **Confidence** | Medium |
| **Portal** | Primary |
| **Classification** | Architectural risk / incomplete |
| **Evidence** | Complex pointer drag in `StoryBookView.tsx`; games (garden/pet) |
| **User impact** | Keyboard/AT users may be blocked from required screens |
| **Curriculum impact** | Cannot require drag_match as sole assessment path |
| **Correction** | Alternate input (tap-to-place); don’t gate mastery on drag-only |
| **Scope** | Large |
| **Blocks curriculum work?** | Yes if drag_match is mandatory evidence |

### A11Y-003 — Reduced motion / focus / dialogs uneven

| Field | Value |
|-------|-------|
| **ID** | A11Y-003 |
| **Severity** | P2 |
| **Confidence** | Low–Medium |
| **Portal** | Shared |
| **Classification** | Missing evidence / hypothesis |
| **Evidence** | Motion used in Primary dashboard; full `prefers-reduced-motion` audit not completed |
| **User impact** | Possible vestibular / focus issues |
| **Curriculum impact** | None |
| **Correction** | Audit overlays + LessonPlayer focus traps |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

### RES-001 — Media failure / placeholder images in content

| Field | Value |
|-------|-------|
| **ID** | RES-001 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Incomplete implementation |
| **Evidence** | Sets fall back to `placehold.co` URLs (e.g. `a1-pets.ts` guinea_pig) |
| **User impact** | Broken/ugly media in production content |
| **Curriculum impact** | Content QA required before scale |
| **Correction** | Fail validation if placeholder host; require media library ids |
| **Scope** | Medium |
| **Blocks curriculum work?** | Partially |

### RES-002 — Network / Supabase sync failure modes

| Field | Value |
|-------|-------|
| **ID** | RES-002 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Shared |
| **Classification** | Incomplete (local-first helps) |
| **Evidence** | Mastery local-first + sync (`supabase-sync.ts`); offline durability exists; conflict UX not fully inventoried |
| **User impact** | Possible silent sync lag |
| **Curriculum impact** | Teacher diagnostics may lag |
| **Correction** | Visible sync status; conflict policy docs |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

### RES-003 — Stale local state (Secondary pack version)

| Field | Value |
|-------|-------|
| **ID** | RES-003 |
| **Severity** | P3 |
| **Confidence** | High |
| **Portal** | Secondary |
| **Classification** | Complete pattern (positive) |
| **Evidence** | Today session invalidates on packId/version mismatch |
| **User impact** | Good resilience |
| **Curriculum impact** | Model for Primary versioning |
| **Correction** | Replicate for Primary content versions |
| **Scope** | — |
| **Blocks curriculum work?** | No |

### SEC-001 — Unlock-all + unscoped session (release blockers)

Cross-ref **ARCH-001**, **ARCH-005** / **MAST-003** — treat as P0 release blockers for progression + evidence integrity.

---

## Performance findings

### PERF-001 — Large client lesson surfaces

| Field | Value |
|-------|-------|
| **ID** | PERF-001 |
| **Severity** | P2 |
| **Confidence** | Medium (hypothesis on size impact) |
| **Portal** | Primary |
| **Classification** | Architectural risk |
| **Evidence** | `LessonPlayer` / `StoryBookView` are large client modules; Primary dashboard client-hydrated |
| **User impact** | Possible slow first open of vocab overlay (**not measured**) |
| **Curriculum impact** | Loading all set screens at once may not scale to huge sets |
| **Correction** | Measure bundle; lazy screens; cap words/set |
| **Scope** | Medium |
| **Blocks curriculum work?** | Soft cap on set size until measured |

### PERF-002 — Supabase query patterns

| Field | Value |
|-------|-------|
| **ID** | PERF-002 |
| **Severity** | P3 |
| **Confidence** | Medium |
| **Portal** | Shared |
| **Classification** | Hypothesis |
| **Evidence** | Mastery sync pull/push; teacher class diagnostics exist |
| **User impact** | Unknown under class-scale load |
| **Curriculum impact** | Teacher views at scale unproven |
| **Correction** | Load test class diagnostic queries |
| **Scope** | Medium |
| **Blocks curriculum work?** | No for authoring |

### PERF-003 — Initial question / word loading

| Field | Value |
|-------|-------|
| **ID** | PERF-003 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Both |
| **Classification** | Incomplete / mixed |
| **Evidence** | Primary loads set media via server action then builds screens; Secondary loads pack + images (`useSecondaryWordImages` previously had update-depth bug — fixed) |
| **User impact** | Overlay open cost; image waterfalls possible |
| **Curriculum impact** | Packs of 240 items need careful selection (daily slice mitigates) |
| **Correction** | Keep daily selection; paginate catalogs |
| **Scope** | Medium |
| **Blocks curriculum work?** | No if catalogs paginated |

---

## Score summary

| Sub-workstream | Score |
|----------------|-------|
| Accessibility, safety, resilience | **2 / 5** |
| Performance and release readiness | **3 / 5** |

P0s elsewhere (unlock-all, unscoped sessions) dominate release readiness despite moderate performance posture.
