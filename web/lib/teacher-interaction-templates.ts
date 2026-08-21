/**
 * Default payloads for new interaction screens (teacher editor + quiz builder).
 * Kept separate from server actions for easier testing and reuse.
 */

/** Raw object before `interactionPayloadSchema.parse`. */
export function rawInteractionTemplateForSubtype(subtype: string): Record<string, unknown> {
  switch (subtype) {
    case "mc_quiz":
      return {
        type: "interaction",
        subtype: "mc_quiz",
        question: "Question?",
        image_fit: "contain",
        options: [
          { id: "a", label: "Answer A" },
          { id: "b", label: "Answer B" },
        ],
        correct_option_id: "a",
        shuffle_options: false,
      };
    case "click_targets":
      return {
        type: "interaction",
        subtype: "click_targets",
        image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Scene",
        body_text: "Tap the correct place.",
        targets: [
          {
            id: "t1",
            x_percent: 20,
            y_percent: 30,
            w_percent: 25,
            h_percent: 20,
            label: "Here",
          },
        ],
        correct_target_id: "t1",
      };
    case "drag_sentence":
      return {
        type: "interaction",
        subtype: "drag_sentence",
        body_text: "Put the words in order.",
        sentence_slots: ["", ""],
        word_bank: ["Hello", "world"],
        correct_order: ["Hello", "world"],
      };
    case "true_false":
      return {
        type: "interaction",
        subtype: "true_false",
        statement: "The sun is hot.",
        correct: true,
      };
    case "short_answer":
      return {
        type: "interaction",
        subtype: "short_answer",
        prompt: "What do you say when you meet someone?",
        acceptable_answers: ["Hello", "Hi"],
      };
    case "fill_blanks":
      return {
        type: "interaction",
        subtype: "fill_blanks",
        template: "Hello __1__ welcome to __2__.",
        blanks: [
          { id: "1", acceptable: ["and", "And"] },
          { id: "2", acceptable: ["school", "School"] },
        ],
      };
    case "fix_text":
      return {
        type: "interaction",
        subtype: "fix_text",
        broken_text: "Helo, I am go to school.",
        acceptable: ["Hello, I am going to school.", "Hello, I am going to school"],
        image_fit: "contain",
        hints_enabled: true,
        hint_decoy_words: ["went", "gone", "goes"],
      };
    case "explore_hotspots":
      return {
        type: "interaction",
        subtype: "explore_hotspots",
        activity_name: "What do you like doing?",
        image_url: "https://placehold.co/800x450/dcfce7/14532d?text=Explore",
        body_text: "Tap each person. Listen to what they like doing.",
        hotspots: [
          {
            id: "h1",
            name: "Mia",
            accessible_label: "Mia",
            required: true,
            points: [
              { x: 0.1, y: 0.2 },
              { x: 0.3, y: 0.2 },
              { x: 0.3, y: 0.7 },
              { x: 0.1, y: 0.7 },
            ],
          },
        ],
        dialogues: [
          {
            id: "d1",
            hotspot_id: "h1",
            title: "Mia likes drawing",
            turns: [
              { speaker: "AJ", text: "What do you like doing?" },
              { speaker: "Mia", text: "I like drawing pictures." },
            ],
          },
        ],
        auto_play_on_select: true,
      };
    case "language_in_focus":
      return {
        type: "interaction",
        subtype: "language_in_focus",
        activity_name: "How do we talk about hobbies?",
        scene: {
          image_url: "/pilots/language-in-focus/hobbies-like-ing-banner-v2.png",
          image_alt: "Mia drawing and Leo reading a space book at a sunny table",
          image_fit: "cover",
          aspect_ratio: "3:1",
        },
        tabs: [
          { id: "mia", label: "Mia" },
          { id: "leo", label: "Leo" },
        ],
        chunks: [
          { id: "c-person", role: "person", label: "Person", color: "#0d9488" },
          { id: "c-feeling", role: "feeling", label: "Feeling", color: "#ca8a04" },
          { id: "c-activity", role: "activity", label: "Activity", color: "#2563eb" },
        ],
        sentence_template: "{person} {feeling} {activity}.",
        slot_banks: [
          {
            role: "person",
            options: [
              { id: "i", label: "I" },
              { id: "she", label: "She" },
              { id: "he", label: "He" },
            ],
          },
          {
            role: "feeling",
            options: [
              { id: "like", label: "like" },
              { id: "likes", label: "likes" },
            ],
          },
          {
            role: "activity",
            options: [
              { id: "drawing", label: "drawing", base_form: "draw" },
              { id: "draw", label: "draw", base_form: "draw" },
              { id: "reading-comics", label: "reading", base_form: "read" },
              { id: "read", label: "read", base_form: "read" },
            ],
          },
        ],
        examples: [
          {
            id: "ex-mia",
            tab_id: "mia",
            values: { person: "i", feeling: "like", activity: "drawing" },
            build_values: { person: "she", feeling: "likes", activity: "drawing" },
            build_choices: {
              person: ["she", "he"],
              feeling: ["like", "likes"],
              activity: ["drawing", "draw"],
            },
          },
          {
            id: "ex-leo",
            tab_id: "leo",
            values: { person: "i", feeling: "like", activity: "reading-comics" },
            build_values: {
              person: "he",
              feeling: "likes",
              activity: "reading-comics",
            },
            build_choices: {
              person: ["she", "he"],
              feeling: ["like", "likes"],
              activity: ["reading-comics", "read"],
            },
          },
        ],
        bubbles: [
          { id: "b-mia", example_id: "ex-mia", x_percent: 28, y_percent: 10 },
          { id: "b-leo", example_id: "ex-leo", x_percent: 68, y_percent: 10 },
        ],
        layers: [
          {
            type: "listen_and_build",
            id: "listen-build-friends",
            example_ids: ["ex-mia", "ex-leo"],
            require_listen_before_build: true,
            distractor_option_ids: [],
          },
          {
            type: "workbench",
            id: "modify-examples",
            elements: [
              { type: "example_tabs" },
              { type: "chunk_dissection", show_full_sentence: false },
              {
                type: "slot_chooser",
                role: "activity",
                option_ids: ["drawing", "reading-comics"],
              },
              {
                type: "action_row",
                actions: ["hear_sentence", "cycle_slot"],
                cycle_role: "activity",
              },
            ],
          },
        ],
        reference_from_layer: 0,
        reference: {
          general: {
            title: "Simple sentences",
            body: "A simple sentence has **who**, a **verb**, and **what** they do.",
            items: [
              { id: "g-who", text: "Who", note: "I / She / He", icon: "me" },
              { id: "g-verb", text: "Verb", note: "like / likes", icon: "heart" },
              { id: "g-what", text: "What", note: "drawing, reading…", icon: "pencil" },
            ],
          },
          intro: "Tap a word in the sentence to see the grammar tip.",
          focus_panels: [
            {
              role: "person",
              title: "People words",
              body: "These words tell us **who** we are talking about.",
              items: [
                { id: "p-i", text: "I", note: "me", icon: "me" },
                { id: "p-she", text: "She", note: "a girl / a woman", icon: "girl" },
                { id: "p-he", text: "He", note: "a boy / a man", icon: "boy" },
              ],
            },
            {
              role: "feeling",
              title: "like → likes",
              body: "With **he** and **she**, we add **-s** to the verb.",
              items: [
                { id: "f-i", text: "I like", note: "no -s", icon: "me" },
                { id: "f-she", text: "She likes", note: "add -s", icon: "girl" },
                { id: "f-he", text: "He likes", note: "add -s", icon: "boy" },
              ],
            },
            {
              role: "activity",
              title: "Doing words: -ing",
              body: "After **like**, the activity ends in **-ing**.",
              items: [
                {
                  id: "a-draw",
                  text: "drawing",
                  base: "draw",
                  form: "drawing",
                  icon: "pencil",
                },
                {
                  id: "a-read",
                  text: "reading",
                  base: "read",
                  form: "reading",
                  icon: "book",
                },
              ],
            },
          ],
        },
        completion: {
          type: "complete_all_layers",
          explore: {
            all_tabs: true,
            all_grammar_roles: true,
            min_sentence_changes: 3,
            min_changes_per_tab: 1,
          },
        },
      };
    case "drag_match":
      return {
        type: "interaction",
        subtype: "drag_match",
        body_text: "Match each word to the right group.",
        zones: [
          { id: "z1", label: "Animals" },
          { id: "z2", label: "Food" },
        ],
        tokens: [
          { id: "tok1", label: "cat" },
          { id: "tok2", label: "apple" },
        ],
        correct_map: { tok1: "z1", tok2: "z2" },
      };
    case "line_match":
      return {
        type: "interaction",
        subtype: "line_match",
        body_text: "Draw a line to match each word.",
        zones: [
          { id: "z1", label: "Animals" },
          { id: "z2", label: "Food" },
        ],
        tokens: [
          { id: "tok1", label: "cat" },
          { id: "tok2", label: "apple" },
        ],
        correct_map: { tok1: "z1", tok2: "z2" },
      };
    case "sound_sort":
      return {
        type: "interaction",
        subtype: "sound_sort",
        body_text: "Listen and tap the picture that matches.",
        prompt_audio_url:
          "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        choices: [
          { id: "a", image_url: "https://placehold.co/400x400/e2e8f0/334155?text=A" },
          { id: "b", image_url: "https://placehold.co/400x400/fce7f3/831843?text=B" },
        ],
        correct_choice_id: "a",
      };
    case "listen_and_choose":
      return {
        type: "interaction",
        subtype: "listen_and_choose",
        body_text: "Listen, then choose the picture.",
        dialog_text: "I'd like a loaf of bread, please.",
        image_fit: "contain",
        auto_play: true,
        shuffle_choices: false,
        choices: [
          {
            id: "a",
            image_url: "https://placehold.co/400x400/fef3c7/92400e?text=Bread",
            label: "Bread",
          },
          {
            id: "b",
            image_url: "https://placehold.co/400x400/dbeafe/1e3a8a?text=Milk",
            label: "Milk",
          },
          {
            id: "c",
            image_url: "https://placehold.co/400x400/dcfce7/14532d?text=Apple",
            label: "Apple",
          },
        ],
        correct_choice_id: "a",
      };
    case "flashcards":
      return {
        type: "interaction",
        subtype: "flashcards",
        activity_name: "Word study",
        body_text: "Tap the card to flip. Study each word.",
        shuffle_cards: false,
        cards: [
          {
            id: "c1",
            faces: {
              word: "bakery",
              definition: "a place that sells bread and cakes",
              example: "We buy bread at the bakery.",
            },
            front_faces: ["word"],
            back_faces: ["definition", "example"],
          },
          {
            id: "c2",
            faces: {
              word: "bread",
              definition: "food made from flour, used for sandwiches",
              example: "I like bread with butter.",
            },
            front_faces: ["word"],
            back_faces: ["definition", "example"],
          },
        ],
      };
    case "listen_color_write":
      return {
        type: "interaction",
        subtype: "listen_color_write",
        image_url: "/listen-color-backgrounds/scene-easy.svg",
        body_text: "Listen. Pick a color or word. Tap each target.",
        prompt_audio_url:
          "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        allow_replay: true,
        allow_overwrite: true,
        require_all_targets: true,
        shuffle_text_options: false,
        palette: [
          { id: "red", label: "Red", color_hex: "#ef4444" },
          { id: "blue", label: "Blue", color_hex: "#3b82f6" },
          { id: "green", label: "Green", color_hex: "#22c55e" },
        ],
        text_options: [
          { id: "cat", label: "cat" },
          { id: "dog", label: "dog" },
          { id: "sun", label: "sun" },
        ],
        targets: [
          {
            id: "lcw1",
            x_percent: 12,
            y_percent: 20,
            w_percent: 20,
            h_percent: 24,
            label: "Color target",
            expected_mode: "color",
            expected_value: "red",
          },
          {
            id: "lcw2",
            x_percent: 42,
            y_percent: 28,
            w_percent: 20,
            h_percent: 24,
            label: "Write target",
            expected_mode: "text",
            expected_value: "cat",
          },
        ],
      };
    case "letter_mixup":
      return {
        type: "interaction",
        subtype: "letter_mixup",
        prompt: "Reorder the letters to make the correct words.",
        image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Letter+Mixup",
        shuffle_letters: true,
        case_sensitive: false,
        items: [
          { id: "lm1", target_word: "school", accepted_words: ["School"] },
          { id: "lm2", target_word: "teacher", accepted_words: ["Teacher"] },
        ],
      };
    case "word_shape_hunt":
      return {
        type: "interaction",
        subtype: "word_shape_hunt",
        prompt: "Tap all vocabulary words.",
        image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Word+Shape+Hunt",
        shape_layout: "wave",
        shuffle_chunks: false,
        word_chunks: [
          { id: "w1", text: "apple", is_vocab: true },
          { id: "w2", text: "table", is_vocab: false },
          { id: "w3", text: "banana", is_vocab: true },
          { id: "w4", text: "window", is_vocab: false },
        ],
      };
    case "wordsearch":
      return {
        type: "interaction",
        subtype: "wordsearch",
        prompt: "Find every word in the grid.",
        grid_size: 10,
        allow_backwards: false,
        words: [
          { id: "w1", word: "apple" },
          { id: "w2", word: "banana" },
        ],
      };
    case "crossword":
      return {
        type: "interaction",
        subtype: "crossword",
        prompt: "Use the clues to complete the crossword.",
        entries: [
          { id: "w1", answer: "apple", clue: "A round fruit." },
          { id: "w2", answer: "banana", clue: "A long yellow fruit." },
        ],
      };
    case "memory":
      return {
        type: "interaction",
        subtype: "memory",
        prompt: "Match each word to its meaning.",
        pairs: [
          { id: "w1", word: "apple", clue: "A round fruit." },
          { id: "w2", word: "banana", clue: "A long yellow fruit." },
        ],
      };
    case "table_complete":
      return {
        type: "interaction",
        subtype: "table_complete",
        prompt: "Complete the table.",
        left_column_label: "Word",
        right_column_label: "Meaning",
        input_mode: "typing",
        case_insensitive: true,
        normalize_whitespace: true,
        rows: [
          { id: "r1", prompt_text: "doctor", acceptable_answers: ["a person who helps sick people"] },
          { id: "r2", prompt_text: "pilot", acceptable_answers: ["a person who flies a plane"] },
        ],
        token_bank: [],
      };
    case "sorting_game":
      return {
        type: "interaction",
        subtype: "sorting_game",
        prompt: "Sort each object into the correct container.",
        containers: [
          { id: "c1", display: { text: "Animals" } },
          { id: "c2", display: { text: "Food" } },
        ],
        objects: [
          { id: "o1", display: { text: "cat" }, target_container_id: "c1" },
          { id: "o2", display: { text: "apple" }, target_container_id: "c2" },
          { id: "o3", display: { text: "dog" }, target_container_id: "c1" },
          { id: "o4", display: { text: "bread" }, target_container_id: "c2" },
        ],
        shuffle_objects: true,
        allow_reassign: true,
      };
    case "explore":
      return {
        type: "interaction",
        subtype: "explore",
        explore_template: "default_run_v1",
        world_length: 3200,
        scroll_speed_px_per_sec: 140,
        gates: [
          {
            id: "gate_1",
            time_limit_sec: 10,
            prompt: "Spell the word before you hit the obstacle!",
            target_word: "run",
          },
          {
            id: "gate_2",
            time_limit_sec: 10,
            prompt: "Spell the word before you hit the obstacle!",
            target_word: "jump",
          },
          {
            id: "gate_3",
            time_limit_sec: 10,
            prompt: "Spell the word before you hit the obstacle!",
            target_word: "fast",
          },
        ],
        encounter: {
          title: "A strange place",
          body_text: "You found a hidden spot. What did you discover?",
        },
      };
    case "word_bucket_catch":
      return {
        type: "interaction",
        subtype: "word_bucket_catch",
        target_word: "ball",
        body_text:
          "Line up the top of the bucket under the pictures. Catch enough matches; wrong pictures can fall away. You lose only if you catch a wrong picture.",
        required_correct_catches: 5,
        fall_speed_px_per_sec: 155,
        spawn_interval_ms: 1350,
        item_size_px: 56,
        bucket_width_px: 88,
        bucket_height_px: 52,
        choices: [
          { id: "ball", image_url: "/listen-color-objects/ball.svg", correct: true },
          { id: "car", image_url: "/listen-color-objects/car.svg", correct: false },
          { id: "cup", image_url: "/listen-color-objects/cup.svg", correct: false },
          { id: "bird", image_url: "/listen-color-objects/bird.svg", correct: false },
        ],
      };
    case "essay":
      return {
        type: "interaction",
        subtype: "essay",
        prompt: "Write two sentences about your school.",
        min_chars: 10,
        keywords: [],
        feedback_text: "",
        show_keywords_to_students: false,
      };
    case "voice_question":
      return {
        type: "interaction",
        subtype: "voice_question",
        prompt: "Record your answer: What did you do this morning?",
        max_duration_seconds: 90,
        max_attempts: 3,
        require_playback_before_submit: false,
      };
    case "guided_dialogue":
      return {
        type: "interaction",
        subtype: "guided_dialogue",
        character_name: "Mia",
        character_image_url: "https://placehold.co/500x700/fce7f3/831843?text=Character",
        intro_text: "Talk to Mia and complete each speaking turn.",
        turns: [
          {
            id: "turn_1",
            prompt_text: "Hi! What is your name?",
            student_response_label: "Say your name",
            max_duration_seconds: 60,
          },
          {
            id: "turn_2",
            prompt_text: "Nice to meet you. How are you today?",
            student_response_label: "Describe how you feel",
            max_duration_seconds: 60,
          },
        ],
        require_turn_audio_playback: false,
        allow_retry_each_turn: true,
      };
    default:
      return rawInteractionTemplateForSubtype("mc_quiz");
  }
}

/** Legacy treasure-hunt style multi-target `click_targets` (decoys + treasure_target_ids). */
export function treasureHuntClickTargetsTemplate(): Record<string, unknown> {
  return {
    type: "interaction",
    subtype: "click_targets",
    image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Scene",
    body_text: "Find three hidden things!",
    targets: [
      {
        id: "t1",
        x_percent: 12,
        y_percent: 18,
        w_percent: 20,
        h_percent: 22,
        label: "Thing 1",
      },
      {
        id: "t2",
        x_percent: 42,
        y_percent: 38,
        w_percent: 20,
        h_percent: 22,
        label: "Thing 2",
      },
      {
        id: "t3",
        x_percent: 68,
        y_percent: 22,
        w_percent: 20,
        h_percent: 22,
        label: "Thing 3",
      },
      {
        id: "d1",
        x_percent: 20,
        y_percent: 70,
        w_percent: 18,
        h_percent: 18,
        label: "Not this",
      },
    ],
    treasure_target_ids: ["t1", "t2", "t3"],
  };
}
