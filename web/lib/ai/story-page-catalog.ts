/** LLM-facing hints for Story-First `story` payloads (`storyPayloadSchema` with pages[]). */
export function storyPageCatalogPromptSnippet(): string {
  return `Story screens (screen_type "story") are the primary lesson delivery system:
- Use type "story" with layout_mode "book" or "slide" (default book). Prefer pages[] for new work.
- Each story beat should be playable with multiple pages; target 4-6 pages and never fewer than 3 when a beat is explicitly planned.
- Each page must have exactly one clear learner goal and one dominant narrative function.
- Narrative page flow should be: setup/discovery entry -> learner action progression -> consequence closure.
- Story is responsible for vocabulary exposure, contextual grammar modeling, character-driven progression, guided discovery, scene-based comprehension, transitions between lesson stages, emotional continuity, and final recap closure.
- Keep language pedagogically ordered: show meaning in the scene first, then model useful phrases/sentences, then let attached reinforcement check that language later.
- Prefer simple, readable pages: each page has id (stable string), optional title, background_image_url or background_color, body_text, read_aloud_text, and optional items[] (image/text/button shapes with x_percent,y_percent,w_percent,h_percent in 0-100).
- Use read_aloud_text for clear input. Set tts_lang "en-US" when using read_aloud_text.
- Optional items and tap actions should support discovery or progression (for example, tap a character to hear a line). They should not turn the story page into a quiz screen.
- When the blueprint specifies phases for a page, implement them fully: use 3-6 phases on learner_action pages; setup/discovery/recap pages may use 1-2 phases only when staging a reveal adds clear value.
- Phase ids, target_item_ids, and sequence_ids MUST match the blueprint slugs exactly (e.g. "tap_shirt" not "item_47").
- Set dialogue.start for the opening character line, dialogue.success for the correct-action response, and dialogue.error for the wrong-action response. Always include dialogue.error on phases with a learner-action trigger.
- Use pass_rule only when a story screen itself must gate progress. Prefer story_complete or visit_all_pages. Avoid drag_targets_complete unless the blueprint explicitly requires a simple in-scene action.
- Reinforcement must occur only after final page completion of a beat; never place worksheet-like checks in the middle of page progression.
- You may use legacy single-page fields (image_url, body_text) only if pages is omitted.

Final recap story requirements:
- The final story screen should return to the characters and story world.
- Recycle the main vocabulary and grammar in a natural closing moment.
- Show the story goal/problem resolved.
- Do not end the lesson with a worksheet-like or quiz-like story page.

Example simple story page (JSON shape only):
  "pages": [{
    "id": "p1",
    "body_text": "Mia is at the zoo. She sees a big elephant.",
    "read_aloud_text": "Mia is at the zoo. She sees a big elephant.",
    "items": [{ "id": "mia", "kind": "image", "image_url": "https://placehold.co/160x220", "x_percent": 10, "y_percent": 45, "w_percent": 18, "h_percent": 35 }]
  }]

Example orchestrated learner-action page — "Choose school clothes" (JSON shape only):
  "pages": [{
    "id": "choose_clothes",
    "body_text": "Ben needs his school clothes!",
    "read_aloud_text": "Ben needs his school clothes!",
    "items": [
      { "id": "ben", "kind": "image", "image_url": "https://placehold.co/160x220", "x_percent": 5, "y_percent": 30, "w_percent": 18, "h_percent": 40 },
      { "id": "school_shirt", "kind": "image", "image_url": "https://placehold.co/100x100", "x_percent": 30, "y_percent": 40, "w_percent": 14, "h_percent": 20 },
      { "id": "trousers", "kind": "image", "image_url": "https://placehold.co/100x100", "x_percent": 50, "y_percent": 40, "w_percent": 14, "h_percent": 20 }
    ],
    "phases": [
      {
        "id": "intro",
        "is_start": true,
        "dialogue": { "start": "Ben: I need my school clothes!" },
        "completion": { "type": "auto", "delay_ms": 1200, "next_phase_id": "tap_shirt" },
        "next_phase_id": "tap_shirt"
      },
      {
        "id": "tap_shirt",
        "dialogue": { "start": "Tap the shirt!", "success": "Great! My shirt!", "error": "Try again!" },
        "highlight_item_ids": ["school_shirt"],
        "completion": { "type": "on_click", "target_item_id": "school_shirt", "next_phase_id": "tap_trousers" },
        "next_phase_id": "tap_trousers"
      },
      {
        "id": "tap_trousers",
        "dialogue": { "start": "Now find the trousers!", "success": "Now my trousers!", "error": "Try again!" },
        "highlight_item_ids": ["trousers"],
        "completion": { "type": "on_click", "target_item_id": "trousers", "next_phase_id": "dressed" },
        "next_phase_id": "dressed"
      },
      {
        "id": "dressed",
        "dialogue": { "start": "Ben is ready for school!" },
        "completion": { "type": "end_phase" }
      }
    ]
  }]`;
}
