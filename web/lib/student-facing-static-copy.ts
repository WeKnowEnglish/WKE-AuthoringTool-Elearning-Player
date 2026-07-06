import {
  validateStudentFacingTextSurface,
  type StudentFacingLanguageIssue,
  type StudentFacingLanguageRole,
} from "@/lib/esl-language-quality";

export type StudentFacingStaticCopyEntry = {
  id: string;
  text: string;
  role: StudentFacingLanguageRole;
  owner:
    | "lesson-player"
    | "student-hub"
    | "daily-quests"
    | "pet-care"
    | "explore"
    | "collection"
    | "mini-game";
  source: string;
};

export type StudentFacingStaticCopyAuditSource = {
  owner: StudentFacingStaticCopyEntry["owner"];
  source: string;
  surface: string;
};

export type StudentFacingStaticCopyIgnoredLiteral = {
  source: string;
  text: string;
  reason: string;
};

export type StudentFacingStaticCopyIssue = StudentFacingLanguageIssue & {
  id: string;
  owner: StudentFacingStaticCopyEntry["owner"];
  source: string;
  text: string;
};

export const STUDENT_FACING_STATIC_COPY_AUDIT_SOURCES: StudentFacingStaticCopyAuditSource[] = [
  {
    owner: "lesson-player",
    source: "components/lesson/LessonPlayer.tsx",
    surface: "reward screen, start CTA, lesson navigation shell",
  },
  {
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
    surface: "vocabulary reward summary and bonus labels",
  },
  {
    owner: "student-hub",
    source: "components/student-hub/StudentHubClient.tsx",
    surface: "hub shell messages and unlock feedback",
  },
  {
    owner: "student-hub",
    source: "components/student-hub/HomeRoom.tsx",
    surface: "home room action labels and story entry feedback",
  },
  {
    owner: "daily-quests",
    source: "components/teststartpage/DailyQuestsPanel.tsx",
    surface: "daily quest status, reward, and chest messages",
  },
  {
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
    surface: "daily quest labels",
  },
  {
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
    surface: "pet-care instructions, treasure feedback, and study prompt",
  },
  {
    owner: "explore",
    source: "components/student-hub/ExploreCompleteSummary.tsx",
    surface: "explore completion and next-action feedback",
  },
  {
    owner: "mini-game",
    source: "components/lesson/interactions",
    surface: "shared activity instructions, success feedback, hints, and retry messages",
  },
];

export const STUDENT_FACING_STATIC_COPY_IGNORED_LITERALS: StudentFacingStaticCopyIgnoredLiteral[] = [
  {
    source: "components/lesson/LessonPlayer.tsx",
    text: "Start button label",
    reason: "Teacher/editor preview aria label, not visible student-facing copy.",
  },
];

