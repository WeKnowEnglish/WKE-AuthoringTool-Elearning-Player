# GKE — ID Naming Convention (v0.1 frozen)

**Frozen:** 2026-07-07 (Phase 0 sign-off). Changes require migration log in Phase 1+.

---

## Format

```
grammar.<l1_domain>.<l2_system>.<l3_concept>.<l4_micro_skill>
```

- All lowercase
- Segments: `snake_case`
- Prefix always `grammar.`
- Omit L4 segment on L3-only references

---

## Level examples

| Level | Example ID |
|-------|------------|
| L1 | `grammar.existential` |
| L2 | `grammar.existential.there_is_are` |
| L3 | `grammar.existential.there_is_are.questions` |
| L4 | `grammar.existential.there_is_are.questions.singular_uncountable` |

---

## L1 domains (v1)

| ID | Label |
|----|-------|
| `grammar.existential` | Existential (there is / there are) |
| `grammar.nouns` | Nouns |
| `grammar.determiners` | Determiners & quantifiers |
| `grammar.verbs` | Verbs (stub — Phase 1+) |
| `grammar.clauses` | Clauses (stub) |

---

## L3 draft IDs (map to poster slugs)

**GKE teach order** (precursor chain): affirmative → questions → short_answers → countable → uncountable → some_and_any → plural_spelling → plural_pronunciation

| Teach order | Poster slug | L3 concept ID (draft) |
|-------------|-------------|------------------------|
| 1 | `there-is-there-are-affirmative-a1` | `grammar.existential.there_is_are.affirmative` |
| 2 | `there-is-there-are-questions-a1` | `grammar.existential.there_is_are.questions` |
| 3 | `short-answers-there-is-a1` | `grammar.existential.there_is_are.short_answers` |
| 4 | `countable-nouns-a1` | `grammar.nouns.countability.countable` |
| 5 | `uncountable-nouns-a1` | `grammar.nouns.countability.uncountable` |
| 6 | `some-and-any-a2` | `grammar.determiners.quantifiers.some_and_any` |
| 7 | `plural-spelling-a2` | `grammar.nouns.plural.spelling` |
| 8 | `plural-pronunciation-a2` | `grammar.nouns.plural.pronunciation` |

---

## L4 naming rules

- Name by **skill**, not poster card title
- Include **form** when needed: `positive_singular`, `negative_plural`
- Max 4 segments after L3: avoid `grammar.existential.there_is_are.questions.card1_is_there`

**Good:** `grammar.existential.there_is_are.questions.singular_uncountable`  
**Bad:** `grammar.existential.there_is_are.questions.card_1`

---

## Error codes (separate namespace)

```
error.<family>.<specific>
```

Examples:

- `error.agreement.there_are_singular`
- `error.determiner.a_an_with_uncountable`
- `error.quantifier.some_in_question`

---

## Versioning

- ID changes require entry in `research/ID-MIGRATIONS.md` (create in Phase 1 if needed)
- Never reuse an ID for a different meaning
