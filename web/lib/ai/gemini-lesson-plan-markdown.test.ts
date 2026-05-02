import { describe, expect, it } from "vitest";
import { normalizeAiLessonPlan } from "@/lib/ai/ai-lesson-plan";
import {
  mergeEnhancedLessonPlanMarkdown,
  stripEnhancedPlanNarrativeMarkdown,
  structuredLessonPlanSuffix,
  validateEnhancerStructureInvariants,
} from "./gemini";

describe("stripEnhancedPlanNarrativeMarkdown", () => {
  it("removes trailing app footer", () => {
    const raw = "# Hi\n\n## Story\nHello\n\n---\n*You can edit this document freely. Use **Generate activities** when ready — the app uses this text plus saved objectives.*";
    expect(stripEnhancedPlanNarrativeMarkdown(raw)).toBe("# Hi\n\n## Story\nHello");
  });

  it("cuts at earliest structured heading", () => {
    const raw = `# Title

## Screen-by-screen flow
old list

## Quiz groups
- x`;
    expect(stripEnhancedPlanNarrativeMarkdown(raw).trim()).toBe("# Title");
  });
});

describe("structuredLessonPlanSuffix", () => {
  it("includes quiz lines, media, outline, footer", () => {
    const plan = normalizeAiLessonPlan({
      storyBeatCount: 2,
      quizGroups: [{ title: "Check", questionCount: 1 }],
      mediaSearchTerms: ["cat"],
      screenOutline: [
        { kind: "story", summary: "open", pages: [{ summary: "a", interaction_mode: "tap_to_advance" }] },
        { kind: "interaction", subtype: "mc_quiz", quiz_group_title: "Check", summary: "q" },
      ],
    });
    const goals = ["Name animals"];
    const s = structuredLessonPlanSuffix(plan, goals);
    expect(s).toContain("## Quiz groups");
    expect(s).toContain("**Check**");
    expect(s).toContain("## Media / search terms");
    expect(s).toContain("cat");
    expect(s).toContain("## Screen-by-screen flow");
    expect(s).toContain("**story**");
    expect(s).toContain("tap_to_advance");
    expect(s).toContain("*You can edit this document freely.");
  });

  it("renders Story-first section with pedagogical beat pages", () => {
    const plan = normalizeAiLessonPlan({
      storyBeatCount: 2,
      quizGroups: [{ title: "Check", questionCount: 1 }],
      mediaSearchTerms: ["weather", "raincoat"],
      storyFirstBlueprint: {
        lesson_metadata: { lesson_title: "Weather", production_mode: "story_first" },
        cefr_level: "A1",
        target_age: { min_age: 7, max_age: 9 },
        learner_profile: {},
        learning_goals: ["Recognize weather words"],
        vocabulary_targets: [],
        grammar_targets: [],
        story_pattern_type: "daily_life",
        story_arc: {
          setup: "Clouds appear.",
          goal_or_problem: "Pick weather-ready clothes.",
          resolution: "Right outfit selected.",
          recap: "Characters reflect.",
        },
        characters: [],
        ordered_story_beats: [
          {
            beat_id: "b1",
            beat_order: 1,
            narrative_function: "guided_discovery",
            story_event: "Mia checks the weather.",
            language_introduced: { vocabulary: ["rainy"], phrases: ["It is rainy."] },
            grammar_modeled: { grammar_points: [], model_sentences: ["It is rainy."] },
            pages: [
              { page_id: "b1p1", page_goal: "See weather signs", narrative_function: "setup" },
              {
                page_id: "b1p2",
                page_goal: "Tap weather control",
                narrative_function: "learner_action",
              },
              {
                page_id: "b1p3",
                page_goal: "Observe weather change",
                narrative_function: "consequence",
              },
            ],
            reinforcement: {
              activity_type: "mc_quiz",
              attached_to_beat_id: "b1",
              reason_for_activity_choice: "Check after story action.",
            },
            progression_logic: { learner_should_now_know: ["rainy"] },
          },
          {
            beat_id: "b2",
            beat_order: 2,
            narrative_function: "recap",
            story_event: "Mia explains her choices.",
            language_introduced: { vocabulary: [], phrases: [] },
            grammar_modeled: { grammar_points: [], model_sentences: [] },
            pages: [
              { page_id: "b2p1", page_goal: "Reflect on events", narrative_function: "setup" },
              {
                page_id: "b2p2",
                page_goal: "Retell the weather steps",
                narrative_function: "learner_action",
              },
              {
                page_id: "b2p3",
                page_goal: "Celebrate success",
                narrative_function: "consequence",
              },
            ],
            progression_logic: {
              depends_on_previous_beat_id: "b1",
              learner_should_now_know: ["weather words"],
            },
          },
        ],
        wrap_up_recap: {
          story_return_required: true,
          recap_beat_id: "b2",
          vocabulary_recycled: ["rainy"],
          grammar_recycled: [],
          final_success_moment: "Mia is ready for rain.",
        },
      },
    });
    const out = structuredLessonPlanSuffix(plan, ["Recognize weather words"]);
    expect(out).toContain("## Story-first blueprint flow");
    expect(out).toContain("reinforcement: `mc_quiz`");
    expect(out).toContain("Final recap beat: `b2`");
  });
});

