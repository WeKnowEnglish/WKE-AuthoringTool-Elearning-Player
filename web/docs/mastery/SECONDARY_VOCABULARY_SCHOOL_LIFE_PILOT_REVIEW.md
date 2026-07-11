# Secondary Vocabulary School Life Pilot Review

**Phase:** Language enrichment Phase 3  
**Status:** Authored; bilingual and classroom review pending  
**Scope:** 20 Grade 7 A2 words in the `school-life` topic  
**Standards:** [Phase 1 language standard](./SECONDARY_VOCABULARY_LANGUAGE_QUALITY_STANDARD.md) · [Phase 2 schema](./PROPOSAL_SECONDARY_VOCABULARY_LANGUAGE_SCHEMA_V2.md)

## Delivered coverage

All 20 words now contain:

- two full rich examples, including a distinct transfer example;
- at least one labelled collocation or grammar pattern with a model;
- one age-relevant production prompt, sentence starter, and model answer;
- one unseen cloze context with explicit acceptable answers and difficulty;
- a usage note or confusion contrast when it prevents a likely error.

The legacy `exampleSentence` and `sentenceFrame` remain in place. Current student UI therefore remains stable until a later phase deliberately switches the Word Helper and quiz compilers to the rich fields.

## Instructional design choices

### Subjects, places, and people

- Subject examples move beyond naming preferences into timetables, sources, comparisons, and real-world explanation.
- Place words model authentic school actions such as borrowing, returning, measuring, and following laboratory safety rules.
- Person words distinguish formal school roles and peer relationships.

### Homework, tests, and actions

- Assessment words explicitly distinguish `test`, `exam`, `score`, and `grade`.
- Task words distinguish shorter assignments from multi-stage projects.
- Action words model productive patterns such as `revise for`, `submit to/by`, and `meet a deadline`.
- Reflection language treats mistakes and scores as information for improvement rather than judgments about ability.

## High-value contrasts included

| Target | Contrast | Teaching point |
| --- | --- | --- |
| subject | topic | whole study area vs one part |
| library | bookshop | borrow vs buy |
| classmate | friend | shared class vs chosen relationship |
| principal | principle | school leader vs rule/belief |
| timetable | calendar | repeated lesson times vs dates/events |
| assignment | homework | specific task vs work done outside class |
| project | assignment | multi-stage work vs potentially shorter task |
| test | exam | shorter/smaller assessment vs longer/formal assessment |
| score | grade | points vs reported level/result |
| revise | review | British school-use convention and broad synonym |
| submit | save | send for review vs keep a file |
| lesson | class | teaching period vs group or period |
| deadline | schedule | final completion time vs plan of events |

## Automated acceptance gate

`secondary-vocab-pack-loader.test.ts` now requires, for all 20 pilot words:

- at least two rich examples;
- at least one transfer example;
- at least one usage pattern;
- at least one production prompt;
- at least one dedicated cloze context; and
- no exact reuse of a displayed example/frame as the cloze context.

## Human review still required

Automated checks cannot approve linguistic naturalness. Before the pilot is considered curriculum-approved:

1. A Vietnamese-English educator must confirm that each existing Vietnamese meaning matches the intended sense.
2. A Grade 7 teacher should score all items with the Phase 1 12-point rubric.
3. Any item below 10/12, or with a zero in any dimension, must be revised.
4. Student testing should check unseen-context understanding and supported production.

## Known boundary

This phase authors word-level cloze contexts. It does not yet claim that independently combining those sentences produces a coherent paragraph. Coherent passage families and compiler consumption remain separate implementation work.

