# Progression Principles

Rules for linking grammar concepts in the GKE. Edges are **separate** from the parent-child tree (L1→L5).

---

## Edge types

| Type | Meaning | Example |
|------|---------|---------|
| **precursor** | Simpler form typically learned **before** this concept | affirmative → questions |
| **successor** | Natural **next** complexity after this concept | questions → short_answers |
| **contrast** | Often **confused** with; teach close together or compare | countable ↔ uncountable |

**Do not** use contrast for strict ordering. Use precursor/successor for sequence.

---

## When to add each edge

### Precursor

Add when:

- Students need the earlier form to understand the later one
- EGP or YLE shows the earlier feature at a lower band
- Your posters already teach in that order

Skip when:

- Concepts are independent (e.g. plural spelling vs there is)

### Successor

Add when:

- Most students ready for the next step after securing this concept
- Your catalog `sortOrder` implies this path

One concept may have **multiple** successors (branching curriculum).

### Contrast

Add when:

- Errors in class mix two concepts (is/are, some/any, countable/uncountable)
- Posters use good/bad pairs or side-by-side layouts

---

## Complexity dimensions (tag on edges)

| Dimension | Values | Example edge |
|-----------|--------|--------------|
| `polarity` | affirmative → negative → question | there is stmt → Is there…? |
| `agreement` | singular → plural | Is there → Are there |
| `noun_type` | countable → uncountable | How many → How much |
| `discourse` | statement → short_answer → extended | (short answers track) |
| `form` | base → contraction | There is → There's |

---

## Source conflicts

See [SOURCES.md](./SOURCES.md). Summary:

- **CEFR band tag** → follow EGP when possible
- **Teaching sequence** → follow your classroom + poster order; note why in EXTRACTION-LOG
- **Kid labels** → primary/YLE calibration overrides jargon

---

## v1 progression chains (draft — validate in Phase 0)

### Existential

```
affirmative → questions → short_answers
```

### Nouns

```
countable ↔ uncountable (contrast)
countable → plural_spelling → plural_pronunciation (successor)
```

### Determiners

```
countable/uncountable → some_and_any (precursors)
questions (existential) → some_and_any (optional precursor for any in questions)
```

### Full v1 curriculum chain (cross-domain)

```
affirmative → questions → short_answers
    → countable ↔ uncountable
    → some_and_any
countable → plural_spelling → plural_pronunciation
```

---

## Anti-patterns

- Do not create a successor edge only because topics appear adjacent in a textbook index
- Do not merge L3 concepts that have separate posters unless you intentionally collapse curriculum
- Do not add B1 concepts as successors in v1 unless marked `status: stub`
