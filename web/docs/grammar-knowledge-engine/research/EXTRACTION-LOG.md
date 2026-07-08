# Extraction Log

Research journal for Grammar Knowledge Engine Phase 0.

**Phase 0 completed:** 2026-07-07  
**Researcher:** ESL + Cursor (public sources + live poster JSON)

---

## Session A — Orientation

**Date:** 2026-07-07  
**Duration:** ~45 min

### Teaching order vs catalog sortOrder

**Catalog order today:**

1. there-is-there-are-questions-a1  
2. there-is-there-are-affirmative-a1  
3. short-answers-there-is-a1  
4. countable-nouns-a1  
5. uncountable-nouns-a1  
6. some-and-any-a2  
7. plural-spelling-a2  
8. plural-pronunciation-a2  

**GKE progression order (pedagogical — frozen for Phase 1):**

1. **Affirmative** there is/are (state what exists)  
2. **Questions** Is there / Are there  
3. **Short answers** Yes, there is / No, there isn't  
4. **Countable** nouns + How many  
5. **Uncountable** nouns + How much (contrast with countable)  
6. **Some and any** (A2; builds on existential + countability)  
7. **Plural spelling** then **plural pronunciation** (successor chain)

**Decision:** Hub `sortOrder` may keep questions-first for historical reasons; **GKE precursor/successor edges use affirmative → questions → short answers**. Document in CONTENT-MAPPING (Phase 3) if hub order is updated.

### Open questions resolved

| # | Question | Decision |
|---|----------|----------|
| 1 | Questions before or after affirmative? | **Affirmative first** (British Council, Pearson A1, classroom logic) |
| 2 | `topicGroup: quantifiers` vs L1 determiners? | L1 = `grammar.determiners`; catalog group label unchanged |
| 3 | Negative existential in v1? | **In posters implicitly** (isn't/aren't on short answers); no separate L3 until needed |
| 4 | Thai L1 interference in v1? | **Defer** to Phase 5+; note omission of subject pronoun as future error family |

---

## Session B — EGP / CEFR

**Date:** 2026-07-07  
**Duration:** ~90 min  
**Sources:** English Grammar Profile (via englishgrammar.pro index), British Council A1-A2, Cambridge Grammar Today

### Worksheet A — Key findings (paraphrased)

| # | Search term | Paraphrased descriptor | CEFR | v1 | Maps to |
|---|-------------|------------------------|------|-----|---------|
| 1 | there is + NP | Use *there is* to say one thing exists in a place | A1 | Y | L4 affirmative.singular |
| 2 | there is + uncountable | *There is* with uncountable nouns (milk, water) | A1 | Y | L4 affirmative.singular_uncountable |
| 3 | there are + plural | Use *there are* for two or more things | A1 | Y | L4 affirmative.plural |
| 4 | there's contraction | *There's* common in speech; full form for emphasis | A1 | Y | L4 affirmative.contractions |
| 5 | Is there | Yes/no question with singular/uncountable | A1 | Y | L4 questions.singular_uncountable |
| 6 | Are there | Yes/no question with plural noun phrase | A1 | Y | L4 questions.plural |
| 7 | short answer yes/no | Answer *Yes, there is* / *No, there isn't* (full form in answers) | A1 | Y | L4 short_answers.* |
| 8 | there isn't / aren't | Negative existential forms | A1 | Y | short_answers negative sides |
| 9 | countable + how many | Ask *How many* with plural countable nouns | A1 | Y | countable L3 |
| 10 | uncountable + how much | Ask *How much* with uncountable nouns | A1 | Y | uncountable L3 |
| 11 | some affirmative | *Some* in affirmative statements | A2 | Y | some_and_any |
| 12 | any questions/negatives | *Any* in questions and negatives | A2 | Y | some_and_any |
| 13 | plural -s/-es | Regular plural spelling patterns | A2 | Y | plural.spelling |
| 14 | plural pronunciation | /s/, /z/, /ɪz/ allomorphs | A2 | Y | plural.pronunciation |

### Conflicts (Worksheet E)

| Topic | Source A | Source B | Decision |
|-------|----------|----------|----------|
| Questions vs affirmative order | Catalog sortOrder | British Council pedagogy | **Affirmative first** in GKE edges |
| *There's* with plural (informal) | Cambridge Grammar Today allows informal | Primary formal teaching | **Teach there are for plural**; defer informal there's+plural |
| *any* in Is there any milk? | Questions poster uses *any* | Some/any poster is A2 | **Introduce in questions poster** as exposure; mastery at A2 some/any L3 |

---

## Session C — YLE / ages

**Date:** 2026-07-07  
**Source:** Cambridge YLE Starters/Movers handbook (grammar & structures lists)

| L3 concept | Typical grade | YLE | Age | Notes |
|------------|---------------|-----|-----|-------|
| affirmative there is/are | 1–2 | Starters+ | 6–8 | Location/description in YLE tasks |
| questions there is/are | 2 | Movers+ | 7–9 | Short answers at Movers |
| short answers | 2–3 | Movers | 7–9 | Yes/no short forms in handbook |
| countable | 1–2 | Starters | 6–8 | Singular/plural in Starters list |
| uncountable | 2 | Starters | 7–9 | *I eat rice for lunch* in Starters examples |
| some/any | 3–4 | Movers/Flyers | 8–11 | *I want some milk* in Starters determiners |
| plural spelling | 3–4 | Movers+ | 8–11 | Irregular plurals in Movers |
| plural pronunciation | 4–5 | Flyers | 9–11 | Phonology often later than spelling |

---

## Session D — Existential deep dive

**Date:** 2026-07-07  
**Artifact:** [domains/existential.md](./domains/existential.md) — **≥90% complete**

### Oral check — Short answers placement

Short answers sit **after** questions because learners must recognize *Is there…?* / *Are there…?* before producing *Yes, there is* / *No, there aren't*. Affirmative statements provide the positive clause reused in short answers.

---

## Session E — Nouns + determiners

**Date:** 2026-07-07  
**Artifacts:** [domains/nouns.md](./domains/nouns.md), [domains/determiners.md](./domains/determiners.md) — **~70% complete**

---

## Session F — Sign-off

**Date:** 2026-07-07  
**Phase 0 exit checklist complete?** **Yes**  
**ID-NAMING v0.1 frozen?** **Yes** (see governance/ID-NAMING.md)

### Ready for Phase 1

Start with **existential domain only** in `exports/concepts-a1-a2.json`:

- 3 L3 concepts  
- 9 L4 micro-skills (one per poster card)  
- 12+ L5 paraphrased descriptors  
- Progression edges: affirmative → questions → short_answers