describe("mergeEnhancedLessonPlanMarkdown", () => {
  it("appends canonical suffix after narrative", () => {
    const plan = normalizeAiLessonPlan({
      storyBeatCount: 1,
      quizGroups: [{ title: "G", questionCount: 1 }],
      mediaSearchTerms: ["zoo"],
      screenOutline: [
        { kind: "story", summary: "s", learning_goal_indices: [0] },
        { kind: "interaction", subtype: "mc_quiz", quiz_group_title: "G", summary: "q" },
      ],
    });
    const out = mergeEnhancedLessonPlanMarkdown("# Lesson\n\n## Overview\nZoo trip.", plan, ["Goal one"]);
    expect(out.startsWith("# Lesson\n\n## Overview\nZoo trip.")).toBe(true);
    expect(out).toContain("## Quiz groups");
    expect(out).toContain("## Screen-by-screen flow");
    expect(out).toContain("[goal 0]");
  });
});

describe("validateEnhancerStructureInvariants", () => {
  function makePlan() {
    return normalizeAiLessonPlan({
      storyBeatCount: 2,
      quizGroups: [],
      mediaSearchTerms: ["weather"],
      storyFirstBlueprint: {
        lesson_metadata: { lesson_title: "Weather", production_mode: "story_first" },
        cefr_level: "A1",
        target_age: { min_age: 7, max_age: 9 },
        learner_profile: {},
        learning_goals: ["Recognize weather words"],
        vocabulary_targets: [],
        grammar_targets: [],
        story_pattern_type: "daily_life",
        story_arc: {
          setup: "Clouds appear.",
          goal_or_problem: "Choose weather-ready clothes.",
          resolution: "Correct outfit selected.",
          recap: "Characters reflect.",
        },
        characters: [],
        ordered_story_beats: [
          {
            beat_id: "beat_1",
            beat_order: 1,
            narrative_function: "guided_discovery",
            story_event: "Mia checks weather controls.",
            language_introduced: { vocabulary: ["rainy"], phrases: ["It is rainy."] },
            grammar_modeled: { grammar_points: [], model_sentences: ["It is rainy."] },
            pages: [
              { page_id: "b1p1", page_goal: "See clues", narrative_function: "setup" },
              { page_id: "b1p2", page_goal: "Tap control", narrative_function: "learner_action" },
              { page_id: "b1p3", page_goal: "See change", narrative_function: "consequence" },
            ],
            reinforcement: {
              activity_type: "mc_quiz",
              attached_to_beat_id: "beat_1",
              timing: "after_final_page_completion",
              reason_for_activity_choice: "Quick check after progression.",
            },
            progression_logic: { learner_should_now_know: ["rainy"] },
          },
          {
            beat_id: "beat_2",
            beat_order: 2,
            narrative_function: "recap",
            story_event: "Mia explains clothing choices.",
            language_introduced: { vocabulary: [], phrases: [] },
            grammar_modeled: { grammar_points: [], model_sentences: [] },
            pages: [
              { page_id: "b2p1", page_goal: "Reflect", narrative_function: "setup" },
              {
                page_id: "b2p2",
                page_goal: "Retell the sequence",
                narrative_function: "learner_action",
              },
              { page_id: "b2p3", page_goal: "Close story", narrative_function: "consequence" },
            ],
            progression_logic: {
              depends_on_previous_beat_id: "beat_1",
              learner_should_now_know: ["weather choices"],
            },
          },
        ],
        wrap_up_recap: {
          story_return_required: true,
          recap_beat_id: "beat_2",
          vocabulary_recycled: ["rainy"],
          grammar_recycled: [],
          final_success_moment: "Mia is ready for the rain.",
        },
      },
    });
  }

  it("accepts structurally equivalent output", () => {
    const before = makePlan();
    const after = makePlan();
    const result = validateEnhancerStructureInvariants(before, after);
    expect(result.ok).toBe(true);
  });

  it("rejects beat id rename (including recap id mismatch)", () => {
    const before = makePlan();
    const after = makePlan();
    if (!after.storyFirstBlueprint) throw new Error("missing blueprint");
    after.storyFirstBlueprint.ordered_story_beats[0]!.beat_id = "renamed_beat_1";
    const result = validateEnhancerStructureInvariants(before, after);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" | ")).toContain("beat id changed");
  });

  it("rejects page count reductions", () => {
    const before = makePlan();
    const after = makePlan();
    if (!after.storyFirstBlueprint) throw new Error("missing blueprint");
    after.storyFirstBlueprint.ordered_story_beats[0]!.pages =
      after.storyFirstBlueprint.ordered_story_beats[0]!.pages?.slice(0, 2);
    const result = validateEnhancerStructureInvariants(before, after);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" | ")).toContain("page count reduced");
  });

  it("rejects dropped storyFirstBlueprint", () => {
    const before = makePlan();
    const after = normalizeAiLessonPlan({
      storyBeatCount: 2,
      quizGroups: [{ title: "Quick check", questionCount: 1 }],
      mediaSearchTerms: ["weather"],
    });
    const result = validateEnhancerStructureInvariants(before, after);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("output dropped storyFirstBlueprint");
  });
});