export const STUDENT_FACING_STATIC_COPY: StudentFacingStaticCopyEntry[] = [
  {
    id: "lesson-player.reward.title",
    text: "Great job!",
    role: "feedback",
    owner: "lesson-player",
    source: "components/lesson/LessonPlayer.tsx",
  },
  {
    id: "lesson-player.reward.finished",
    text: "You finished the lesson!",
    role: "feedback",
    owner: "lesson-player",
    source: "components/lesson/LessonPlayer.tsx",
  },
  {
    id: "lesson-player.start.default_cta",
    text: "Start learning",
    role: "instruction",
    owner: "lesson-player",
    source: "components/lesson/LessonPlayer.tsx",
  },
  {
    id: "lesson-player.vocab_reward.title",
    text: "Awesome!",
    role: "feedback",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.first_try_accuracy",
    text: "First-try accuracy",
    role: "label",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.first_try_line",
    text: "correct on the first try!",
    role: "feedback",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.details_toggle",
    text: "How you earned coins",
    role: "instruction",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.hide_details",
    text: "Hide details",
    role: "instruction",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.during_lesson",
    text: "During the lesson",
    role: "label",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.finish_bonus",
    text: "Finish bonus",
    role: "label",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.first_try_bonus",
    text: "First-try bonus",
    role: "label",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.super_words",
    text: "Super words",
    role: "label",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.speed_bonus",
    text: "Speed bonus",
    role: "label",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "lesson-player.vocab_reward.review_next",
    text: "Practice these next time.",
    role: "instruction",
    owner: "lesson-player",
    source: "components/lesson/VocabActivityRewardScreen.tsx",
  },
  {
    id: "student-hub.garden.locked",
    text: "Language Garden unlocks at level 2. Keep learning!",
    role: "feedback",
    owner: "student-hub",
    source: "components/student-hub/StudentHubClient.tsx",
  },
  {
    id: "student-hub.home.word_practice",
    text: "Word practice",
    role: "instruction",
    owner: "student-hub",
    source: "components/student-hub/HomeRoom.tsx",
  },
  {
    id: "student-hub.home.story_coming_soon",
    text: "Story coming soon.",
    role: "feedback",
    owner: "student-hub",
    source: "components/student-hub/HomeRoom.tsx",
  },
  {
    id: "student-hub.home.story_preparing",
    text: "The next adventure area is being prepared.",
    role: "feedback",
    owner: "student-hub",
    source: "components/student-hub/HomeRoom.tsx",
  },
  {
    id: "daily-quests.loading",
    text: "Loading your quests...",
    role: "feedback",
    owner: "daily-quests",
    source: "components/teststartpage/DailyQuestsPanel.tsx",
  },
  {
    id: "daily-quests.opened",
    text: "Opened today. Come back tomorrow for new quests.",
    role: "feedback",
    owner: "daily-quests",
    source: "components/teststartpage/DailyQuestsPanel.tsx",
  },
  {
    id: "daily-quests.complete",
    text: "All goals complete! Open the chest for gold and XP.",
    role: "feedback",
    owner: "daily-quests",
    source: "components/teststartpage/DailyQuestsPanel.tsx",
  },
  {
    id: "daily-quests.finish_goals",
    text: "Finish all goals today to unlock the chest.",
    role: "instruction",
    owner: "daily-quests",
    source: "components/teststartpage/DailyQuestsPanel.tsx",
  },
  {
    id: "daily-quests.chase_levels",
    text: "Clear 20 chase levels",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.bucket_catches",
    text: "Catch 45 correct objects in Word bucket catch",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.letter_mixup",
    text: "Spell 15 words correctly in Letter mix-up",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.quiz_completions",
    text: "Finish 2 full topic quizzes",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.vocab_set_completions",
    text: "Finish 2 vocabulary sets",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.explore_completions",
    text: "Finish 1 explore run",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.garden_harvests",
    text: "Harvest 5 letters in Language Garden",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.chase_wins",
    text: "Win the chase game 2 times",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.garden_words",
    text: "Spell 3 words in Language Garden",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "daily-quests.garden_weeds_cleared",
    text: "Defeat 2 weed monsters",
    role: "instruction",
    owner: "daily-quests",
    source: "lib/teststartpage/daily-quests.ts",
  },
  {
    id: "pet-care.title",
    text: "Pet Care",
    role: "label",
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
  },
  {
    id: "pet-care.summary",
    text: "Take care of your dog.",
    role: "instruction",
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
  },
  {
    id: "pet-care.study_pending",
    text: "Finish a learning activity to study together!",
    role: "instruction",
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
  },
  {
    id: "pet-care.treasure.ready",
    text: "All meters are ready. Claim your gold!",
    role: "feedback",
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
  },
  {
    id: "pet-care.claim_gold",
    text: "Claim gold!",
    role: "instruction",
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
  },
  {
    id: "pet-care.on_cooldown",
    text: "On cooldown",
    role: "feedback",
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
  },
  {
    id: "pet-care.not_ready",
    text: "Not ready",
    role: "feedback",
    owner: "pet-care",
    source: "components/student-hub/PetRoom.tsx",
  },
  {
    id: "explore.complete.title",
    text: "Run complete!",
    role: "feedback",
    owner: "explore",
    source: "components/student-hub/ExploreCompleteSummary.tsx",
  },
  {
    id: "explore.complete.keep_exploring",
    text: "Keep exploring to find more words in this area.",
    role: "instruction",
    owner: "explore",
    source: "components/student-hub/ExploreCompleteSummary.tsx",
  },
  {
    id: "mini-game.word_bucket.instructions.single",
    text: "Line up the bucket under falling pictures. Catch the pictures that match the word.",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/WordBucketCatchCore.tsx",
  },
  {
    id: "mini-game.fix_text.correct",
    text: "Nice work. That is correct!",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.drag_match.drop_here",
    text: "Drop here",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/DragMatchView.tsx",
  },
  {
    id: "mini-game.essay.placeholder",
    text: "Write here...",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/EssayView.tsx",
  },
  {
    id: "mini-game.fill_blanks.word_choices",
    text: "Word choices",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/FillBlanksView.tsx",
  },
  {
    id: "mini-game.fill_blanks.wrong_hint.tap_or_type",
    text: "Not quite yet. Correct words stay green. Tap a word or type, then tap Check.",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/FillBlanksView.tsx",
  },
  {
    id: "mini-game.fill_blanks.wrong_hint.word_box",
    text: "Not quite yet. Correct words stay green. Use the word box or type, then tap Check.",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/FillBlanksView.tsx",
  },
  {
    id: "mini-game.fill_blanks.wrong_hint.no_bank",
    text: "Not quite yet. Correct words are locked in green. Try again for the empty blanks.",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/FillBlanksView.tsx",
  },
  {
    id: "mini-game.letter_mixup.your_word",
    text: "Your word",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/LetterMixupView.tsx",
  },
  {
    id: "mini-game.letter_mixup.listen_word",
    text: "Tap to hear the word",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/LetterMixupView.tsx",
  },
  {
    id: "mini-game.explore_scene.help_brother",
    text: "Help brother",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/explore-scene/ExploreSceneHud.tsx",
  },
  {
    id: "mini-game.explore_scene.collect_word",
    text: "Listen and collect this word for your brother's homework.",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/explore-scene/ExploreScenePickupPanel.tsx",
  },
  {
    id: "mini-game.explore_scene.pickup_item",
    text: "Pick this up for your brother.",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/explore-scene/ExploreScenePickupPanel.tsx",
  },
  {
    id: "mini-game.explore.preview_rewards",
    text: "Preview — rewards not saved",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreEncounterPanel.tsx",
  },
  {
    id: "mini-game.explore.collection_added",
    text: "Added to your Collection → Words",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreEncounterPanel.tsx",
  },
  {
    id: "mini-game.explore.gate_spell",
    text: "Spell as many words as you can!",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreGatePanel.tsx",
  },
  {
    id: "mini-game.explore.obstacle_encounter",
    text: "Obstacle encounter",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreRunLoopCanvas.tsx",
  },
  {
    id: "mini-game.explore.run_spell_clouds",
    text: "Explore run — spell in the clouds",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreRunLoopCanvas.tsx",
  },
  {
    id: "mini-game.explore.run_loop",
    text: "Explore run loop",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreRunLoopCanvas.tsx",
  },
  {
    id: "mini-game.explore.gate_ahead",
    text: "Gate ahead — get ready!",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreRunView.tsx",
  },
  {
    id: "mini-game.explore.jump_clear",
    text: "Jump clear!",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreRunView.tsx",
  },
  {
    id: "mini-game.explore.ouch_keep_going",
    text: "Ouch — keep going!",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/ExploreRunView.tsx",
  },
  {
    id: "mini-game.fix_text.no_words_left",
    text: "Nothing left to fix — try Check.",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.fix_text.no_choice_hint",
    text: "No multiple-choice hint for this word — type the fix instead.",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.fix_text.pick_best_word",
    text: "Pick the word that fits best.",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.fix_text.all_mistakes_highlighted",
    text: "All mistakes are highlighted — tap a glowing word to fix it, then Hint for choices.",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.fix_text.glowing_word_hint",
    text: "A glowing word doesn’t match the answer yet — tap it to fix, then tap Hint again.",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.fix_text.sentence_words",
    text: "Sentence words",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.fix_text.hint_choices",
    text: "Hint choices",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.fix_text.correction_label",
    text: "Correction for this word",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/FixTextView.tsx",
  },
  {
    id: "mini-game.guided_dialogue.submit_final",
    text: "Submit final turn",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/GuidedDialogueView.tsx",
  },
  {
    id: "mini-game.guided_dialogue.submit_continue",
    text: "Submit and continue",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/GuidedDialogueView.tsx",
  },
  {
    id: "mini-game.shared.listen_again",
    text: "Listen again",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/TrueFalseView.tsx",
  },
  {
    id: "mini-game.shared.microphone_blocked",
    text: "Microphone access was blocked. Please allow microphone permissions.",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/shared.tsx",
  },
  {
    id: "mini-game.shared.upload_failed",
    text: "Upload failed.",
    role: "feedback",
    owner: "mini-game",
    source: "components/lesson/interactions/shared.tsx",
  },
  {
    id: "mini-game.short_answer.your_answer",
    text: "Your answer",
    role: "label",
    owner: "mini-game",
    source: "components/lesson/interactions/ShortAnswerView.tsx",
  },
  {
    id: "mini-game.table_complete.place_token",
    text: "Tap to place token",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/TableCompleteView.tsx",
  },
  {
    id: "mini-game.voice_question.submit_recording",
    text: "Submit recording",
    role: "instruction",
    owner: "mini-game",
    source: "components/lesson/interactions/VoiceQuestionView.tsx",
  },
];

export function validateStudentFacingStaticCopy(
  entries: readonly StudentFacingStaticCopyEntry[] = STUDENT_FACING_STATIC_COPY,
): StudentFacingStaticCopyIssue[] {
  return entries.flatMap((entry) =>
    validateStudentFacingTextSurface({
      path: `static.${entry.id}`,
      role: entry.role,
      text: entry.text,
    }).map((issue) => ({
      ...issue,
      id: entry.id,
      owner: entry.owner,
      source: entry.source,
      text: entry.text,
    })),
  );
}
