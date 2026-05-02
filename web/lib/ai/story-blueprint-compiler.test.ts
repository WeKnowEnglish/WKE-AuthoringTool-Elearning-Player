import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTO_DELAY_MS,
  compilePagePhases,
  compilePhaseTriggerToCompletion,
  compilePhaseDialogue,
  isTerminalPhase,
  type CompilerWarning,
} from "./story-blueprint-compiler";
import type { StoryPageBlueprint, StoryPhaseBlueprint } from "./ai-lesson-plan";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePhase(overrides: Partial<StoryPhaseBlueprint> = {}): StoryPhaseBlueprint {
  return {
    phase_id: "test_phase",
    purpose: "Test",
    ...overrides,
  };
}

function makePage(overrides: Partial<StoryPageBlueprint> = {}): StoryPageBlueprint {
  return {
    page_id: "page_1",
    page_goal: "Test page",
    narrative_function: "learner_action",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isTerminalPhase
// ---------------------------------------------------------------------------

describe("isTerminalPhase", () => {
  it("returns true for null nextPhaseId", () => {
    expect(isTerminalPhase(null)).toBe(true);
  });

  it("returns false for any non-null string", () => {
    expect(isTerminalPhase("next_phase")).toBe(false);
    expect(isTerminalPhase("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// compilePhaseTriggerToCompletion
// ---------------------------------------------------------------------------

describe("compilePhaseTriggerToCompletion", () => {
  describe("auto_present", () => {
    it("produces auto with DEFAULT_AUTO_DELAY_MS when next phase exists", () => {
      const result = compilePhaseTriggerToCompletion(
        { type: "auto_present" },
        "ph2",
      );
      expect(result).toEqual({
        type: "auto",
        delay_ms: DEFAULT_AUTO_DELAY_MS,
        next_phase_id: "ph2",
      });
    });

    it("produces end_phase when terminal (null nextPhaseId)", () => {
      const result = compilePhaseTriggerToCompletion({ type: "auto_present" }, null);
      expect(result).toEqual({ type: "end_phase" });
    });
  });

  describe("on_click_item", () => {
    it("produces on_click with target_item_id and next_phase_id", () => {
      const result = compilePhaseTriggerToCompletion(
        { type: "on_click_item", target_item_id: "school_shirt" },
        "ph_trousers",
      );
      expect(result).toEqual({
        type: "on_click",
        target_item_id: "school_shirt",
        next_phase_id: "ph_trousers",
      });
    });

    it("produces end_phase when terminal — prevents broken on_click with no next", () => {
      const result = compilePhaseTriggerToCompletion(
        { type: "on_click_item", target_item_id: "school_shirt" },
        null,
      );
      expect(result).toEqual({ type: "end_phase" });
    });
  });

  describe("all_matched", () => {
    it("produces all_matched with next_phase_id", () => {
      const result = compilePhaseTriggerToCompletion({ type: "all_matched" }, "ph_done");
      expect(result).toEqual({ type: "all_matched", next_phase_id: "ph_done" });
    });

    it("produces end_phase when terminal", () => {
      const result = compilePhaseTriggerToCompletion({ type: "all_matched" }, null);
      expect(result).toEqual({ type: "end_phase" });
    });
  });

  describe("sequence_complete", () => {
    it("produces sequence_complete with sequence_id and next_phase_id", () => {
      const result = compilePhaseTriggerToCompletion(
        { type: "sequence_complete", sequence_id: "collect_clothes_seq" },
        "ph_dressed",
      );
      expect(result).toEqual({
        type: "sequence_complete",
        sequence_id: "collect_clothes_seq",
        next_phase_id: "ph_dressed",
      });
    });

    it("produces end_phase when terminal", () => {
      const result = compilePhaseTriggerToCompletion(
        { type: "sequence_complete", sequence_id: "collect_clothes_seq" },
        null,
      );
      expect(result).toEqual({ type: "end_phase" });
    });
  });

  describe("end_phase trigger", () => {
    it("always produces end_phase even when nextPhaseId is non-null", () => {
      const result = compilePhaseTriggerToCompletion({ type: "end_phase" }, "ph_next");
      expect(result).toEqual({ type: "end_phase" });
    });

    it("produces end_phase when terminal", () => {
      const result = compilePhaseTriggerToCompletion({ type: "end_phase" }, null);
      expect(result).toEqual({ type: "end_phase" });
    });
  });

  describe("undefined trigger (legacy phases)", () => {
    it("falls back to end_phase — fails safe rather than auto-advancing incorrectly", () => {
      const result = compilePhaseTriggerToCompletion(undefined, "ph_next");
      expect(result).toEqual({ type: "end_phase" });
    });

    it("falls back to end_phase when also terminal", () => {
      const result = compilePhaseTriggerToCompletion(undefined, null);
      expect(result).toEqual({ type: "end_phase" });
    });
  });

  describe("terminal rule", () => {
    it("null nextPhaseId always produces end_phase regardless of trigger type", () => {
      const triggers = [
        { type: "auto_present" as const },
        { type: "on_click_item" as const, target_item_id: "btn" },
        { type: "all_matched" as const },
        { type: "sequence_complete" as const, sequence_id: "seq" },
        { type: "end_phase" as const },
      ] as const;

      for (const trigger of triggers) {
        expect(compilePhaseTriggerToCompletion(trigger, null)).toEqual({
          type: "end_phase",
        });
      }
    });
  });
});

// ---------------------------------------------------------------------------
// compilePhaseDialogue
// ---------------------------------------------------------------------------

describe("compilePhaseDialogue", () => {
  it("maps success_response.dialogue to dialogue.success", () => {
    const result = compilePhaseDialogue(
      makePhase({ success_response: { dialogue: "Great!" } }),
    );
    expect(result).toEqual({ success: "Great!" });
  });

  it("maps failure_response.dialogue to dialogue.error", () => {
    const result = compilePhaseDialogue(
      makePhase({ failure_response: { dialogue: "Try again!" } }),
    );
    expect(result).toEqual({ error: "Try again!" });
  });

  it("maps both success and failure together", () => {
    const result = compilePhaseDialogue(
      makePhase({
        success_response: { dialogue: "Great!" },
        failure_response: { dialogue: "Try again!" },
      }),
    );
    expect(result).toEqual({ success: "Great!", error: "Try again!" });
  });

  it("maps legacy character_dialogue to dialogue.start when success_response is absent", () => {
    const result = compilePhaseDialogue(
      makePhase({ character_dialogue: "Hello!" }),
    );
    expect(result).toEqual({ start: "Hello!" });
  });

  it("ignores character_dialogue when success_response is present (success_response wins)", () => {
    const result = compilePhaseDialogue(
      makePhase({
        character_dialogue: "Legacy line ignored",
        success_response: { dialogue: "Modern line used" },
      }),
    );
    expect(result).toEqual({ success: "Modern line used" });
    expect(result?.start).toBeUndefined();
  });

  it("returns undefined when all dialogue fields are absent", () => {
    expect(compilePhaseDialogue(makePhase())).toBeUndefined();
  });

  it("treats empty string as absent — does not emit empty dialogue fields", () => {
    const result = compilePhaseDialogue(
      makePhase({
        success_response: { dialogue: "" },
        failure_response: { dialogue: "  " },
        character_dialogue: "",
      }),
    );
    expect(result).toBeUndefined();
  });

  it("trims whitespace from dialogue values", () => {
    const result = compilePhaseDialogue(
      makePhase({ success_response: { dialogue: "  Well done!  " } }),
    );
    expect(result).toEqual({ success: "Well done!" });
  });
});

// ---------------------------------------------------------------------------
// CompilerWarning
// ---------------------------------------------------------------------------

describe("CompilerWarning", () => {
  it("supports structured warning fields", () => {
    const warning: CompilerWarning = {
      code: "MISSING_TRIGGER",
      message: "Missing trigger.",
      page_id: "page_1",
      phase_id: "intro",
    };

    expect(warning.code).toBe("MISSING_TRIGGER");
    expect(warning.message).toBe("Missing trigger.");
    expect(warning.page_id).toBe("page_1");
    expect(warning.phase_id).toBe("intro");
  });

  it("allows page_id and phase_id to be omitted", () => {
    const warning: CompilerWarning = {
      code: "EMPTY_PHASES",
      message: "No phases.",
    };

    expect(warning.page_id).toBeUndefined();
    expect(warning.phase_id).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// compilePagePhases
// ---------------------------------------------------------------------------

describe("compilePagePhases — basic compilation", () => {
  it("compiles a two-phase page with next links, start flag, click kind, and highlight", () => {
    const page = makePage({
      phases: [
        {
          phase_id: "intro",
          purpose: "Introduce the page",
          trigger: { type: "auto_present" },
          success_response: { dialogue: "Ben needs a shirt." },
        },
        {
          phase_id: "tap_shirt",
          purpose: "Tap the shirt",
          trigger: { type: "on_click_item", target_item_id: "school_shirt" },
          success_response: { dialogue: "Great! My shirt!" },
          failure_response: { dialogue: "Try again!" },
        },
      ],
    });

    const result = compilePagePhases(page);

    expect(result.warnings).toEqual([]);
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0]).toEqual({
      id: "intro",
      name: "Introduce the page",
      is_start: true,
      next_phase_id: "tap_shirt",
      completion: {
        type: "auto",
        delay_ms: DEFAULT_AUTO_DELAY_MS,
        next_phase_id: "tap_shirt",
      },
      dialogue: { success: "Ben needs a shirt." },
    });
    expect(result.phases[1]).toEqual({
      id: "tap_shirt",
      name: "Tap the shirt",
      is_start: false,
      completion: { type: "end_phase" },
      dialogue: { success: "Great! My shirt!", error: "Try again!" },
      kind: "click_to_advance",
      highlight_item_ids: ["school_shirt"],
    });
  });

  it("compiles a single terminal phase without next_phase_id", () => {
    const result = compilePagePhases(
      makePage({
        narrative_function: "consequence",
        phases: [
          {
            phase_id: "done",
            purpose: "End scene",
            trigger: { type: "end_phase" },
          },
        ],
      }),
    );

    expect(result.warnings).toEqual([]);
    expect(result.phases).toEqual([
      {
        id: "done",
        name: "End scene",
        is_start: true,
        completion: { type: "end_phase" },
      },
    ]);
    expect(result.phases[0]?.next_phase_id).toBeUndefined();
  });

  it("compiles a legacy phase with missing trigger as end_phase and warns", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          {
            phase_id: "legacy",
            purpose: "Old phase",
          },
        ],
      }),
    );

    expect(result.phases[0]?.completion).toEqual({ type: "end_phase" });
    expect(result.warnings).toContainEqual({
      code: "MISSING_TRIGGER",
      message: "Blueprint phase is missing trigger; compiler fell back to end_phase.",
      page_id: "page_1",
      phase_id: "legacy",
    });
  });
});

describe("compilePagePhases — warnings", () => {
  it("emits EMPTY_PHASES for learner_action page with no phases", () => {
    const result = compilePagePhases(makePage({ phases: [] }));

    expect(result.phases).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: "EMPTY_PHASES",
        message: "Learner-action page has no blueprint phases.",
        page_id: "page_1",
      },
    ]);
  });

  it("emits EMPTY_PHASES for learner_action page with omitted phases", () => {
    const result = compilePagePhases(makePage({ phases: undefined }));

    expect(result.phases).toEqual([]);
    expect(result.warnings[0]?.code).toBe("EMPTY_PHASES");
  });

  it("emits NO_LEARNER_ACTION_ON_LEARNER_PAGE when all triggers are auto/end", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          {
            phase_id: "intro",
            purpose: "Auto intro",
            trigger: { type: "auto_present" },
          },
          {
            phase_id: "done",
            purpose: "Done",
            trigger: { type: "end_phase" },
          },
        ],
      }),
    );

    expect(result.warnings).toContainEqual({
      code: "NO_LEARNER_ACTION_ON_LEARNER_PAGE",
      message: "Learner-action page has phases, but none require learner action.",
      page_id: "page_1",
    });
  });

  it("does not warn for setup page with no phases", () => {
    const result = compilePagePhases(
      makePage({
        narrative_function: "setup",
        phases: [],
      }),
    );

    expect(result.phases).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("emits MISSING_TRIGGER with correct page_id and phase_id", () => {
    const result = compilePagePhases(
      makePage({
        page_id: "page_2",
        phases: [{ phase_id: "phase_3", purpose: "Missing trigger" }],
      }),
    );

    expect(result.warnings).toContainEqual({
      code: "MISSING_TRIGGER",
      message: "Blueprint phase is missing trigger; compiler fell back to end_phase.",
      page_id: "page_2",
      phase_id: "phase_3",
    });
  });
});

