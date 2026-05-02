# Legacy interactive presentation QA (now interactive page / slide deck)

The `presentation_interactive` subtype is removed from the player and editor. Legacy rows are still read as **`story`** payloads with **`layout_mode: "slide"`** via `parseScreenPayload` → `migratePresentationInteractiveFromParsed` in `lib/lesson-schemas.ts`.

## Authoring (Teacher Editor)
- Use **+ Interactive page**, then choose **Slide deck** layout in screen details (dots between pages).
- Use the pan/zoom scene for items; use **action sequences** on items for `info_popup`, `goto_page`, `show_item`, `hide_item`, `toggle_item`.
- For deck-style drag, set **`draggable_mode`** and **`drop_target_id`** on items (JSON / future UI); `pass_rule` on the story payload: `visit_all_pages`, `drag_targets_complete`, or `story_complete`.

## Runtime (Student / Preview)
- Verify slide renders background + elements in z-order.
- Verify click action: `info_popup` opens and closes correctly.
- Verify click action: `navigate_slide` for `next`, `prev`, and specific slide.
- Verify click actions: `show_element`, `hide_element`, `toggle_element`.
- Verify `free` drag updates element position during interaction.
- Verify `check_target` drag marks success when dropped on target and wrong feedback when missed.
- Verify `pass_rule: drag_targets_complete` unlocks Next only after all checked drags are completed.
- Verify story `pass_rule: visit_all_pages` unlocks lesson Next only after every page has been visited.

## Regression Checks
- Existing interaction subtypes still render in editor and preview.
- Story screens (book and slide layout) still load editor and preview correctly.
- Migrated legacy presentation rows play as slide-deck stories; outline/thumbnail use story rules once parsed.
