# Daily Bakery Quest — Validation Checklist

Mark gold only when every item passes.

## Schema

- [ ] `lesson_plan.json` → `storyFirstBlueprintSchema` passes
- [ ] Every row in `screens.json` passes `parseScreenPayload`
- [ ] `npm run test -- lib/golden-references/daily-bakery-quest/daily-bakery-quest.test.ts` passes

## Learning design

- [ ] Story introduces problem before presentation quizzes
- [ ] All four target words appear in STORY before PRESENTATION
- [ ] PRESENTATION uses only Story-First subtypes
- [ ] EXPLORER scene has ≥2 cloze sentences and 4 word pickups
- [ ] REFLECTION has self-check + retrieval (screens 8–9)

## Learning loop

- [ ] `learningLoop.phases` = STORY, PRESENTATION, EXPLORER, REFLECTION
- [ ] `phaseContentMap` maps each phase to screens or `bakery_recipe_rescue`
- [ ] `petCareReward` defined on loop config

## Images

- [ ] Food images use Supabase `lesson_media` URLs
- [ ] Bakery background + Mai placeholders documented for replacement

## Play-through

- [ ] `/pilots/daily-bakery-quest` completes all phases without errors
- [ ] Loop events emit: phase_started, phase_completed, loop_completed
