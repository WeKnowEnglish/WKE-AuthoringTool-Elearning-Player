# Daily Bakery Quest — Golden Reference

Last updated: 2026-07-04

This folder is the **canonical gold standard** for new daily ESL lessons in the Lesson Player. Use it for Cursor skills, AI generation prompts, and teacher QA — not `my-toys-*` imports.

## What this lesson teaches

- **Story problem:** Mai's bakery lost its recipe cards.
- **Target words:** bread, milk, eggs, jam (A1 breakfast food).
- **Grammar:** `I need ___`, `We use ___`.
- **Daily loop:** STORY → PRESENTATION → EXPLORER → REFLECTION → COMPLETE.

## Files

| File | Role |
|------|------|
| `lesson_plan.json` | Story-First blueprint, screen outline, learning loop config |
| `screens.json` | Player-ready `DraftScreenRow[]` (canonical runtime bundle) |
| `explore-scene.json` | Authoring mirror of `lib/explore/scenes/bakery-recipe-rescue.ts` |
| `validation-checklist.md` | Human QA gates before marking gold |
| `teacher_review.md` | Derived teacher notes (not canonical) |

## Validation

```bash
npm run test -- lib/golden-references/daily-bakery-quest/daily-bakery-quest.test.ts
```

## Pilot route

`/pilots/daily-bakery-quest` — thin `LearningLoopRouter` wiring for architecture testing.

## Image policy

- **Food vocabulary:** Supabase URLs from `lib/vocabulary-templates/sets/food-media.ts`
- **Bakery interior / Mai character:** placeholders until AI art is uploaded to `lesson_media`

## Skill rule

> All new daily lessons must match this structure: learning loop phases, strand evidence, screen outline order, Story-First interaction subtypes only (`mc_quiz`, `true_false`, `fill_blanks`, `fix_text`, `letter_mixup`), `vocab_word_id` on presentation screens.
