# GKE — Source Bibliography & Extraction Plan

**Rule:** Paraphrase descriptors for internal use. Store attribution (`egpRef`, URL, CEFR band). Do not bulk-copy copyrighted EGP text into student-facing content.

---

## Tier 1 — Required for Phase 0

| Source | URL / access | Extract | Phase 0 task |
|--------|--------------|---------|--------------|
| **English Grammar Profile (EGP)** | https://www.englishprofile.org/english-grammar-profile | Criterial features, CEFR band, example patterns | Sessions B, D, E — search per POSTER-TO-RESEARCH-MAP |
| **CEFR criterial features** | https://www.cambridge.org/elt/blog/2021/06/23/using-cefr-criterial-features-for-grammar-instruction/ | What distinguishes A1 from A2 | Session B — read once |
| **English Profile booklet** | https://languageresearch.cambridge.org/images/pdf/theenglishprofilebooklet.pdf | Grammar profile overview | Session B — skim grammar section |
| **Your reference infographics** | [reference-index.md](../grammar-module/reference-index.md) | Domain validation, card structure | Sessions D–E |
| **Live poster catalog** | [catalog.json](../../content/grammar/catalog.json) | Ground truth for what you teach today | Session A |

---

## Tier 2 — Recommended in Phase 0 or early Phase 1

| Source | Extract | When |
|--------|---------|------|
| **Cambridge YLE** (Starters / Movers / Flyers handbooks) | Age-appropriate can-do grammar | Session C |
| **Paul Nation Four Strands** | Strand tags per concept | Already in `lib/learning-strands.ts` |
| **Primary course scopes** (Oxford/Cambridge Primary public syllabi) | Topic order cross-check | Session E if time |
| **Grade 1–5 ESL framework** (center doc) | Grade → concept mapping | When available — log in EXTRACTION-LOG |

---

## Tier 3 — Defer

- English Vocabulary Profile (collocation links)
- Cambridge Learner Corpus error stats
- NGSL
- Thai L1 interference catalog
- National curriculum standards IDs

---

## EGP search term list (copy into browser)

Use in Session B; tick in [POSTER-TO-RESEARCH-MAP.md](./research/POSTER-TO-RESEARCH-MAP.md).

| Topic | Search terms |
|-------|----------------|
| Existential | `there is`, `there are`, existential |
| Questions | `is there`, `are there`, inversion |
| Short answers | `yes there is`, short answer |
| Countable | `countable`, `how many`, plural countable |
| Uncountable | `uncountable`, `how much`, mass noun |
| Some/any | `some`, `any`, quantifier |
| Plural spelling | plural `-s`, `-es`, `-ies` |
| Plural pronunciation | plural `/s/`, `/z/`, `/ɪz/` |

---

## Source conflict resolution

When EGP, YLE, and classroom practice disagree:

1. **Default:** EGP sets CEFR band tag on the concept.
2. **Teaching order:** Classroom order wins for `precursor`/`successor` edges — document rationale in EXTRACTION-LOG.
3. **Primary simplification:** YLE / age band wins for kid-facing labels and what you defer to A2.
4. **Log every conflict** in EXTRACTION-LOG §Conflicts.

---

## Review status

| Source | Reviewed? | Date | Notes |
|--------|-----------|------|-------|
| EGP — existential | [x] | 2026-07-07 | Paraphrased via BC + EGP index |
| EGP — nouns | [x] | 2026-07-07 | Countability + plural |
| EGP — some/any | [x] | 2026-07-07 | A2 quantifiers |
| CEFR criterial blog | [x] | 2026-07-07 | Descriptive progression principle |
| YLE handbooks | [x] | 2026-07-07 | Starters/Movers age calibration |
| Reference JPG index | [x] | 2026-07-07 | 8/11 mapped |
