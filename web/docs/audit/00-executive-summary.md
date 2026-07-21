# 00 — Executive Summary: Curriculum Readiness Audit

Audit date: 2026-07-20  
Scope: Next.js / React / Supabase ESL platform — Primary and Secondary student portals + shared foundation.  
Method: Code and schema tracing only; no application changes. Evidence under `docs/audit/evidence/`.

---

## Readiness verdict

# FOUNDATION WORK REQUIRED

The platform is a **working vocabulary practice product** with a serious mastery engine and two student portals. It is **not** structurally ready for **large-scale curriculum authoring and publication** as a general ESL curriculum system.

Unresolved **P0** defects (unlock-all; unscoped practice-session storage) plus multiple **P1** curriculum blockers (no Primary content graph/CMS, missing CEFR/grade/objective modeling, incomplete scoring contracts, vocab-centric mastery, thin grammar assessment) override any optimistic numeric average.

---

## Weighted scores

| Workstream | Score (0–5) | Weight | Weighted |
|------------|-------------|--------|----------|
| Architecture and code health | 2 | 15% | 0.30 |
| Curriculum architecture | 1 | 20% | 0.20 |
| Student learning experience | 3 | 15% | 0.45 |
| Primary/Secondary differentiation | 3 | 10% | 0.30 |
| Language and instructional design | 3 | 15% | 0.45 |
| Assessment and mastery | 2 | 10% | 0.20 |
| Accessibility, safety, resilience | 2 | 10% | 0.20 |
| Performance and release readiness | 3 | 5% | 0.15 |
| **Numeric total** | | | **2.25 / 5** |

**Override:** P0 + P1 curriculum blockers → verdict **FOUNDATION WORK REQUIRED** (numeric score cannot raise this).

---

## Portal summary

| Portal | Strength | Gap |
|--------|----------|-----|
| **Primary** | `/primary` dashboard, vocab overlays, rewards, review/progress | Content in TS modules; dual `/home`; unlock-all; weak curriculum metadata; uneven scoring |
| **Secondary** | Pack + daily path; CEFR/gradeBand on items; solid activity loop | a2-only; no unit/objective graph; kid visual bleed; sentence teacher-gated |
| **Shared** | LessonPlayer, mastery sync, grammar poster publish | Page-only auth; session bus unscoped; grammar quizzes nearly empty; no general CMS |

---

## All P0 findings

| ID | Summary |
|----|---------|
| **ARCH-001** | `UNLOCK_ALL_ACTIVITIES_DURING_DEV = true` in `lib/progress/unlock-registry.ts` — progression gates disabled |
| **ARCH-005 / MAST-003** | Practice session events stored under unscoped `wke-student-session-events-v1` — cross-student pollution on shared devices; corrupts completion-derived signals |

## All P1 findings (curriculum / structural)

| ID | Summary |
|----|---------|
| ARCH-002 | Auth enforcement page-level only |
| ARCH-004 / FEAT-001 / DIFF-004 | Dual Primary homes `/primary` + `/home` |
| ARCH-006 / CURR-002 | No scalable Primary authoring/publish pipeline |
| CURR-001 | Primary sets lack grade / CEFR / strand / objective fields |
| CURR-003 | Secondary pack ≠ full curriculum graph; band binary |
| CURR-004 / MAST-004 | Grammar assessed coverage ≈ one quiz slug |
| CURR-005 / MAST-002 | Learn + drag_match unscored; completion misleading |
| CURR-006 / MAST-006 | No Primary contentVersion / safe revision model |
| MAST-001 | Mastery remains vocabulary-MVP-centric |
| FEAT-003 | Assigned Primary learning path not first-class |
| DIFF-005 | Portal mapping is a2 vs not — not grade×CEFR |
| A11Y-002 | Drag_match high a11y risk if used as required assessment |

---

## Ten highest-value corrections (dependency order)

1. Disable unlock-all (ARCH-001).  
2. Scope student-session storage (ARCH-005).  
3. Align set completion with scored screens (MAST-002).  
4. Publish activity contract allowlist (CURR-009).  
5. Primary content metadata + contentVersion schema (CURR-001 / CURR-006).  
6. CI content validators (CURR-008).  
7. Primary package import pipeline (CURR-002).  
8. Content-driven grammar quiz items (MAST-004).  
9. Consolidate Primary home (ARCH-004).  
10. Separate curriculum sequencing from XP economy (ARCH-009).

Full plan: `10-remediation-roadmap.md`.

---

## Curriculum work that can begin immediately

- Expand **Secondary** vocab pack items within the existing JSON schema.  
- Author/publish **grammar posters** (instructional; not scored mastery).  
- Small, engineer-led **Primary set** additions (accept metadata debt).  
- Student **copy glossary** cleanup.  
- Parallel **live-game / classroom** content (do not claim platform mastery).

## Curriculum work that must wait

- Large-scale Primary authoring by non-engineers.  
- Multi-skill / grammar mastery product claims.  
- Course · unit · objective graphs and class-assigned Primary paths.  
- High-stakes use of drag_match / set-completion as assessment.  
- Multi-band Secondary without portal/band product decisions.  
- CEFR sequencing via XP unlock registry.

---

## Unresolved product-owner decisions

1. Fate of `/home` (legacy / Games-only / remove).  
2. Public vs authenticated `/grammar`.  
3. Economy unlocks vs curriculum gates.  
4. Teacher assignments on Primary in scaled v1?  
5. Sentence: teacher score vs auto-score.  
6. Canonical portal rule: grade × CEFR × band.  
7. Accessibility bar for required activities.  
8. Package-file authoring acceptable before full CMS?

---

## Document index

| Doc | Purpose |
|-----|---------|
| `01-system-map.md` | Routes, portals, stores, hierarchy |
| `02-code-architecture-audit.md` | Architecture findings |
| `03-curriculum-readiness-audit.md` | Content model readiness |
| `04-student-feature-inventory.md` | Feature classification + journeys |
| `05-primary-secondary-comparison.md` | Differentiation |
| `06-student-language-audit.md` | Language + glossary |
| `07-assessment-mastery-audit.md` | Evidence pipeline |
| `08-accessibility-performance-audit.md` | A11y / resilience / perf |
| `09-risk-register.md` | Consolidated risks |
| `10-remediation-roadmap.md` | Phased corrections |
| `evidence/*` | Route, activity, string, data-flow inventories |

---

## Rewrite recommendation

**Do not rewrite.** Incremental remediation is safer: keep LessonPlayer, mastery engine, Secondary pack loader, grammar publish, and Primary dashboard; replace content authoring assumptions and fix P0 integrity issues first.
