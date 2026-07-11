# Proposal: Secondary Word Helper Rich Language

**Phase:** Language enrichment Phase 4  
**Status:** Implemented for enriched items with legacy fallback  
**Content pilot:** School Life (20 words)

## Student outcome

The Word Helper now moves beyond a definition and one memorized sentence. For enriched words, students see:

1. two purpose-labelled examples;
2. a useful collocation or grammatical pattern;
3. a concise usage note or word contrast when relevant;
4. a supported personal “Your turn” prompt; and
5. an optional model response.

The in-helper cloze question uses a dedicated unseen context. It no longer tests the displayed legacy sentence frame when rich cloze content is available.

## Compatibility

- Enriched items use `examples`, `usagePatterns`, `confusions`, `usageNote`, `productionPrompts`, and `clozeContexts`.
- Non-enriched items retain the existing example sentence, chunk list, frame preview, and quiz behaviour.
- The daily cloze activity is unchanged. Its coherent-passage redesign remains a separate phase.
- Mastery recording, activity completion, navigation, and storage keys are unchanged.

## Presentation choices

- Examples are labelled `Example`, `Another context`, `In conversation`, or `Compare`.
- Patterns show both the reusable construction and a complete model sentence.
- Contrast notes use a warm notice panel rather than error language.
- The model response is collapsed by default so students consider their own response first.
- The controlled cloze preview remains visible as a scaffold, but the assessed cloze uses an unseen context.

## Verification

- Rich-example selection and labels are unit tested.
- Legacy example/chunk fallback remains unit tested.
- School Life quiz tests require the dedicated unseen cloze context.
- TypeScript and the secondary learn test suite must pass.

