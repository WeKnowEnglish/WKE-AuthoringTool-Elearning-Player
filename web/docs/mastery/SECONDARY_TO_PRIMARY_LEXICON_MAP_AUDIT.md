# Secondary → Primary lexicon mapping audit

Generated: 2026-07-29T22:39:35.022Z

| Source | Value |
|--------|-------|
| Secondary pack | `g7-a2-complete-core-vocab-v1-2` v1.2.0 |
| Secondary items | 240 |
| Primary candidates (search index) | 2142 |
| Unique Primary ids in exact matches | 164 |

## Summary

| Status | Count | % |
|--------|------:|--:|
| **exact** (unique lemma+POS, or unique lemma for phrases) | 164 | 68.3% |
| **ambiguous_same_pos** (needs sense pick) | 0 | 0% |
| **pos_conflict** (lemma in Primary, different POS) | 10 | 4.2% |
| **secondary_only** (no Primary lemma hit) | 66 | 27.5% |

High-confidence auto-map pool ≈ **exact** (164). Review queue ≈ ambiguous + pos_conflict (10). New dictionary candidates ≈ secondary_only (66).

## By topic

| Topic | Total | Exact | Ambiguous | POS conflict | Secondary-only |
|-------|------:|------:|----------:|-------------:|---------------:|
| school-life | 20 | 8 | 0 | 2 | 10 |
| daily-routines | 20 | 9 | 0 | 2 | 9 |
| personality | 20 | 12 | 0 | 0 | 8 |
| feelings-opinions | 20 | 16 | 0 | 0 | 4 |
| food-health | 20 | 15 | 0 | 0 | 5 |
| places-directions | 20 | 14 | 0 | 0 | 6 |
| technology-online-life | 20 | 13 | 0 | 0 | 7 |
| environment | 20 | 13 | 0 | 1 | 6 |
| stories-past-events | 20 | 17 | 0 | 0 | 3 |
| future-plans-jobs | 20 | 20 | 0 | 0 | 0 |
| social-life-communication | 20 | 14 | 0 | 0 | 6 |
| academic-classroom-language | 20 | 13 | 0 | 5 | 2 |

## Secondary-only (candidates for new pv_*) (66)

| wordItemId | word | POS | Primary |
|------------|------|-----|---------|
| `g7-a2-school-life-geography` | geography | noun | — |
| `g7-a2-school-life-laboratory` | laboratory | noun | — |
| `g7-a2-school-life-timetable` | timetable | noun | — |
| `g7-a2-school-life-assignment` | assignment | noun | — |
| `g7-a2-school-life-project` | project | noun | — |
| `g7-a2-school-life-exam` | exam | noun | — |
| `g7-a2-school-life-mistake` | mistake | noun | — |
| `g7-a2-school-life-revise` | revise | verb | — |
| `g7-a2-school-life-submit` | submit | verb | — |
| `g7-a2-school-life-deadline` | deadline | noun | — |
| `g7-a2-daily-routines-wake-up` | wake up | phrasal verb | — |
| `g7-a2-daily-routines-get-dressed` | get dressed | verb phrase | — |
| `g7-a2-daily-routines-relax` | relax | verb | — |
| `g7-a2-daily-routines-chore` | chore | noun | — |
| `g7-a2-daily-routines-sweep` | sweep | verb | — |
| `g7-a2-daily-routines-take-out` | take out | phrasal verb | — |
| `g7-a2-daily-routines-hang-out` | hang out | phrasal verb | — |
| `g7-a2-daily-routines-rest` | rest | verb | — |
| `g7-a2-daily-routines-free-time` | free time | noun phrase | — |
| `g7-a2-personality-friendly` | friendly | adjective | — |
| `g7-a2-personality-honest` | honest | adjective | — |
| `g7-a2-personality-patient` | patient | adjective | — |
| `g7-a2-personality-careless` | careless | adjective | — |
| `g7-a2-personality-noisy` | noisy | adjective | — |
| `g7-a2-personality-selfish` | selfish | adjective | — |
| `g7-a2-personality-serious` | serious | adjective | — |
| `g7-a2-personality-stubborn` | stubborn | adjective | — |
| `g7-a2-feelings-opinions-proud` | proud | adjective | — |
| `g7-a2-feelings-opinions-calm` | calm | adjective | — |
| `g7-a2-feelings-opinions-opinion` | opinion | noun | — |
| `g7-a2-feelings-opinions-disagree` | disagree | verb | — |
| `g7-a2-food-health-snack` | snack | noun | — |
| `g7-a2-food-health-stomachache` | stomachache | noun | — |
| `g7-a2-food-health-cough` | cough | noun | — |
| `g7-a2-food-health-take-a-break` | take a break | phrase | — |
| `g7-a2-food-health-clinic` | clinic | noun | — |
| `g7-a2-places-directions-museum` | museum | noun | — |
| `g7-a2-places-directions-pharmacy` | pharmacy | noun | — |
| `g7-a2-places-directions-turn-left` | turn left | phrase | — |
| `g7-a2-places-directions-turn-right` | turn right | phrase | — |

