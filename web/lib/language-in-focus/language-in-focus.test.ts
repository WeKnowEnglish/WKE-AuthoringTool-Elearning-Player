import { describe, expect, it } from "vitest";
import hobbiesFixture from "@/content/pilots/language-in-focus/hobbies-like-ing.json";
import playgroundFixture from "@/content/pilots/language-in-focus/playground-can-cant.json";
import {
  buildSentenceWordBank,
  fillTemplate,
  nextSlotOptionId,
  optionsForSlot,
  remixOptionIdsForRole,
  resolveBubbleText,
  resolveBuildValues,
  resolveSentence,
  shuffleWithSeed,
} from "@/lib/language-in-focus";
import {
  languageInFocusPayloadSchema,
  parseScreenPayload,
} from "@/lib/lesson-schemas";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";

describe("language-in-focus resolve", () => {
  it("fills role tokens in templates", () => {
    expect(
      fillTemplate("{person} {feeling} {activity}.", {
        person: "I",
        feeling: "like",
        activity: "drawing",
      }),
    ).toBe("I like drawing.");
  });

  it("builds bubble text from template and override", () => {
    expect(
      resolveBubbleText({
        bubbleTemplate: "{tab}: {sentence}",
        tabLabel: "Mia",
        sentence: "I like drawing.",
      }),
    ).toBe("Mia: I like drawing.");
    expect(
      resolveBubbleText({
        bubbleTemplate: "{tab}: {sentence}",
        tabLabel: "Mia",
        sentence: "I like drawing.",
        textOverride: "Mia: I love art!",
      }),
    ).toBe("Mia: I love art!");
  });

  it("cycles slot options", () => {
    const bank = {
      role: "activity" as const,
      options: [
        { id: "a", label: "drawing" },
        { id: "b", label: "dancing" },
        { id: "c", label: "draw" },
      ],
    };
    expect(nextSlotOptionId(bank, "a")).toBe("b");
    expect(nextSlotOptionId(bank, "b")).toBe("c");
    expect(nextSlotOptionId(bank, "a", ["a", "b"])).toBe("b");
    expect(nextSlotOptionId(bank, "b", ["a", "b"])).toBe("a");
    expect(nextSlotOptionId(bank, "c", ["a", "b"])).toBe("a");
  });

  it("filters remix options and inherits chooser ids for cycle", () => {
    const bank = {
      role: "activity" as const,
      options: [
        { id: "drawing", label: "drawing" },
        { id: "draw", label: "draw" },
        { id: "dancing", label: "dancing" },
      ],
    };
    expect(optionsForSlot(bank, ["drawing", "dancing"]).map((o) => o.id)).toEqual([
      "drawing",
      "dancing",
    ]);
    expect(
      remixOptionIdsForRole(
        [
          {
            type: "slot_chooser",
            role: "activity",
            option_ids: ["drawing", "dancing"],
          },
        ],
        "activity",
      ),
    ).toEqual(["drawing", "dancing"]);
  });

  it("builds a two-choice bank from build_choices", () => {
    const cards = buildSentenceWordBank({
      chunks: [
        { id: "c1", role: "person", label: "Person" },
        { id: "c2", role: "feeling", label: "Feeling" },
        { id: "c3", role: "activity", label: "Activity" },
      ],
      slotBanks: [
        {
          role: "person",
          options: [
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
            { id: "drawing", label: "drawing" },
            { id: "draw", label: "draw" },
          ],
        },
      ],
      targetValues: { person: "she", feeling: "likes", activity: "drawing" },
      choicesByRole: {
        person: ["she", "he"],
        feeling: ["like", "likes"],
        activity: ["drawing", "draw"],
      },
    });
    expect(cards).toHaveLength(6);
    expect(cards.filter((c) => c.role === "activity").map((c) => c.id).sort()).toEqual([
      "draw",
      "drawing",
    ]);
  });

  it("shuffles deterministically by seed", () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffleWithSeed(items, "a")).toEqual(shuffleWithSeed(items, "a"));
    expect(shuffleWithSeed(items, "a")).not.toEqual(shuffleWithSeed(items, "b"));
  });
});

describe("language-in-focus hobbies fixture", () => {
  it("parses layered hobbies activity", () => {
    const parsed = languageInFocusPayloadSchema.parse(hobbiesFixture);
    expect(parsed.subtype).toBe("language_in_focus");
    expect(parsed.layers?.[0]?.type).toBe("listen_and_build");
    expect(parsed.layers?.[1]?.type).toBe("workbench");
    expect(parsed.completion.type).toBe("complete_all_layers");

    const mia = parsed.examples.find((e) => e.tab_id === "mia")!;
    expect(
      resolveSentence(
        parsed.sentence_template,
        mia.values,
        parsed.chunks,
        parsed.slot_banks,
      ),
    ).toBe("I like drawing.");
    expect(
      resolveSentence(
        parsed.sentence_template,
        resolveBuildValues(mia),
        parsed.chunks,
        parsed.slot_banks,
      ),
    ).toBe("She likes drawing.");

    const screen = parseScreenPayload("interaction", hobbiesFixture);
    expect(screen?.type).toBe("interaction");
    if (screen?.type === "interaction") {
      expect(screen.subtype).toBe("language_in_focus");
    }
  });

  it("uses listen values when build_values omitted", () => {
    expect(
      resolveBuildValues({
        values: { person: "i", feeling: "like", activity: "drawing" },
      }),
    ).toEqual({ person: "i", feeling: "like", activity: "drawing" });
  });

  it("parses can/can't playground fixture", () => {
    const parsed = languageInFocusPayloadSchema.parse(playgroundFixture);
    expect(parsed.pattern_id).toBe("can-cant");
    expect(parsed.chunks.map((c) => c.role)).toEqual(["subject", "modal", "verb"]);
    expect(parsed.morphology?.highlight_words).toContain("can't");
    expect(
      resolveSentence(
        parsed.sentence_template,
        parsed.examples[0]!.values,
        parsed.chunks,
        parsed.slot_banks,
      ),
    ).toBe("I can swim.");
  });

  it("teacher template parses", () => {
    const raw = rawInteractionTemplateForSubtype("language_in_focus");
    expect(() => languageInFocusPayloadSchema.parse(raw)).not.toThrow();
  });

  it("rejects cycle_slot without cycle_role", () => {
    const bad = {
      ...hobbiesFixture,
      layers: [
        {
          type: "workbench",
          id: "bad",
          elements: [
            {
              type: "action_row",
              actions: ["cycle_slot"],
            },
          ],
        },
      ],
    };
    const result = languageInFocusPayloadSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
