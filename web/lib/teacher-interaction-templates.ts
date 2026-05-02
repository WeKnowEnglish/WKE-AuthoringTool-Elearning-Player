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
    case "hotspot_info":
      return {
        type: "interaction",
        subtype: "hotspot_info",
        image_url: "https://placehold.co/800x450/dcfce7/14532d?text=Explore",
        body_text: "Tap the picture to learn more.",
        hotspots: [
          {
            id: "h1",
            x_percent: 10,
            y_percent: 10,
            w_percent: 30,
            h_percent: 40,
            title: "Tip",
            body: "This is extra information.",
          },
        ],
        require_all_viewed: false,
      };
    case "hotspot_gate":
      return {
        type: "interaction",
        subtype: "hotspot_gate",
        image_url: "https://placehold.co/800x450/fee2e2/991b1b?text=Tap",
        body_text: "Tap the correct area.",
        mode: "single",
        targets: [
          {
            id: "t1",
            x_percent: 15,
            y_percent: 20,
            w_percent: 30,
            h_percent: 35,
            label: "Correct",
          },
          {
            id: "t2",
            x_percent: 55,
            y_percent: 20,
            w_percent: 30,
            h_percent: 35,
            label: "Wrong",
          },
        ],
        correct_target_id: "t1",
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
    case "listen_hotspot_sequence":
      return {
        type: "interaction",
        subtype: "listen_hotspot_sequence",
        image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Listen+and+tap",
        body_text: "Listen and tap the hotspots in order.",
        prompt_audio_url:
          "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        targets: [
          { id: "s1", x_percent: 12, y_percent: 18, w_percent: 20, h_percent: 24, label: "First" },
          { id: "s2", x_percent: 40, y_percent: 26, w_percent: 20, h_percent: 24, label: "Second" },
          { id: "s3", x_percent: 68, y_percent: 22, w_percent: 20, h_percent: 24, label: "Third" },
        ],
        order: ["s1", "s2", "s3"],
        allow_replay: true,
      };
    case "listen_color_write":
      return {
        type: "interaction",
        subtype: "listen_color_write",
        image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Listen+Color+Write",
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