_…and 26 more (see JSON)._

## POS conflicts (manual confirm) (10)

| wordItemId | word | POS | Primary |
|------------|------|-----|---------|
| `g7-a2-school-life-principal` | principal | noun | pv_principal_adjective (adjective) |
| `g7-a2-school-life-uniform` | uniform | noun | pv_uniform_adjective (adjective) |
| `g7-a2-daily-routines-shower` | shower | verb | pv_shower_noun (noun) |
| `g7-a2-daily-routines-feed` | feed | verb | pv_feed_noun (noun) |
| `g7-a2-environment-plastic` | plastic | noun | pv_plastic_adjective (adjective) |
| `g7-a2-academic-classroom-language-match` | match | verb | pv_match_noun (noun) |
| `g7-a2-academic-classroom-language-complete` | complete | verb | pv_complete_adjective (adjective) |
| `g7-a2-academic-classroom-language-circle` | circle | verb | pv_circle_noun (noun) |
| `g7-a2-academic-classroom-language-underline` | underline | verb | pv_underline_noun (noun) |
| `g7-a2-academic-classroom-language-correct` | correct | verb | pv_correct_adjective (adjective) |

## Ambiguous same POS / multi-hit (0)

_None._

## Exact matches (sample)

Showing first 25 of 164.

| wordItemId | word | → Primary |
|------------|------|-----------|
| `g7-a2-school-life-subject` | subject | `pv_subject_noun` |
| `g7-a2-school-life-science` | science | `pv_science_noun` |
| `g7-a2-school-life-history` | history | `pv_history_noun` |
| `g7-a2-school-life-library` | library | `pv_library_noun` |
| `g7-a2-school-life-classmate` | classmate | `pv_classmate_noun` |
| `g7-a2-school-life-test` | test | `pv_test_noun` |
| `g7-a2-school-life-score` | score | `pv_score_noun` |
| `g7-a2-school-life-lesson` | lesson | `pv_lesson_noun` |
| `g7-a2-daily-routines-brush` | brush | `pv_brush_verb` |
| `g7-a2-daily-routines-pack` | pack | `pv_pack_verb` |
| `g7-a2-daily-routines-leave` | leave | `pv_leave_verb` |
| `g7-a2-daily-routines-arrive` | arrive | `pv_arrive_verb` |
| `g7-a2-daily-routines-sleep` | sleep | `pv_sleep_verb` |
| `g7-a2-daily-routines-prepare` | prepare | `pv_prepare_verb` |
| `g7-a2-daily-routines-tidy` | tidy | `pv_tidy_verb` |
| `g7-a2-daily-routines-wash` | wash | `pv_wash_verb` |
| `g7-a2-daily-routines-hobby` | hobby | `pv_hobby_noun` |
| `g7-a2-personality-kind` | kind | `pv_kind_adjective` |
| `g7-a2-personality-helpful` | helpful | `pv_helpful_adjective` |
| `g7-a2-personality-polite` | polite | `pv_polite_adjective` |
| `g7-a2-personality-careful` | careful | `pv_careful_adjective` |
| `g7-a2-personality-creative` | creative | `pv_creative_adjective` |
| `g7-a2-personality-confident` | confident | `pv_confident_adjective` |
| `g7-a2-personality-brave` | brave | `pv_brave_adjective` |
| `g7-a2-personality-shy` | shy | `pv_shy_adjective` |

## How to re-run

```bash
npm run generate:secondary-primary-lexicon-map
# or audit-only:
npm run audit:secondary-primary-lexicon
```
