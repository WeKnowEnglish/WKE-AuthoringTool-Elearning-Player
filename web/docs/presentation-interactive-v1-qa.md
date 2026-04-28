# Interactive Presentation V1 QA Checklist

## Authoring (Teacher Editor)
- Create a new `Interactive presentation` screen from the Add activity panel.
- Add at least 2 slides and switch between them.
- Set slide background image and confirm canvas loads.
- Add each element kind: `text`, `image`, `button`, `shape`, `line`.
- Move and resize elements on canvas, then confirm coordinates persist after switching slides.
- Edit selected element metadata: label, text, image URL, color, visibility.
- Configure drag modes: `none`, `free`, `check_target`.
- For `check_target`, set drop target and ensure save does not fail.
- Add multiple actions to one element and edit/remove actions.

## Runtime (Student / Preview)
- Verify slide renders background + elements in z-order.
- Verify click action: `info_popup` opens and closes correctly.
- Verify click action: `navigate_slide` for `next`, `prev`, and specific slide.
- Verify click actions: `show_element`, `hide_element`, `toggle_element`.
- Verify `free` drag updates element position during interaction.
- Verify `check_target` drag marks success when dropped on target and wrong feedback when missed.
- Verify `pass_rule: drag_targets_complete` unlocks Next only after all checked drags are completed.
- Verify `pass_rule: visit_all_slides` unlocks Next only after every slide has been visited.

## Regression Checks
- Existing interaction subtypes still render in editor and preview.
- Story screens still load editor and preview correctly.
- Screen outline row label and thumbnail render for the new subtype.
