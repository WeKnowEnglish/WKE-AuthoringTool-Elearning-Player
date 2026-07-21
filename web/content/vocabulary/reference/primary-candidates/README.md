# WKE Primary Vocabulary Candidate Package

Canonical placement for the Primary ESL **2,000-entry candidate inventory**
(Pre-A1 through A2 planning stages).

Status: `planning_only_not_production`.

This is the identity and coverage starting point for editorial review and
teacher word-pack authoring. It does **not** claim reviewed senses, child
definitions, Vietnamese meanings, forms, examples, or mastery contracts.

**Do not connect student mastery to these IDs** until the entry has a confirmed
sense and an approved legacy-ID mapping. Do not replace live `MASTER_VOCABULARY`
or Primary set modules with this corpus yet.

## Layout

```text
primary-candidates/
├── README.md
├── vocabulary-types.ts          # package shape (mirrored in lib/)
├── data/
│   ├── primary-vocabulary-candidates.v1.json   # full entries (~2.2 MB)
│   ├── primary-vocabulary-search-index.v1.json # slim search rows (~0.5 MB)
│   └── primary-vocabulary-candidates.v1.csv
├── reports/
│   └── coverage-summary.md
└── sources/
    ├── ATTRIBUTION.md
    └── cefrj-vocabulary-profile-1.5.csv
```

App loaders (prefer these in product code):

```text
web/lib/vocabulary/primary-candidates/
```

- `getPrimaryVocabularySearchIndex()` — teacher search / filter UI
- `searchPrimaryVocabularyIndex()` — in-memory descriptor filters
- `getPrimaryVocabularyCandidateById()` — full row when enriching a pack

## What is authoritative

- `sourceCefr` and `sourceTopics` preserve external CEFR-J source evidence.
- Stable candidate IDs use `pv_{lemma}_{pos}`.
- Project extensions use the same entry shape but are identified through
  `levelBasis` and `sourceRefs`.

## What remains provisional

- Pre-A1 and `.1/.2` Primary stages
- `senseKey: "unspecified"`
- Primary topic inference
- Blank linguistic / learner-support fields
- Membership in a final published 2,000-item core

## Rebuild search index

From `web/`:

```bash
node scripts/build-primary-vocabulary-search-index.mjs
```

Run this after regenerating or editing `primary-vocabulary-candidates.v1.json`.

Original package build/validate scripts (if present in an upload archive):

```bash
python scripts/build_primary_vocabulary.py
python scripts/validate_primary_vocabulary.py
```

## Next editorial workflow

1. Import the 255 live Primary set words into a mapping sheet.
2. Match by lemma + POS + intended meaning, never lemma alone.
3. Preserve current Primary IDs in an alias table.
4. Confirm senses for the entries required by the first two pilot sets.
5. Review candidate stage, English definition, Vietnamese meaning, forms,
   grammar behavior, example, and media.
6. Publish only reviewed entries needed by the pilot.
7. Scale review by topic and stage after the complete learning flow works.

## Suggested pilot

- `food_fruit`: nouns, images, countability, variants, spelling, Collection
- `school_activities`: verbs, conjugations, grammar links, Cloze, mastery

## Licensing and provenance

See `sources/ATTRIBUTION.md`. This package does not copy Cambridge, Oxford, or
other proprietary commercial wordlists. External CEFR-J evidence is retained
with attribution, and project extensions are explicitly labeled.
