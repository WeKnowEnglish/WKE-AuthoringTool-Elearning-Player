# Proposal: Secondary Vocabulary Language Schema v2

**Phase:** Language enrichment Phase 2  
**Status:** Implemented as a backward-compatible schema extension  
**Standard:** [SECONDARY_VOCABULARY_LANGUAGE_QUALITY_STANDARD.md](./SECONDARY_VOCABULARY_LANGUAGE_QUALITY_STANDARD.md)

## Purpose

Add structured language fields that can support richer Word Helper examples, varied quizzes, coherent cloze authoring, and productive student use without breaking the existing 240-word pack.

## Added item fields

| Field | Type | Purpose |
| --- | --- | --- |
| `examples` | `SecondaryVocabExample[]` | Multiple examples with explicit instructional purposes |
| `usagePatterns` | `SecondaryUsagePattern[]` | Collocations and grammatical patterns with models |
| `productionPrompts` | `SecondaryProductionPrompt[]` | Supported speaking/writing prompts and model answers |
| `clozeContexts` | `SecondaryClozeContext[]` | Dedicated unseen retrieval contexts |
| `confusions` | `SecondaryWordConfusion[]` | Contrastive support for commonly confused words |
| `usageNote` | `string` | One concise high-value usage warning |

All fields are optional during migration. Existing fields remain authoritative until an item has been curated and the Phase 3 consumers are explicitly switched to rich content.

## Example item fragment

```json
{
  "examples": [
    {
      "id": "subject-intro-1",
      "text": "Science is my favorite subject because we do experiments.",
      "purpose": "introductory",
      "context": "school preference",
      "difficulty": 2
    },
    {
      "id": "subject-transfer-1",
      "text": "We have a different subject after lunch.",
      "purpose": "transfer",
      "context": "school timetable",
      "difficulty": 2
    }
  ],
  "usagePatterns": [
    {
      "id": "subject-pattern-1",
      "pattern": "favorite subject",
      "example": "Art is my favorite subject."
    }
  ],
  "productionPrompts": [
    {
      "id": "subject-prompt-1",
      "prompt": "Which subject would you like to improve? Why?",
      "sentenceStarter": "I would like to improve ___ because ___.",
      "modelAnswer": "I would like to improve science because I enjoy experiments."
    }
  ],
  "clozeContexts": [
    {
      "id": "subject-cloze-1",
      "text": "Art is the ____ I enjoy most this year.",
      "acceptableAnswers": ["subject"],
      "difficulty": 2,
      "clueType": "meaning"
    }
  ]
}
```

## Compatibility rules

1. Rich fields are additive and optional in pack v1.2.
2. The loader trims authoring whitespace and clamps rich-context difficulty to 1–5.
3. The runtime continues using `exampleSentence` and `sentenceFrame` until Phase 3 content is curated.
4. No rich field writes mastery data or introduces a second vocabulary source of truth.
5. Rich entry IDs must be stable and unique within a word item so replays and analytics can reference a specific context.

## Validation added

The pack validator now reports:

- empty or duplicate rich-entry IDs;
- empty rich examples;
- incomplete usage patterns;
- incomplete production prompts; and
- cloze contexts without `____` or an accepted answer.

These checks validate structural safety. The pedagogical and linguistic checks in the Phase 1 standard remain a human-review requirement until dedicated quality tooling is added.

## Phase 2 definition of done

- [x] Runtime types added
- [x] Raw JSON loader accepts all rich fields
- [x] Normalization trims content and accepted answers
- [x] Validation rejects structurally unsafe rich content
- [x] Existing 240-word pack remains valid without migration
- [x] Unit tests cover rich normalization and validation
- [ ] School Life pilot content authored (Phase 3)
- [ ] Word Helper and quiz consume rich fields (after pilot content)
- [ ] Cloze compiler consumes dedicated contexts (after coherent passage design)

