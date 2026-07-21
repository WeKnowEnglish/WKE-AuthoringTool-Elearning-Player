# 09 — Risk Register

Audit date: 2026-07-20  
Sorted by severity, then curriculum-blocking impact.

| ID | Sev | Conf | Portal | Classification | Summary | Blocks curriculum? | Scope |
|----|-----|------|--------|----------------|---------|-------------------|-------|
| ARCH-001 | P0 | High | Primary | Confirmed defect | `UNLOCK_ALL_ACTIVITIES_DURING_DEV = true` | Yes | S |
| ARCH-005 / MAST-003 | P0 | High | Shared | Confirmed defect | Unscoped `wke-student-session-events-v1` | Yes | M |
| ARCH-006 / CURR-002 | P1 | High | Primary | Incomplete | No Primary CMS / package pipeline | Yes | L |
| CURR-001 | P1 | High | Primary | Incomplete | No grade/CEFR/strand/objective on sets | Yes | L |
| CURR-003 | P1 | High | Secondary | Incomplete | Pack ≠ course graph; a2-only | Course yes; pack expand no | L |
| CURR-004 / MAST-004 | P1 | High | Shared | Incomplete | Grammar scored coverage ≈ 1 slug | Assessed grammar yes | L |
| CURR-005 / MAST-002 | P1 | High | Primary | Incomplete | Learn + drag_match unscored | Assessment design yes | M |
| CURR-006 / MAST-006 | P1 | Med | Primary | Risk | No Primary content versioning | Revisions yes | L |
| MAST-001 | P1 | High | Shared | Incomplete | Mastery still vocab-MVP | Multi-skill yes | L |
| ARCH-002 | P1 | High | Shared | Risk | Page-only auth | No | M |
| ARCH-004 / FEAT-001 / DIFF-004 | P1 | High | Primary | Incomplete | Dual `/primary` + `/home` | Partial | L |
| FEAT-003 | P1 | Med | Primary | Missing evidence | No first-class assigned Primary path | Class Primary yes | L |
| DIFF-005 | P1 | High | Shared | Product decision | Band model binary a2 vs else | Multi-band yes | M |
| A11Y-002 | P1 | Med | Primary | Risk | Drag_match a11y / sole-path risk | If mandatory yes | L |
| ARCH-003 | P2 | High | Shared | Product decision | `/grammar` unauthenticated | No | S–M |
| ARCH-007–010 | P2 | — | Shared | Risk / incomplete | Schema breadth, unlock hardcoding, economy conflation, uneven UX states | Scale / sequencing | M–L |
| FEAT-002 | P2 | Med | Primary | Disconnected | Games ≠ mastery | No if labeled | M |
| FEAT-004 | P2 | High | Secondary | Partial | Sentence teacher-gated | Product | M |
| DIFF-001 / LANG-005 | P2 | High | Secondary | Risk | Kid visual tokens on Secondary | No | M |
| LANG-001–004 | P2–P3 | — | Both | Design | Copy / glossary gaps | No | S–M |
| MAST-005 / MAST-007–008 | P2 | — | Shared | Risk | Provenance, scoring docs, dual buses | Partial | S–M |
| RES-001–002 / PERF-* | P2–P3 | — | Shared | Incomplete / hypothesis | Media, sync, bundles | Soft | M |
| DIFF-002–003 / RES-003 / LANG-002 | P3 | — | — | Healthy or minor | — | No | S |

## Aggregate counts

| Severity | Count (unique themes) |
|----------|------------------------|
| P0 | 2 |
| P1 | 12 |
| P2 | ~15 |
| P3 | several |

## Override rule

Any readiness score is capped by **unresolved P0** and **P1 curriculum blockers**. Both P0s and multiple P1 curriculum blockers remain open → verdict cannot be READY or CONDITIONALLY READY without remediation plan acceptance that explicitly defers scale authoring.
