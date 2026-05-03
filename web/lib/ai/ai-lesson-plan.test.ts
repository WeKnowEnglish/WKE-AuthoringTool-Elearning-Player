import { describe, expect, it } from "vitest";
import {
  buildMaterializationSteps,
  formatStoryOutlineForMaterialization,
  normalizeAiLessonPlan,
  phaseCompletionEffectSchema,
  phaseTriggerSchema,
  quizGroupsForSpecs,
  safeParseStoredLessonPlanMeta,
  storyFirstBlueprintSchema,
  storyScreenCountFromPlan,
} from "./ai-lesson-plan";

describe("normalizeAiLessonPlan", () => {
  it("fills defaults from shallow JSON", () => {
    const p = normalizeAiLessonPlan({
      storyBeatCount: 4,
      quizGroups: [{ title: "Check", questionCount: 2 }],
      mediaSearchTerms: ["cat", "school"],
    });
    expect(p.storyBeatCount).toBe(4);
    expect(p.quizGroups).toEqual([{ title: "Check", questionCount: 2 }]);
    expect(p.mediaSearchTerms).toEqual(["cat", "school"]);
    expect(p.screenOutline).toBeUndefined();
  });

  it("derives quiz groups and story count from screenOutline", () => {
    const p = normalizeAiLessonPlan({
      storyBeatCount: 1,
      quizGroups: [{ title: "ignored", questionCount: 99 }],
      mediaSearchTerms: ["a"],
      screenOutline: [
        { kind: "story", summary: "open" },
        {
          kind: "interaction",
          subtype: "mc_quiz",
          quiz_group_title: "Quick check",
          summary: "q1",
        },
        {
          kind: "interaction",
          subtype: "true_false",
          quiz_group_title: "Quick check",
          summary: "q2",
        },
        { kind: "story", summary: "close" },
      ],
    });
    expect(p.storyBeatCount).toBe(2);
    expect(p.quizGroups).toEqual([{ title: "Quick check", questionCount: 2 }]);
    expect(p.screenOutline?.length).toBe(4);
  });

  it("preserves rich story pages (modes, phases, goal indices)", () => {
    const p = normalizeAiLessonPlan({
      storyBeatCount: 1,
      quizGroups: [{ title: "Q", questionCount: 1 }],
      mediaSearchTerms: [],
      screenOutline: [
        {
          kind: "story",
          summary: "Intro",
          learning_goal_indices: [0],
          pages: [
            {
              summary: "Scene A",
              interaction_mode: "tap_to_advance",
              phases: [{ intent: "Show title", transition: "on_click_item" }],
            },
            { summary: "Scene B", interaction_mode: "drag_match", learning_goal_indices: [1] },
          ],
        },
        { kind: "interaction", subtype: "mc_quiz", quiz_group_title: "Q", summary: "q" },
      ],
    });
    const story = p.screenOutline?.[0];
    expect(story?.kind).toBe("story");
    if (story?.kind !== "story") return;
    expect(story.pages?.length).toBe(2);
    expect(story.pages?.[0].interaction_mode).toBe("tap_to_advance");
    expect(story.pages?.[0].phases?.[0].transition).toBe("on_click_item");
    expect(story.pages?.[1].interaction_mode).toBe("drag_match");
  });
});

describe("formatStoryOutlineForMaterialization", () => {
  it("includes page modes, phases, and goal snippets", () => {
    const goals = ["Use past tense", "Name classroom objects"];
    const row = {
      kind: "story" as const,
      summary: "Review",
      learning_goal_indices: [0] as number[],
      pages: [
        {
          summary: "Drill",
          interaction_mode: "tap_to_advance" as const,
          phases: [{ intent: "Highlight verb", transition: "on_click_item" as const }],
        },
      ],
    };
    const text = formatStoryOutlineForMaterialization(row, goals);
    expect(text).toContain("Beat: Review");
    expect(text).toContain("interaction_mode: tap_to_advance");
    expect(text).toContain("→on_click_item");
    expect(text).toContain("[goal 0]");
    expect(text).toContain("past tense");
  });
});

