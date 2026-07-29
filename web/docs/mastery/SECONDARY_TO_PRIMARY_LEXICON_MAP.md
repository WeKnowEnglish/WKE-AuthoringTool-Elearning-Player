# Secondary → Primary lexicon map (Phase 1)

Generated: 2026-07-29T22:49:19.761Z

Stable mapping table from Secondary `wordItemId` → Primary candidate `pv_*`. Runtime mastery still keys on `wordItemId`; this file is the bridge for media, dictionary, and future dual-key mastery.

| Field | Value |
|-------|-------|
| Dataset | v1.0.0 |
| Method | `exact_lemma_pos_v1` |
| Secondary pack | `g7-a2-complete-core-vocab-v1-2` v1.2.0 |
| Mapped (exact) | **240** / 240 |
| Review (POS conflict / ambiguous) | 0 |
| Unmapped (Secondary-only) | 0 |

## How to use

```ts
import { getSecondaryLexiconId } from "@/lib/secondary/secondary-lexicon-map";
getSecondaryLexiconId("g7-a2-school-life-subject"); // "pv_subject_noun"
```

## Review queue (0)

_None._

## Unmapped — promote as new dictionary entries (0)

Showing first 40; full list in JSON.

| wordItemId | word | POS | Topic |
|------------|------|-----|-------|

## Regenerate

```bash
npm run generate:secondary-primary-lexicon-map
```

Also refreshes the audit report via the same matcher.
