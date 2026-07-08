# Domain: Determiners (quantifiers)

**L1 ID:** `grammar.determiners`  
**L2 system:** `grammar.determiners.quantifiers`  
**Status:** Phase 1 Step 4 complete — ontology populated in exports

**Naming:** Catalog uses `topicGroup: quantifiers`. GKE L1 is **determiners** (broader); L2 **quantifiers** holds some/any. Articles (`a/an/the`) stubbed for Phase 1+.

---

## L3 concepts (v1)

| L3 ID | Poster slug | CEFR | YLE | Status |
|-------|-------------|------|-----|--------|
| `grammar.determiners.quantifiers.some_and_any` | some-and-any-a2 | A2 | Movers–Flyers | published |

**Future stubs (IDs only):**

- `grammar.determiners.articles.indefinite` (a/an)  
- `grammar.determiners.articles.definite` (the)  
- `grammar.determiners.demonstratives` (this/that/these/those)

---

## Precursors (cross-domain)

| Precursor L3 | Edge type | Rationale |
|--------------|-----------|-----------|
| `grammar.nouns.countability.countable` | precursor | *some apples* needs plural countable |
| `grammar.nouns.countability.uncountable` | precursor | *some milk* needs uncountable |
| `grammar.existential.there_is_are.affirmative` | precursor | *There is some …* frame |
| `grammar.existential.there_is_are.questions` | precursor | *any* in *Is there any …?* |

**Successor:** none in v1 posters (future: much/many, a lot of).

---

## Poster → L4 (some-and-any-a2)

| Card | kidTitle | L4 ID | L5 descriptor |
|------|----------|-------|---------------|
| 1 | Some (Affirmative) | `grammar.determiners.quantifiers.some_and_any.some_affirmative` | Use *some* in affirmative statements |
| 2 | Any (Questions) | `grammar.determiners.quantifiers.some_and_any.any_questions` | Use *any* in questions |
| 3 | Any (Negative) | `grammar.determiners.quantifiers.some_and_any.any_negative` | Use *any* in negative sentences |
| 4 | Some (Offers/requests) | `grammar.determiners.quantifiers.some_and_any.some_offers` | Use *some* in offers (*Would you like some …?*) — optional emphasis |
| 5 | Remember! | `grammar.determiners.quantifiers.some_and_any.summary_matrix` | Choose some vs any by sentence type |

---

## EGP alignment (paraphrased)

| Descriptor | CEFR | L4 |
|------------|------|-----|
| *some* + plural/count noun in affirmative | A2 | some_affirmative |
| *some* + uncountable in affirmative | A2 | some_affirmative |
| *any* in questions and negatives | A2 | any_questions, any_negative |
| *any* in affirmative questions (*Do you have any …?*) | A2 | any_questions |

---

## Contrasts

| A | B | Notes |
|---|---|-------|
| some | any | affirmative vs question/negative polarity |
| some | much/many | defer — different quantifier system |
| any (question) | some (affirmative) | paired contrast for teaching |

---

## Error families

| errorCode | Wrong | Correct |
|-----------|-------|---------|
| `error.quantifier.some_in_question` | Do you have some milk? | Do you have any milk? |
| `error.quantifier.any_in_affirmative` | I have any apples. | I have some apples. |
| `error.quantifier.some_with_negative` | I don't have some books. | I don't have any books. |

---

## Phase 0 completion

- [x] L1 naming decided (`determiners` / L2 `quantifiers`)  
- [x] Precursors from nouns + existential listed  
- [x] EGP rows for some/any  
- [x] 5 L4 drafts from poster cards  
- [x] Card 4 offer/request pattern — `some_offers` as `optional` + tag `offers_requests`