describe("safeParseStoredLessonPlanMeta", () => {
  it("accepts legacy meta without screenOutline", () => {
    const p = safeParseStoredLessonPlanMeta({
      storyBeatCount: 3,
      quizGroups: [{ title: "Quiz", questionCount: 3 }],
      mediaSearchTerms: ["x", "y"],
    });
    expect(p).not.toBeNull();
    expect(p!.storyBeatCount).toBe(3);
  });

  it("returns null for invalid payload", () => {
    expect(safeParseStoredLessonPlanMeta(null)).toBeNull();
    expect(safeParseStoredLessonPlanMeta({ quizGroups: "nope" })).toBeNull();
    expect(safeParseStoredLessonPlanMeta({})).toBeNull();
  });
});

describe("storyFirstBlueprintSchema pedagogical page rules", () => {
  const baseBlueprint = {
    lesson_metadata: {
      lesson_title: "Weather mission",
      production_mode: "story_first",
    },
    cefr_level: "A1",
    target_age: { min_age: 7, max_age: 9 },
    learner_profile: {},
    learning_goals: ["Talk about weather", "Choose suitable clothes"],
    vocabulary_targets: [],
    grammar_targets: [],
    story_pattern_type: "daily_life",
    story_arc: {
      setup: "Rain starts suddenly.",
      goal_or_problem: "Help Mia pick clothes for weather.",
      resolution: "Mia chooses the right outfit.",
      recap: "Mia explains weather choices.",
    },
    characters: [],
    ordered_story_beats: [
      {
        beat_id: "b1",
        beat_order: 1,
        narrative_function: "guided_discovery",
        story_event: "Mia sees clouds and a weather controller.",
        language_introduced: { vocabulary: ["rainy", "umbrella"], phrases: ["It is rainy."] },
        grammar_modeled: { grammar_points: ["be + adjective"], model_sentences: ["It is rainy."] },
        pages: [
          {
            page_id: "b1p1",
            page_goal: "Notice weather clues",
            narrative_function: "setup",
          },
          {
            page_id: "b1p2",
            page_goal: "Press weather controller",
            narrative_function: "learner_action",
          },
          {
            page_id: "b1p3",
            page_goal: "See weather change",
            narrative_function: "consequence",
          },
        ],
        reinforcement: {
          activity_type: "mc_quiz",
          attached_to_beat_id: "b1",
          reason_for_activity_choice: "Quick check after in-scene interaction.",
        },
        progression_logic: {
          learner_should_now_know: ["rainy weather vocabulary"],
        },
      },
      {
        beat_id: "b2",
        beat_order: 2,
        narrative_function: "recap",
        story_event: "Mia and Leo recap what happened.",
        language_introduced: { vocabulary: [], phrases: [] },
        grammar_modeled: { grammar_points: [], model_sentences: [] },
        pages: [
          {
            page_id: "b2p1",
            page_goal: "Character reflection",
            narrative_function: "setup",
          },
          {
            page_id: "b2p2",
            page_goal: "Revisit key choices",
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
          learner_should_now_know: ["weather and clothing links"],
        },
      },
    ],
    wrap_up_recap: {
      story_return_required: true,
      recap_beat_id: "b2",
      vocabulary_recycled: ["rainy", "umbrella"],
      grammar_recycled: ["be + adjective"],
      final_success_moment: "Mia is ready for the weather.",
    },
  } as const;

  /** `as const` makes structuredClone()'s inferred type deeply readonly — relax for mutation tests. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod parses arbitrary JSON-shaped input
  function blueprintCloneMutable(): any {
    return structuredClone(baseBlueprint);
  }

  it("accepts beats with >=3 pages and post-page reinforcement timing", () => {
    const parsed = storyFirstBlueprintSchema.safeParse(baseBlueprint);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.ordered_story_beats[0]?.reinforcement?.timing).toBe(
      "after_final_page_completion",
    );
  });

  it("rejects beat page depth below 3 when pedagogical pages are used", () => {
    const bad = blueprintCloneMutable();
    bad.ordered_story_beats[0]!.pages = bad.ordered_story_beats[0]!.pages.slice(0, 2);
    const parsed = storyFirstBlueprintSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects recap beat page depth below 3", () => {
    const bad = blueprintCloneMutable();
    bad.ordered_story_beats[1]!.pages = bad.ordered_story_beats[1]!.pages.slice(0, 2);
    const parsed = storyFirstBlueprintSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects first/last page narrative function violations", () => {
    const bad = blueprintCloneMutable();
    bad.ordered_story_beats[0]!.pages[0]!.narrative_function = "learner_action";
    bad.ordered_story_beats[0]!.pages[2]!.narrative_function = "recap";
    const parsed = storyFirstBlueprintSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects reinforcement timing that is not post-final-page", () => {
    const bad = blueprintCloneMutable();
    if (bad.ordered_story_beats[0]?.reinforcement) {
      bad.ordered_story_beats[0].reinforcement.timing = "before_page_progression";
    }
    const parsed = storyFirstBlueprintSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("keeps legacy blueprint parseable when pages are omitted", () => {
    const legacy = blueprintCloneMutable();
    legacy.ordered_story_beats.forEach((beat: { pages?: unknown; reinforcement?: { timing?: string } }) => {
      delete beat.pages;
      if (beat.reinforcement) {
        delete beat.reinforcement.timing;
      }
    });
    const parsed = storyFirstBlueprintSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
  });
});

describe("storyScreenCountFromPlan and quizGroupsForSpecs", () => {
  it("uses outline when present", () => {
    const plan = normalizeAiLessonPlan({
      storyBeatCount: 9,
      quizGroups: [{ title: "Q", questionCount: 1 }],
      mediaSearchTerms: [],
      screenOutline: [{ kind: "story" }, { kind: "story" }, { kind: "story" }],
    });
    expect(storyScreenCountFromPlan(plan)).toBe(3);
    expect(quizGroupsForSpecs(plan)).toEqual([{ title: "Q", questionCount: 1 }]);
  });
});

// ---------------------------------------------------------------------------
// Phase orchestration blueprint — v1 schema tests
// ---------------------------------------------------------------------------

describe("phaseTriggerSchema", () => {
  it("accepts all v1 trigger types", () => {
    expect(phaseTriggerSchema.safeParse({ type: "auto_present" }).success).toBe(true);
    expect(phaseTriggerSchema.safeParse({ type: "on_click_item", target_item_id: "school_shirt" }).success).toBe(true);
    expect(phaseTriggerSchema.safeParse({ type: "all_matched" }).success).toBe(true);
    expect(phaseTriggerSchema.safeParse({ type: "sequence_complete", sequence_id: "collect_seq" }).success).toBe(true);
    expect(phaseTriggerSchema.safeParse({ type: "tap_group", group_id: "bathroom_pool" }).success).toBe(true);
    expect(phaseTriggerSchema.safeParse({ type: "end_phase" }).success).toBe(true);
  });

  it("rejects on_click_item without target_item_id", () => {
    expect(phaseTriggerSchema.safeParse({ type: "on_click_item" }).success).toBe(false);
  });

  it("rejects sequence_complete without sequence_id", () => {
    expect(phaseTriggerSchema.safeParse({ type: "sequence_complete" }).success).toBe(false);
    expect(phaseTriggerSchema.safeParse({ type: "tap_group" }).success).toBe(false);
  });

  it("rejects unknown trigger types (e.g. hotspot_unlock is deferred)", () => {
    expect(phaseTriggerSchema.safeParse({ type: "hotspot_unlock" }).success).toBe(false);
    expect(phaseTriggerSchema.safeParse({ type: "dialogue_complete" }).success).toBe(false);
  });
});

describe("phaseCompletionEffectSchema", () => {
  it("accepts all v1 completion effects", () => {
    expect(phaseCompletionEffectSchema.safeParse({ type: "end_phase" }).success).toBe(true);
    expect(phaseCompletionEffectSchema.safeParse({ type: "unlock_next_phase" }).success).toBe(true);
    expect(phaseCompletionEffectSchema.safeParse({ type: "unlock_next_page" }).success).toBe(true);
    expect(phaseCompletionEffectSchema.safeParse({ type: "unlock_next_page", show_continue_arrow: true }).success).toBe(true);
  });

  it("show_continue_arrow defaults to false when omitted", () => {
    const r = phaseCompletionEffectSchema.safeParse({ type: "unlock_next_page" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    if (r.data.type === "unlock_next_page") {
      expect(r.data.show_continue_arrow).toBe(false);
    }
  });

  it("rejects enable_continue_arrow as a top-level completion type (removed; use unlock_next_page + show_continue_arrow)", () => {
    expect(phaseCompletionEffectSchema.safeParse({ type: "enable_continue_arrow" }).success).toBe(false);
  });
});

describe("storyFirstBlueprintSchema — phase orchestration v1", () => {
  const makeBlueprint = (phases: unknown[] | undefined) => ({
    lesson_metadata: { lesson_title: "Test", production_mode: "story_first" },
    cefr_level: "A1",
    target_age: { min_age: 6, max_age: 8 },
    learner_profile: {},
    learning_goals: ["Identify classroom objects"],
    vocabulary_targets: [],
    grammar_targets: [],
    story_pattern_type: "school_day",
    story_arc: { setup: "S", goal_or_problem: "G", resolution: "R", recap: "C" },
    characters: [],
    ordered_story_beats: [
      {
        beat_id: "b1",
        beat_order: 1,
        narrative_function: "guided_discovery",
        story_event: "Ben finds clothes",
        language_introduced: { vocabulary: ["shirt"], phrases: [] },
        grammar_modeled: { grammar_points: [], model_sentences: [] },
        pages: [
          { page_id: "p1", page_goal: "Setup", narrative_function: "setup" },
          { page_id: "p2", page_goal: "Action", narrative_function: "learner_action", phases },
          { page_id: "p3", page_goal: "End", narrative_function: "consequence" },
        ],
        progression_logic: { learner_should_now_know: [] },
      },
      {
        beat_id: "b2",
        beat_order: 2,
        narrative_function: "recap",
        story_event: "Ben is ready",
        language_introduced: { vocabulary: [], phrases: [] },
        grammar_modeled: { grammar_points: [], model_sentences: [] },
        pages: [
          { page_id: "b2p1", page_goal: "Reflect", narrative_function: "setup" },
          { page_id: "b2p2", page_goal: "Review", narrative_function: "learner_action" },
          { page_id: "b2p3", page_goal: "Celebrate", narrative_function: "consequence" },
        ],
        progression_logic: { learner_should_now_know: [] },
      },
    ],
    wrap_up_recap: {
      story_return_required: true as const,
      recap_beat_id: "b2",
      vocabulary_recycled: [],
      grammar_recycled: [],
      final_success_moment: "Done",
    },
  });

  it("accepts full v1 orchestrated phases (trigger, success_response, failure_response, completion)", () => {
    const phases = [
      {
        phase_id: "intro",
        purpose: "Setup scene",
        trigger: { type: "auto_present" },
        completion: { type: "unlock_next_phase" },
      },
      {
        phase_id: "tap_shirt",
        purpose: "Tap the shirt",
        trigger: { type: "on_click_item", target_item_id: "school_shirt" },
        success_response: { dialogue: "Great! My shirt!" },
        failure_response: { dialogue: "Try again!" },
        completion: { type: "unlock_next_page", show_continue_arrow: true },
      },
    ];
    const r = storyFirstBlueprintSchema.safeParse(makeBlueprint(phases));
    expect(r.success).toBe(true);
    if (!r.success) return;
    const tapPhase = r.data.ordered_story_beats[0]?.pages?.[1]?.phases?.[1];
    expect(tapPhase?.success_response?.dialogue).toBe("Great! My shirt!");
    expect(tapPhase?.failure_response?.dialogue).toBe("Try again!");
    if (tapPhase?.completion?.type === "unlock_next_page") {
      expect(tapPhase.completion.show_continue_arrow).toBe(true);
    }
  });

  it("legacy phases (completion_rule only, no trigger) still parse", () => {
    const phases = [
      {
        phase_id: "old_phase",
        purpose: "Old style",
        interaction_intents: ["object_trigger"],
        completion_rule: "on_click_item",
      },
    ];
    const r = storyFirstBlueprintSchema.safeParse(makeBlueprint(phases));
    expect(r.success).toBe(true);
  });

  it("visit_all_pages is rejected at phase-level completion_rule", () => {
    const phases = [
      {
        phase_id: "bad",
        purpose: "Bad phase",
        interaction_intents: ["present_only"],
        completion_rule: "visit_all_pages",
      },
    ];
    const r = storyFirstBlueprintSchema.safeParse(makeBlueprint(phases));
    expect(r.success).toBe(false);
  });

  it("visit_all_pages is still accepted at beat_completion_rule", () => {
    const blueprint = makeBlueprint(undefined);
    (blueprint.ordered_story_beats[0] as Record<string, unknown>).beat_completion_rule = "visit_all_pages";
    const r = storyFirstBlueprintSchema.safeParse(blueprint);
    expect(r.success).toBe(true);
  });
});

describe("buildMaterializationSteps", () => {
  it("interleaves story and interaction with quiz specs", () => {
    const plan = normalizeAiLessonPlan({
      storyBeatCount: 2,
      quizGroups: [{ title: "G", questionCount: 1 }],
      mediaSearchTerms: [],
      screenOutline: [
        { kind: "story", summary: "a" },
        {
          kind: "interaction",
          subtype: "mc_quiz",
          quiz_group_title: "G",
          summary: "q",
        },
      ],
    });
    const specs = [{ id: "uuid-1", title: "G", questionCount: 1 }];
    const steps = buildMaterializationSteps(plan, specs);
    expect(steps).not.toBeNull();
    expect(steps!.length).toBe(2);
    expect(steps![0].kind).toBe("story");
    expect(steps![1].kind).toBe("interaction");
    if (steps![1].kind === "interaction") {
      expect(steps![1].slot.quiz_group_id).toBe("uuid-1");
      expect(steps![1].slot.subtype).toBe("mc_quiz");
    }
  });

  it("uses distinct quiz_group_id for two blocks with the same title (outline order)", () => {
    const plan = normalizeAiLessonPlan({
      storyBeatCount: 2,
      quizGroups: [],
      mediaSearchTerms: [],
      screenOutline: [
        { kind: "story", summary: "s1" },
        {
          kind: "interaction",
          subtype: "mc_quiz",
          quiz_group_title: "Quick check",
          summary: "q1",
        },
        {
          kind: "interaction",
          subtype: "mc_quiz",
          quiz_group_title: "Quick check",
          summary: "q2",
        },
        { kind: "story", summary: "s2" },
        {
          kind: "interaction",
          subtype: "true_false",
          quiz_group_title: "Quick check",
          summary: "q3",
        },
      ],
    });
    expect(plan.quizGroups).toEqual([
      { title: "Quick check", questionCount: 2 },
      { title: "Quick check", questionCount: 1 },
    ]);
    const specs = [
      { id: "uuid-a", title: "Quick check", questionCount: 2 },
      { id: "uuid-b", title: "Quick check", questionCount: 1 },
    ];
    const steps = buildMaterializationSteps(plan, specs);
    expect(steps).not.toBeNull();
    expect(steps!.length).toBe(5);
    expect(steps![1].kind).toBe("interaction");
    expect(steps![2].kind).toBe("interaction");
    expect(steps![4].kind).toBe("interaction");
    if (steps![1].kind === "interaction") {
      expect(steps![1].slot.quiz_group_id).toBe("uuid-a");
      expect(steps![1].slot.quiz_group_order).toBe(0);
    }
    if (steps![2].kind === "interaction") {
      expect(steps![2].slot.quiz_group_id).toBe("uuid-a");
      expect(steps![2].slot.quiz_group_order).toBe(1);
    }
    if (steps![4].kind === "interaction") {
      expect(steps![4].slot.quiz_group_id).toBe("uuid-b");
      expect(steps![4].slot.quiz_group_order).toBe(0);
    }
  });
});
