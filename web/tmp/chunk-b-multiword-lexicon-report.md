# Chunk B — multi-word / phrase media (dry-run)

_Generated 2026-07-29T17:40:15.085Z. No links written._

**Candidates:** 50 non-scene images with multi-word `meta_item_name`.

## Confidence summary

| Confidence | Count | Meaning |
|---|---:|---|
| exact_phrase | 2 | Full phrase / compound exists as lemma |
| alt_name_match | 1 | Matched meta alternative name |
| head_noun_only | 16 | Only last content word matches — usually safe |
| ambiguous_both_words | 7 | Both words exist — pick head vs phrase sense |
| ambiguous_multi_token | 2 | Head + other tokens match — review |
| modifier_only_weak | 5 | Only a non-head word matches — weak |
| ambiguous_no_head | 1 | Head missing; multiple other hits — skip auto |
| skip_noise_label | 13 | Label looks like asset meta (featured/crop/…) |
| none | 3 | No dictionary match — consider new lemma |

## Review table

| Item name | Confidence | Suggested link | Alternatives | Hint | Notes |
|---|---|---|---|---|---|
| Ice cream | exact_phrase | `ice cream` / `pv_ice_cream_noun` | — | safe_to_link_after_spotcheck | Matched full phrase "ice cream" as a dictionary lemma. |
| Rain coat | exact_phrase | `raincoat` / `pv_raincoat_noun` | — | safe_to_link_after_spotcheck | Matched compound "raincoat" (spaces removed) as dictionary lemma. |
| Sea Turtle | alt_name_match | `turtle` / `pv_turtle_noun` | — | review_alt_vs_phrase | Matched alternative name "turtle" → turtle. Confirm the image is really that word. |
| Arctic Fox | head_noun_only | `fox` / `pv_fox_noun` | — | safe_to_link_after_spotcheck | Only head noun "fox" found — suggested illustration link. |
| Cheese 2 | head_noun_only | `cheese` / `pv_cheese_noun` | — | safe_to_link_after_spotcheck | Only head noun "cheese" found — suggested illustration link. |
| Featured image weather | head_noun_only | `weather` / `pv_weather_noun` | — | review_noise_label | Noise tokens in label: featured, image — likely asset meta, not a vocab phrase. Only head noun "weather" found — suggested illustration link. |
| Featured image weather | head_noun_only | `weather` / `pv_weather_noun` | — | review_noise_label | Noise tokens in label: featured, image — likely asset meta, not a vocab phrase. Only head noun "weather" found — suggested illustration link. |
| Folded shirts | head_noun_only | `shirt` / `pv_shirt_noun` | — | safe_to_link_after_spotcheck | Only head noun "shirts" found — suggested illustration link. |
| Pizza 2 | head_noun_only | `pizza` / `pv_pizza_noun` | — | safe_to_link_after_spotcheck | Only head noun "pizza" found — suggested illustration link. |
| Polar Bear | head_noun_only | `bear` / `pv_bear_noun` | — | safe_to_link_after_spotcheck | Only head noun "bear" found — suggested illustration link. |
| Rice 2 | head_noun_only | `rice` / `pv_rice_noun` | — | safe_to_link_after_spotcheck | Only head noun "rice" found — suggested illustration link. |
| Ruined backpack | head_noun_only | `backpack` / `pv_backpack_noun` | — | review_noise_label | Noise tokens in label: ruined — likely asset meta, not a vocab phrase. Only head noun "backpack" found — suggested illustration link. |
| Scared Boy | head_noun_only | `boy` / `pv_boy_noun` | — | safe_to_link_after_spotcheck | Only head noun "boy" found — suggested illustration link. |
| Scared man | head_noun_only | `man` / `pv_man_noun` | — | safe_to_link_after_spotcheck | Only head noun "man" found — suggested illustration link. |
| Stacking ring | head_noun_only | `ring` / `pv_ring_noun` | — | safe_to_link_after_spotcheck | Only head noun "ring" found — suggested illustration link. |
| Stuffed animals | head_noun_only | `animal` / `pv_animal_noun` | — | safe_to_link_after_spotcheck | Only head noun "animals" found — suggested illustration link. |
| Tank top | head_noun_only | `top` / `pv_top_noun` | — | safe_to_link_after_spotcheck | Only head noun "top" found — suggested illustration link. |
| Teddy bear | head_noun_only | `bear` / `pv_bear_noun` | — | safe_to_link_after_spotcheck | Only head noun "bear" found — suggested illustration link. |
| Tropical storm | head_noun_only | `storm` / `pv_storm_noun` | — | safe_to_link_after_spotcheck | Only head noun "storm" found — suggested illustration link. |
| Bag of chips | ambiguous_both_words | `chip` / `pv_chip_noun` | `bag` | choose_head_or_add_phrase | Both words exist: "bag" + "chip". Prefer head noun unless you want a new phrase lemma. |
| Baseball gloves | ambiguous_both_words | `glove` / `pv_glove_noun` | `baseball` | choose_head_or_add_phrase | Both words exist: "baseball" + "glove". Prefer head noun unless you want a new phrase lemma. |
| Black Bear | ambiguous_both_words | `bear` / `pv_bear_noun` | `black` | choose_head_or_add_phrase | Both words exist: "black" + "bear". Prefer head noun unless you want a new phrase lemma. |
| Fishing page | ambiguous_both_words | `page` / `pv_page_noun` | `fishing` | choose_head_or_add_phrase | Noise tokens in label: page — likely asset meta, not a vocab phrase. Both words exist: "fishing" + "page". Prefer head noun unless you want a new phrase lemma. |
| Rain boots | ambiguous_both_words | `boot` / `pv_boot_noun` | `rain` | choose_head_or_add_phrase | Both words exist: "rain" + "boot". Prefer head noun unless you want a new phrase lemma. |
| Red Panda | ambiguous_both_words | `panda` / `pv_panda_noun` | `red` | choose_head_or_add_phrase | Both words exist: "red" + "panda". Prefer head noun unless you want a new phrase lemma. |
| Roller skate | ambiguous_both_words | `skate` / `pv_skate_noun` | `roller` | choose_head_or_add_phrase | Both words exist: "roller" + "skate". Prefer head noun unless you want a new phrase lemma. |
| Big Brown Bear Cover | ambiguous_multi_token | `cover` / `pv_cover_noun` | `big`, `brown`, `bear` | manual_review | Noise tokens in label: cover — likely asset meta, not a vocab phrase. Head noun "cover" suggested; also matched: big, brown, bear, cover. |
| Image hot spot | ambiguous_multi_token | `spot` / `pv_spot_noun` | `hot` | manual_review | Noise tokens in label: image — likely asset meta, not a vocab phrase. Head noun "spot" suggested; also matched: hot, spot. |
| Action figure | modifier_only_weak | `action` / `pv_action_noun` | — | prefer_add_head_lemma_or_skip | Head noun "figure" missing; only "action" found (weak). |
| Chocolate bar | modifier_only_weak | `chocolate` / `pv_chocolate_noun` | — | prefer_add_head_lemma_or_skip | Head noun "bar" missing; only "chocolate" found (weak). |
| Computer programmer | modifier_only_weak | `computer` / `pv_computer_noun` | — | prefer_add_head_lemma_or_skip | Head noun "programmer" missing; only "computer" found (weak). |
| Student 1crop | modifier_only_weak | `student` / `pv_student_noun` | — | prefer_add_head_lemma_or_skip | Head noun "1crop" missing; only "student" found (weak). |
| Swim trunks | modifier_only_weak | `swim` / `pv_swim_noun` | — | prefer_add_head_lemma_or_skip | Head noun "trunks" missing; only "swim" found (weak). |
| What do you like eating | ambiguous_no_head | — | `what`, `do`, `you`, `like` | manual_or_skip | Head noun missing; multiple other hits — do not auto-link. |
| Aj with mic | skip_noise_label | — | — | skip | Noise tokens in label: aj, mic — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Aj with mic crop | skip_noise_label | — | — | skip | Noise tokens in label: aj, mic, crop — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Featured image body parts | skip_noise_label | `body` / `pv_body_noun` | — | skip | Noise tokens in label: featured, image — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Featured image body parts | skip_noise_label | `body` / `pv_body_noun` | — | skip | Noise tokens in label: featured, image — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Featured image body parts | skip_noise_label | `body` / `pv_body_noun` | — | skip | Noise tokens in label: featured, image — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| My classroom hotspot | skip_noise_label | `my` / `pv_my_determiner` | `classroom` | skip | Noise tokens in label: hotspot — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| spilled cooler | skip_noise_label | — | — | skip | Noise tokens in label: spilled — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Spilled Cooler | skip_noise_label | — | — | skip | Noise tokens in label: spilled — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Student 2 crop | skip_noise_label | `student` / `pv_student_noun` | — | skip | Noise tokens in label: crop — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Student 3 crop | skip_noise_label | `student` / `pv_student_noun` | — | skip | Noise tokens in label: crop — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Toys games banner | skip_noise_label | `toy` / `pv_toy_noun` | `game` | skip | Noise tokens in label: banner — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Walking with backpack transparent | skip_noise_label | `backpack` / `pv_backpack_noun` | — | skip | Noise tokens in label: walking, transparent — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Waving transparent | skip_noise_label | — | — | skip | Noise tokens in label: waving, transparent — likely asset meta, not a vocab phrase. Treat as non-vocab asset; do not auto-link. |
| Flip flops | none | — | — | consider_new_phrase_or_head_lemma | No dictionary lemmas for tokens: flip, flops |
| French fries | none | — | — | consider_new_phrase_or_head_lemma | No dictionary lemmas for tokens: french, fries |
| Komodo Dragon | none | — | — | consider_new_phrase_or_head_lemma | No dictionary lemmas for tokens: komodo, dragon |

## Suggested apply policy (for later)

- Auto-link only `exact_phrase` and (optionally) `head_noun_only` after spot-check.
- Manually decide `ambiguous_*` and `modifier_only_weak`.
- Add phrase lemmas (e.g. `ice cream`) for `none` / phrase-sense cases before linking.
