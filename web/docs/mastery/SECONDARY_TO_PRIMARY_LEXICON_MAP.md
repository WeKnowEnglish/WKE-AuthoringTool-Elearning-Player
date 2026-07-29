# Secondary → Primary lexicon map (Phase 1)

Generated: 2026-07-29T22:39:35.022Z

Stable mapping table from Secondary `wordItemId` → Primary candidate `pv_*`. Runtime mastery still keys on `wordItemId`; this file is the bridge for media, dictionary, and future dual-key mastery.

| Field | Value |
|-------|-------|
| Dataset | v1.0.0 |
| Method | `exact_lemma_pos_v1` |
| Secondary pack | `g7-a2-complete-core-vocab-v1-2` v1.2.0 |
| Mapped (exact) | **164** / 240 |
| Review (POS conflict / ambiguous) | 10 |
| Unmapped (Secondary-only) | 66 |

## How to use

```ts
import { getSecondaryLexiconId } from "@/lib/secondary/secondary-lexicon-map";
getSecondaryLexiconId("g7-a2-school-life-subject"); // "pv_subject_noun"
```

## Review queue (10)

| wordItemId | word | Secondary POS | Candidates | Note |
|------------|------|---------------|------------|------|
| `g7-a2-academic-classroom-language-circle` | circle | verb | pv_circle_noun | Lemma exists in Primary as noun, not verb. |
| `g7-a2-academic-classroom-language-complete` | complete | verb | pv_complete_adjective | Lemma exists in Primary as adjective, not verb. |
| `g7-a2-academic-classroom-language-correct` | correct | verb | pv_correct_adjective | Lemma exists in Primary as adjective, not verb. |
| `g7-a2-academic-classroom-language-match` | match | verb | pv_match_noun | Lemma exists in Primary as noun, not verb. |
| `g7-a2-academic-classroom-language-underline` | underline | verb | pv_underline_noun | Lemma exists in Primary as noun, not verb. |
| `g7-a2-daily-routines-feed` | feed | verb | pv_feed_noun | Lemma exists in Primary as noun, not verb. |
| `g7-a2-daily-routines-shower` | shower | verb | pv_shower_noun | Lemma exists in Primary as noun, not verb. |
| `g7-a2-environment-plastic` | plastic | noun | pv_plastic_adjective | Lemma exists in Primary as adjective, not noun. |
| `g7-a2-school-life-principal` | principal | noun | pv_principal_adjective | Lemma exists in Primary as adjective, not noun. |
| `g7-a2-school-life-uniform` | uniform | noun | pv_uniform_adjective | Lemma exists in Primary as adjective, not noun. |

## Unmapped — promote as new dictionary entries (66)

Showing first 40; full list in JSON.

| wordItemId | word | POS | Topic |
|------------|------|-----|-------|
| `g7-a2-academic-classroom-language-detail` | detail | noun | academic-classroom-language |
| `g7-a2-academic-classroom-language-reply` | reply | noun | academic-classroom-language |
| `g7-a2-daily-routines-chore` | chore | noun | daily-routines |
| `g7-a2-daily-routines-free-time` | free time | noun phrase | daily-routines |
| `g7-a2-daily-routines-get-dressed` | get dressed | verb phrase | daily-routines |
| `g7-a2-daily-routines-hang-out` | hang out | phrasal verb | daily-routines |
| `g7-a2-daily-routines-relax` | relax | verb | daily-routines |
| `g7-a2-daily-routines-rest` | rest | verb | daily-routines |
| `g7-a2-daily-routines-sweep` | sweep | verb | daily-routines |
| `g7-a2-daily-routines-take-out` | take out | phrasal verb | daily-routines |
| `g7-a2-daily-routines-wake-up` | wake up | phrasal verb | daily-routines |
| `g7-a2-environment-ocean` | ocean | noun | environment |
| `g7-a2-environment-plant` | plant | noun | environment |
| `g7-a2-environment-protect` | protect | verb | environment |
| `g7-a2-environment-reuse` | reuse | verb | environment |
| `g7-a2-environment-trash` | trash | noun | environment |
| `g7-a2-environment-waste` | waste | noun | environment |
| `g7-a2-feelings-opinions-calm` | calm | adjective | feelings-opinions |
| `g7-a2-feelings-opinions-disagree` | disagree | verb | feelings-opinions |
| `g7-a2-feelings-opinions-opinion` | opinion | noun | feelings-opinions |
| `g7-a2-feelings-opinions-proud` | proud | adjective | feelings-opinions |
| `g7-a2-food-health-clinic` | clinic | noun | food-health |
| `g7-a2-food-health-cough` | cough | noun | food-health |
| `g7-a2-food-health-snack` | snack | noun | food-health |
| `g7-a2-food-health-stomachache` | stomachache | noun | food-health |
| `g7-a2-food-health-take-a-break` | take a break | phrase | food-health |
| `g7-a2-personality-careless` | careless | adjective | personality |
| `g7-a2-personality-friendly` | friendly | adjective | personality |
| `g7-a2-personality-honest` | honest | adjective | personality |
| `g7-a2-personality-noisy` | noisy | adjective | personality |
| `g7-a2-personality-patient` | patient | adjective | personality |
| `g7-a2-personality-selfish` | selfish | adjective | personality |
| `g7-a2-personality-serious` | serious | adjective | personality |
| `g7-a2-personality-stubborn` | stubborn | adjective | personality |
| `g7-a2-places-directions-go-straight` | go straight | phrase | places-directions |
| `g7-a2-places-directions-motorbike` | motorbike | noun | places-directions |
| `g7-a2-places-directions-museum` | museum | noun | places-directions |
| `g7-a2-places-directions-pharmacy` | pharmacy | noun | places-directions |
| `g7-a2-places-directions-turn-left` | turn left | phrase | places-directions |
| `g7-a2-places-directions-turn-right` | turn right | phrase | places-directions |

_…and 26 more._

## Regenerate

```bash
npm run generate:secondary-primary-lexicon-map
```

Also refreshes the audit report via the same matcher.
