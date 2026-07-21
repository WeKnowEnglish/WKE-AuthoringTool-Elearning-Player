# 10 — Remediation Roadmap

Audit date: 2026-07-20  
Dependency order: safety → evidence integrity → content contracts → authoring scale → portal polish.

## Phase 0 — Release / evidence safety (do first)

| Order | Action | Resolves | Scope |
|------|--------|----------|-------|
| 1 | Set `UNLOCK_ALL_ACTIVITIES_DURING_DEV = false` (or env-gate); add CI guard | ARCH-001 | S |
| 2 | Scope `student-session` storage like mastery; migrate/clear legacy key | ARCH-005, MAST-003 | M |
| 3 | Document scoring contract: which Primary screens emit mastery | CURR-005, MAST-002 | S |
| 4 | Either score `drag_match` or exclude from “assessment complete” | CURR-005, A11Y-002 | M |

**Exit:** Progression honest; session events student-scoped; set completion aligned with evidence.

## Phase 1 — Curriculum contracts (before scale authoring)

| Order | Action | Resolves | Scope |
|------|--------|----------|-------|
| 5 | Define Primary content package schema: set metadata (CEFR, grade band, strand, objectives), word ids, media refs, contentVersion | CURR-001, CURR-006, MAST-006 | L |
| 6 | CI validators for Primary packages + Secondary packs | CURR-008 | M |
| 7 | Official activity allowlist (publish `activity-contract-matrix` as governance) | CURR-009, ARCH-007 | S |
| 8 | Distinct evidence `source` / portal tags for Secondary vs Primary | MAST-005 (verify in bridge), MAST-008 | S |
| 9 | Grammar quiz items as content (not hardcoded single map) | CURR-004, MAST-004 | L |

**Exit:** Authors know exact shapes; revisions versioned; grammar assessment path exists.

## Phase 2 — Authoring pipelines

| Order | Action | Resolves | Scope |
|------|--------|----------|-------|
| 10 | Primary: import pipeline (JSON package → runtime) without full CMS | ARCH-006, CURR-002 | L |
| 11 | Derive unlocks from content metadata; separate economy vs curriculum unlocks | ARCH-008, ARCH-009 | M–L |
| 12 | Secondary: optional unit/lesson graph **or** explicitly defer courses | CURR-003 | L / product |
| 13 | Central route auth matcher | ARCH-002 | M |

**Exit:** Non-engineers (or content ops) can publish Primary vocab packages; Secondary pack expansion remains valid.

## Phase 3 — Student journey consolidation

| Order | Action | Resolves | Scope |
|------|--------|----------|-------|
| 14 | Product decision + implement: sunset or demote `/home` | ARCH-004, FEAT-001 | L |
| 15 | Portal rules: grade × CEFR × product line (not binary a2) | DIFF-005 | M |
| 16 | Assigned Primary learning path (if class model required) | FEAT-003 | L |
| 17 | Secondary visual theme (drop kid token bleed) | DIFF-001 | M |
| 18 | Student copy glossary module | LANG-* | M |

## Phase 4 — Hardening

| Order | Action | Resolves | Scope |
|------|--------|----------|-------|
| 19 | A11y smoke + alternate to drag_match | A11Y-* | M–L |
| 20 | Media validation (ban placehold.co in prod content) | RES-001 | M |
| 21 | Measure LessonPlayer open cost; catalog pagination | PERF-* | M |
| 22 | Sync status UX for mastery | RES-002 | M |

---

## Ten highest-value corrections (dependency order)

1. Disable unlock-all (ARCH-001).  
2. Scope student-session events (ARCH-005).  
3. Align Primary set completion with scored screens (MAST-002 / CURR-005).  
4. Publish activity contract allowlist (CURR-009).  
5. Add Primary content metadata + contentVersion schema (CURR-001 / CURR-006).  
6. CI validate content packages (CURR-008).  
7. Primary package import pipeline (CURR-002).  
8. Content-driven grammar quiz items (MAST-004).  
9. Consolidate Primary home (ARCH-004).  
10. Separate curriculum sequencing from XP economy (ARCH-009).

## What can begin immediately (safe)

- **Secondary vocab pack expansion** within existing JSON schema (CEFR A2 / gradeBand as today).  
- **Grammar poster authoring/publishing** (read-only / instructional).  
- **Primary vocab set authoring in code** for small increments (engineer-led), accepting metadata debt.  
- **Copy glossary** and Secondary instructional string cleanup.  
- **Live-game / classroom** content (parallel track; do not claim platform mastery).

## What must wait

- Large-scale **Primary** curriculum publication by non-engineers.  
- Claims of **multi-skill / grammar mastery** completeness.  
- **Course / unit / objective** graphs and class-assigned Primary paths.  
- Using **drag_match** or set completion as high-stakes assessment evidence.  
- Multi-band Secondary (B1+) without portal/band product decision.  
- Treating XP unlock registry as CEFR sequencing.

## Product-owner decisions required

1. Is `/home` legacy forever, Games-only, or removed?  
2. Is `/grammar` intentionally public?  
3. Economy unlocks vs curriculum gates — same or separate?  
4. Must Primary support teacher **assignments** in v1 of scaled curriculum?  
5. Sentence writing: teacher score forever or auto-score later?  
6. Portal mapping: grade vs CEFR vs `learning_band` — canonical rule?  
7. Minimum accessibility bar for required activities (can drag_match be required)?  
8. Accept package-file authoring before building a full CMS?
