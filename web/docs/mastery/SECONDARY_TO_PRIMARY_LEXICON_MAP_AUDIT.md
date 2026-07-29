# Secondary → Primary lexicon mapping audit

Generated: 2026-07-29T22:49:19.761Z

| Source | Value |
|--------|-------|
| Secondary pack | `g7-a2-complete-core-vocab-v1-2` v1.2.0 |
| Secondary items | 240 |
| Primary candidates (search index) | 2218 |
| Unique Primary ids in exact matches | 240 |

## Summary

| Status | Count | % |
|--------|------:|--:|
| **exact** (unique lemma+POS, or unique lemma for phrases) | 240 | 100% |
| **ambiguous_same_pos** (needs sense pick) | 0 | 0% |
| **pos_conflict** (lemma in Primary, different POS) | 0 | 0% |
| **secondary_only** (no Primary lemma hit) | 0 | 0% |

High-confidence auto-map pool ≈ **exact** (240). Review queue ≈ ambiguous + pos_conflict (0). New dictionary candidates ≈ secondary_only (0).

## By topic

| Topic | Total | Exact | Ambiguous | POS conflict | Secondary-only |
|-------|------:|------:|----------:|-------------:|---------------:|
| school-life | 20 | 20 | 0 | 0 | 0 |
| daily-routines | 20 | 20 | 0 | 0 | 0 |
| personality | 20 | 20 | 0 | 0 | 0 |
| feelings-opinions | 20 | 20 | 0 | 0 | 0 |
| food-health | 20 | 20 | 0 | 0 | 0 |
| places-directions | 20 | 20 | 0 | 0 | 0 |
| technology-online-life | 20 | 20 | 0 | 0 | 0 |
| environment | 20 | 20 | 0 | 0 | 0 |
| stories-past-events | 20 | 20 | 0 | 0 | 0 |
| future-plans-jobs | 20 | 20 | 0 | 0 | 0 |
| social-life-communication | 20 | 20 | 0 | 0 | 0 |
| academic-classroom-language | 20 | 20 | 0 | 0 | 0 |

## Secondary-only (candidates for new pv_*) (0)

_None._

## POS conflicts (manual confirm) (0)

_None._

## Ambiguous same POS / multi-hit (0)

_None._

## Exact matches (sample)

Showing first 25 of 240.

| wordItemId | word | → Primary |
|------------|------|-----------|
| `g7-a2-school-life-subject` | subject | `pv_subject_noun` |
| `g7-a2-school-life-science` | science | `pv_science_noun` |
| `g7-a2-school-life-history` | history | `pv_history_noun` |
| `g7-a2-school-life-geography` | geography | `pv_geography_noun` |
| `g7-a2-school-life-library` | library | `pv_library_noun` |
| `g7-a2-school-life-laboratory` | laboratory | `pv_laboratory_noun` |
| `g7-a2-school-life-classmate` | classmate | `pv_classmate_noun` |
| `g7-a2-school-life-principal` | principal | `pv_principal_noun` |
| `g7-a2-school-life-timetable` | timetable | `pv_timetable_noun` |
| `g7-a2-school-life-uniform` | uniform | `pv_uniform_noun` |
| `g7-a2-school-life-assignment` | assignment | `pv_assignment_noun` |
| `g7-a2-school-life-project` | project | `pv_project_noun` |
| `g7-a2-school-life-test` | test | `pv_test_noun` |
| `g7-a2-school-life-exam` | exam | `pv_exam_noun` |
| `g7-a2-school-life-score` | score | `pv_score_noun` |
| `g7-a2-school-life-mistake` | mistake | `pv_mistake_noun` |
| `g7-a2-school-life-revise` | revise | `pv_revise_verb` |
| `g7-a2-school-life-submit` | submit | `pv_submit_verb` |
| `g7-a2-school-life-lesson` | lesson | `pv_lesson_noun` |
| `g7-a2-school-life-deadline` | deadline | `pv_deadline_noun` |
| `g7-a2-daily-routines-wake-up` | wake up | `pv_wake_up_verb` |
| `g7-a2-daily-routines-get-dressed` | get dressed | `pv_get_dressed_verb` |
| `g7-a2-daily-routines-brush` | brush | `pv_brush_verb` |
| `g7-a2-daily-routines-pack` | pack | `pv_pack_verb` |
| `g7-a2-daily-routines-leave` | leave | `pv_leave_verb` |

## How to re-run

```bash
npm run generate:secondary-primary-lexicon-map
# or audit-only:
npm run audit:secondary-primary-lexicon
```
