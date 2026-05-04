# Unified story reactions (`story-unified`)

Table-first intermediate representation (IR) for story runtime: **trigger → optional guards → `reaction_body` tree** (outputs + `parallel` / `serial` / `tap_chain`).

## Storage (Stage 5 decision)

| Option | Description |
|--------|-------------|
| **A (current)** | **Canonical = existing `StoryPayload` JSON** in the DB. IR is produced at runtime by `buildUnifiedReactionsFromStoryPage` (read-only compiler). No migration required for existing lessons. |
| **B (future)** | Persist `UnifiedReactionRow[]` (or equivalent) as the source of truth; editor and exports read/write IR directly. Requires migration and editor work. |

This repo implements **A** until the teacher UI is rebuilt around a single reactions table.

## Runtime flag

- `NEXT_PUBLIC_STORY_UNIFIED_DISPATCH` — when truthy and the compiler has **no parse errors**, `StoryBookView` uses unified rows for **page autoplay enter**, **phase enter**, and **phase auto timer**; taps, pools, and drag-match still use legacy paths until parity work continues.

## Deprecation (legacy fields)

Legacy authoring surfaces (`timeline`, item `on_click.triggers`, phase `on_enter`, etc.) remain valid; the **normalizer** maps them into IR. Over time:

1. Prefer **`action_sequences`** on page / phase / item for new work.
2. Run **`npm run story:unified-dry-run`** on lesson JSON exports to catch IR compile/validation issues before publish.
3. Authoring matrix + single editor table (plan Stage 5 UI) will eventually replace scattered panels.

## Stripped enums (v1 spec)

Canonical **triggers** and **output leaves** are defined in Zod in `schema.ts` (`storyUnifiedTriggerSchema`, `storyUnifiedOutputLeafSchema`, `storyUnifiedReactionBodyNodeSchema`). **Visibility precedence:** phase baseline on `phase_enter`; `visibility` outputs are deltas until the next `phase_enter` (see plan). **`info_popup`:** only when anchored on `button` or `info_balloon` items (`validate-reaction-row.ts` + editor gates).

## Related

- Plan: `.cursor/plans/unified_story_reactions_ad5ecb25.plan.md` (local Cursor plan).
- Compiler: `build-unified-reactions.ts` · Validator: `validate-reaction-row.ts` · Body → steps: `reaction-body-runtime.ts`

## Dry run (CI / local)

```bash
npm run story:unified-dry-run
```

Runs Vitest on the unified IR smoke + builder tests (`story-import-smoke.test.ts`, `build-unified-reactions.test.ts`).
