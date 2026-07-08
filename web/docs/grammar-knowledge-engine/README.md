# Grammar Knowledge Engine (GKE)

The **Grammar Knowledge Engine** is the canonical reference database for ESL grammar concepts, progression paths, skill descriptors, and (later) content mappings. It drives posters, quizzes, lessons, mastery tracking, and curriculum planning.

**This folder is documentation and research first.** Application code consumes GKE exports in later phases.

## Status

| Phase | Focus | Status |
|-------|--------|--------|
| **0** | Research framework, sources, naming, domain outlines | **Complete** (2026-07-07) — [PHASE-0-SIGNOFF.md](./PHASE-0-SIGNOFF.md) |
| **1** | Populate A1–A2 concept + micro-skill ontology | **In progress** — Step 1 complete → [Step 2: existential pilot](./PHASE-1-PLAN.md#step-2--existential-pilot-prove-the-pipeline) |
| 2 | Progression graph (precursor / successor / contrast) | Not started |
| 3 | Map live posters + quizzes to concept IDs | Not started |

**Schema (Step 1):** [SCHEMA.md](./SCHEMA.md) · `npm run test:gke`

## v1 scope

- **Learners:** Primary ESL, ages ~6–11
- **CEFR:** A1–A2 deep population; B1+ skeleton only
- **Domains (v1):** Existential, nouns (countability + plural), determiners (some/any)

## Start here

1. Read [SCHEMA.md](./SCHEMA.md) for export file shapes
2. Review [PHASE-1-PLAN.md](./PHASE-1-PLAN.md) for full Phase 1 steps
3. Use [domains/existential.md](./domains/existential.md) as template for Step 2 population

## Folder map

```
docs/grammar-knowledge-engine/
  README.md
  SCHEMA.md
  PHASE-0-RESEARCH-PLAN.md
  PHASE-1-PLAN.md
  PHASE-1-STEP-1-PLAN.md
  SOURCES.md
  PROGRESSION-PRINCIPLES.md
  governance/
    ID-NAMING.md
    REVIEW-CHECKLIST.md
    RESEARCH-WORKSHEET.md
  domains/
    existential.md
    nouns.md
    determiners.md
  exports/
    concepts-a1-a2.json
    micro-skills-a1-a2.json
    errors-a1-a2.json
    domains-index.json
    schemas/
    fixtures/
  research/
    EXTRACTION-LOG.md
    POSTER-TO-RESEARCH-MAP.md

lib/gke/
  id-patterns.ts
  schema.ts
```

## Related docs

- [adaptive-learning-architecture-plan.md](../adaptive-learning-architecture-plan.md)
- [grammar-module/reference-index.md](../grammar-module/reference-index.md)
- [content/grammar/catalog.json](../../content/grammar/catalog.json)
