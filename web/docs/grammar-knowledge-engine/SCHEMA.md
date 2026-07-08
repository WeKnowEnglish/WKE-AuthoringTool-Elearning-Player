# GKE — Schema Reference (v1)

**Schema version:** 1  
**Status:** Step 1 complete (2026-07-07)  
**Source of truth (runtime validation):** `lib/gke/schema.ts` (Zod)  
**Portable contract:** `exports/schemas/*.schema.json` (JSON Schema Draft 2020-12)

---

## Overview

The Grammar Knowledge Engine (GKE) models ESL grammar as a hierarchy:

| Level | Name | Example ID |
|-------|------|------------|
| L1 | Domain | `grammar.existential` |
| L2 | System | `grammar.existential.there_is_are` |
| L3 | Concept (poster) | `grammar.existential.there_is_are.affirmative` |
| L4 | Micro-skill (card) | `grammar.existential.there_is_are.affirmative.singular_countable` |
| L5 | Performance descriptor | Embedded as `l5Descriptor` on L4 |

Progression edges (`precursor`, `successor`, `contrast`) live on L3 records in Phase 1. Phase 2 adds `progression-edges.json`.

---

## Export files

| File | Root key | Record type |
|------|----------|-------------|
| `exports/concepts-a1-a2.json` | `records[]` | L3 concept |
| `exports/micro-skills-a1-a2.json` | `records[]` | L4 micro-skill |
| `exports/errors-a1-a2.json` | `records[]` | Error family |
| `exports/domains-index.json` | `domains[]` | L1 → L2 tree |

### Envelope (flat exports)

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-07",
  "records": []
}
```

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | `1` | Bump only on breaking changes |
| `generatedAt` | `YYYY-MM-DD` | Last manual edit date |
| `records` | array | Typed per file |

### Domains index (tree export)

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-07",
  "domains": []
}
```

L3 concepts are **not** nested under domains in this file — they live in `concepts-a1-a2.json`.

---

## ID conventions

Full rules: [governance/ID-NAMING.md](./governance/ID-NAMING.md) (v0.1 frozen).

| Pattern | Regex (summary) |
|---------|-----------------|
| Grammar ID | `grammar.<l1>[.<l2>[.<l3>[.<l4>]]]` |
| L3 concept | 3 segments after `grammar.` |
| L4 micro-skill | 4 segments after `grammar.` |
| Error code | `error.<family>.<specific>` |
| Chain entry | `domain_entry` (precursors only) |

Implementation: `lib/gke/id-patterns.ts`

---

## Record types

### L3 concept (`concept-record`)

| Field | Required | Type |
|-------|----------|------|
| `id` | yes | grammar L3 ID |
| `level` | yes | `3` |
| `parentId` | yes | grammar L2 ID; must be prefix of `id` |
| `label` | yes | `{ teacher, student }` |
| `function` | yes | string ≤ 120 |
| `cefr` | yes | `A1` \| `A2` \| `B1` (min 1) |
| `yle` | no | `starters` \| `movers` \| `flyers` |
| `strands` | yes | Learning strand IDs (min 1) |
| `teachOrder` | yes | int 1–99 |
| `posterSlug` | if `published` | catalog slug |
| `precursorIds` | yes | L3 IDs or `domain_entry` |
| `successorIds` | yes | L3 IDs (may be `[]`) |
| `contrastIds` | yes | L3 or L4 IDs (may be `[]`) |
| `status` | yes | see enums |
| `standardsRef` | no | Phase 5 stub |
| `notes` | no | internal |

### L4 micro-skill (`micro-skill-record`)

| Field | Required | Type |
|-------|----------|------|
| `id` | yes | grammar L4 ID |
| `level` | yes | `4` |
| `parentConceptId` | yes | grammar L3 ID |
| `label` | yes | `{ teacher, student }` |
| `l5Descriptor` | yes | paraphrased performance line ≤ 200 |
| `posterCardRef` | if `published` | `{ slug, cardIndex }` |
| `evidenceModes` | yes | min 1 |
| `errorCodes` | no | `error.*` codes |
| `tags` | no | e.g. `offers_requests`, `forward_preview` |
| `status` | yes | see enums |
| `standardsRef` | no | Phase 5 stub |
| `notes` | no | internal |

L4 `id` must equal `parentConceptId + "." + single_segment` (no nested segments).

### Error record (`error-record`)

| Field | Required | Type |
|-------|----------|------|
| `id` | yes | `error.<family>.<specific>` |
| `family` | yes | must match middle segment of `id` |
| `label` | yes | string ≤ 80 |
| `wrongExample` | no | illustrative learner error |
| `correctExample` | no | target form |
| `relatedL4Ids` | yes | min 1 L4 ID |
| `severity` | no | `low` \| `medium` \| `high` |
| `notes` | no | internal |

### Domain node (`domain-node`)

L1 node with nested `systems[]` (L2 only). Populated in Phase 1 Step 5.

---

## Enums

| Enum | Values | Platform source |
|------|--------|-----------------|
| `cefrLevel` | A1, A2, B1 | Poster catalog |
| `yleLevel` | starters, movers, flyers | Cambridge YLE |
| `learningStrandId` | 4 strand IDs | `lib/learning-strands.ts` |
| `evidenceMode` | recognition, recall, production, transfer | `lib/mastery/types.ts` |
| `publishStatus` | published, draft, stub, preview, optional | GKE lifecycle |
| `errorSeverity` | low, medium, high | GKE errors |

**`preview`** — forward-pointing exposure on a poster card (e.g. some/any preview on uncountable nouns).  
**`optional`** — valid L4 but not required for poster completion (e.g. offers/requests pattern).

---

## Cross-file integrity (Step 6)

Not enforced in Step 1 schema alone. `validate-gke-exports.ts` (Phase 1 Step 6) will check:

- Unique IDs within each export file
- Unique `teachOrder` across concepts
- L4 `parentConceptId` exists in concepts export
- `errorCodes` / `relatedL4Ids` reference known L4 IDs
- `posterSlug` exists in `content/grammar/catalog.json`
- `posterCardRef.cardIndex` in range for poster JSON

---

## Mastery mapping

When wired in Phase 4:

| Evidence | `LearningTargetRef` |
|----------|---------------------|
| Poster read complete | `{ type: "grammar", key: "<L3 id>" }` |
| Quiz / card drill | `{ type: "grammar", key: "<L4 id>" }` |
| Wrong answer | `response.errorCode` → `errors-a1-a2.json` |

`targetKey` uses the GKE ID string directly. No separate namespace prefix.

---

## Phase boundaries

| Phase | Adds |
|-------|------|
| 2 | `progression-edges.json` with edge metadata |
| 3 | `CONTENT-MAPPING.md`, `catalog.json` `conceptId` |
| 4 | [EVIDENCE-RULES.md](./EVIDENCE-RULES.md), `recordGrammarEvidence()` — **G1 landed** |
| 5 | `standards-index.json`, populated `standardsRef` |
| 6 | Lesson AI prompts, recommendations |

---

## Examples

### L3 concept (existential affirmative)

See `exports/fixtures/valid/sample-existential-concept.json`.

### L4 micro-skill

See `exports/fixtures/valid/sample-existential-micro-skill.json`.

### Validation

```bash
npx vitest run lib/gke
```

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1 | 2026-07-07 | Initial schema: concept, micro-skill, error, domain-node |
