import type { ScreenPayload } from "@/lib/lesson-schemas";

/** Interaction subtypes that have dedicated lazy chunks. */
export type InteractionSubtype = Extract<ScreenPayload, { type: "interaction" }>["subtype"];

/** Warm the next screen’s JS chunk (fire-and-forget). */
export function prefetchInteractionChunk(subtype: InteractionSubtype): void {
  switch (subtype) {
    case "mc_quiz":
      void import("./McQuizView");
      break;
    case "true_false":
      void import("./TrueFalseView");
      break;
    case "short_answer":
      void import("./ShortAnswerView");
      break;
    case "fix_text":
      void import("./FixTextView");
      break;
    case "fill_blanks":
      void import("./FillBlanksView");
      break;
    case "essay":
      void import("./EssayView");
      break;
    case "explore_hotspots":
      void import("./ExploreHotspotsView");
      break;
    case "language_in_focus":
      void import("./LanguageInFocusView");
      break;
    case "drag_match":
      void import("./DragMatchView");
      break;
    case "line_match":
      void import("./LineMatchView");
      break;
    case "click_targets":
      void import("./ClickTargetsView");
      break;
    case "sound_sort":
      void import("./SoundSortView");
      break;
    case "listen_and_choose":
      void import("./ListenAndChooseView");
      break;
    case "flashcards":
      void import("./FlashcardsView");
      break;
    case "listen_color_write":
      void import("./ListenColorWriteView");
      break;
    case "letter_mixup":
      void import("./LetterMixupView");
      break;
    case "word_shape_hunt":
      void import("./WordShapeHuntView");
      break;
    case "table_complete":
      void import("./TableCompleteView");
      break;
    case "sorting_game":
      void import("./SortingGameView");
      break;
    case "voice_question":
      void import("./VoiceQuestionView");
      break;
    case "guided_dialogue":
      void import("./GuidedDialogueView");
      break;
    case "drag_sentence":
      void import("./DragSentenceView");
      break;
    case "word_bucket_catch":
      void import("./WordBucketCatchView");
      break;
    case "explore":
      void import("./ExploreRunView");
      break;
    default: {
      const _exhaustive: never = subtype;
      void _exhaustive;
      break;
    }
  }
}