describe("compilePagePhases — dialogue integration", () => {
  it("copies compiled success and failure dialogue onto output phase", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          {
            phase_id: "tap_shirt",
            purpose: "Tap shirt",
            trigger: { type: "on_click_item", target_item_id: "school_shirt" },
            success_response: { dialogue: "Great!" },
            failure_response: { dialogue: "Try again!" },
          },
        ],
      }),
    );

    expect(result.phases[0]?.dialogue).toEqual({
      success: "Great!",
      error: "Try again!",
    });
  });

  it("omits dialogue field when compiled dialogue is empty", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          {
            phase_id: "plain",
            purpose: "Plain",
            trigger: { type: "end_phase" },
          },
        ],
      }),
    );

    expect(result.phases[0]?.dialogue).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Compiler invariants
// ---------------------------------------------------------------------------

describe("compiler invariants", () => {
  it("terminal phases always produce end_phase — never a completion with next_phase_id", () => {
    const completions = [
      compilePhaseTriggerToCompletion({ type: "auto_present" }, null),
      compilePhaseTriggerToCompletion({ type: "on_click_item", target_item_id: "x" }, null),
      compilePhaseTriggerToCompletion({ type: "all_matched" }, null),
      compilePhaseTriggerToCompletion({ type: "sequence_complete", sequence_id: "s" }, null),
      compilePhaseTriggerToCompletion({ type: "end_phase" }, null),
      compilePhaseTriggerToCompletion(undefined, null),
    ];

    for (const c of completions) {
      expect(c.type).toBe("end_phase");
      expect("next_phase_id" in c).toBe(false);
    }
  });

  it("on_click_item never produces empty target_item_id", () => {
    const result = compilePhaseTriggerToCompletion(
      { type: "on_click_item", target_item_id: "school_shirt" },
      "ph_next",
    );
    if (result.type === "on_click") {
      expect(result.target_item_id.length).toBeGreaterThan(0);
    }
  });

  it("sequence_complete never produces empty sequence_id", () => {
    const result = compilePhaseTriggerToCompletion(
      { type: "sequence_complete", sequence_id: "my_seq" },
      "ph_next",
    );
    if (result.type === "sequence_complete") {
      expect(result.sequence_id.length).toBeGreaterThan(0);
    }
  });

  it("non-terminal auto_present uses DEFAULT_AUTO_DELAY_MS — not zero or negative", () => {
    const result = compilePhaseTriggerToCompletion({ type: "auto_present" }, "ph_next");
    if (result.type === "auto") {
      expect(result.delay_ms).toBe(DEFAULT_AUTO_DELAY_MS);
      expect(result.delay_ms).toBeGreaterThan(0);
    }
  });

  it("compilePhaseDialogue never emits empty string values", () => {
    const cases: Partial<StoryPhaseBlueprint>[] = [
      { success_response: { dialogue: "" } },
      { failure_response: { dialogue: "   " } },
      { character_dialogue: "\t" },
      { success_response: { dialogue: "" }, failure_response: { dialogue: "" } },
    ];

    for (const c of cases) {
      const result = compilePhaseDialogue(makePhase(c));
      if (result) {
        for (const val of Object.values(result)) {
          expect(typeof val === "string" && val.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("compilePagePhases never points next_phase_id to self", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          { phase_id: "a", purpose: "A", trigger: { type: "auto_present" } },
          { phase_id: "b", purpose: "B", trigger: { type: "auto_present" } },
          { phase_id: "c", purpose: "C", trigger: { type: "end_phase" } },
        ],
      }),
    );

    for (const phase of result.phases) {
      expect(phase.next_phase_id).not.toBe(phase.id);
    }
  });

  it("compilePagePhases links each non-last phase to the following phase id", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          { phase_id: "a", purpose: "A", trigger: { type: "auto_present" } },
          { phase_id: "b", purpose: "B", trigger: { type: "all_matched" } },
          { phase_id: "c", purpose: "C", trigger: { type: "end_phase" } },
        ],
      }),
    );

    expect(result.phases[0]?.next_phase_id).toBe("b");
    expect(result.phases[1]?.next_phase_id).toBe("c");
    expect(result.phases[2]?.next_phase_id).toBeUndefined();
  });

  it("compilePagePhases sets is_start true only on the first phase", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          { phase_id: "a", purpose: "A", trigger: { type: "auto_present" } },
          { phase_id: "b", purpose: "B", trigger: { type: "end_phase" } },
        ],
      }),
    );

    expect(result.phases.map((p) => p.is_start)).toEqual([true, false]);
  });

  it("compilePagePhases gives on_click_item phases non-empty highlight_item_ids", () => {
    const result = compilePagePhases(
      makePage({
        phases: [
          {
            phase_id: "tap",
            purpose: "Tap item",
            trigger: { type: "on_click_item", target_item_id: "school_shirt" },
          },
        ],
      }),
    );

    expect(result.phases[0]?.highlight_item_ids).toEqual(["school_shirt"]);
    expect(result.phases[0]?.highlight_item_ids?.[0]?.length).toBeGreaterThan(0);
  });

  it("compilePagePhases warning codes are never empty strings", () => {
    const result = compilePagePhases(
      makePage({
        phases: [{ phase_id: "legacy", purpose: "Legacy" }],
      }),
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    for (const warning of result.warnings) {
      expect(warning.code.trim().length).toBeGreaterThan(0);
    }
  });
});
