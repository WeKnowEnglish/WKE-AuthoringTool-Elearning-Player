import { describe, expect, it } from "vitest";
import { languageInFocusPayloadSchema } from "@/lib/lesson-schemas";
import {
  applyLifExampleOverlays,
  listLifExamplesFromScreens,
  upsertLifExampleOverlay,
} from "@/lib/learning-tracks/lif-example-overlays";
import {
  applyLanguageInFocusBeatPresentation,
  loadFixture,
} from "@/lib/learning-tracks/resolve-beat-screens";
import type {
  LearningTrackBeatInstance,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";

describe("Language in Focus listen audio (Phase F)", () => {
  it("accepts optional audio_url on examples", () => {
    const screen = loadFixture("hobbies-like-ing")[0]!;
    const examples = Array.isArray(screen.examples)
      ? (screen.examples as Array<Record<string, unknown>>)
      : [];
    const withAudio = {
      ...screen,
      examples: examples.map((example, index) =>
        index === 0
          ? { ...example, audio_url: "https://cdn.example/mia-listen.webm" }
          : example,
      ),
    };
    const parsed = languageInFocusPayloadSchema.parse(withAudio);
    expect(parsed.examples[0]?.audio_url).toBe(
      "https://cdn.example/mia-listen.webm",
    );
  });

  it("stamps example audio by example id", () => {
    const screens: LearningTrackScreenPayload[] = [
      {
        type: "interaction",
        subtype: "language_in_focus",
        examples: [
          {
            id: "ex-mia",
            tab_id: "mia",
            values: { person: "i" },
          },
          {
            id: "ex-leo",
            tab_id: "leo",
            values: { person: "i" },
          },
        ],
      },
    ];
    const next = applyLifExampleOverlays(screens, {
      exampleOverlays: [
        {
          exampleId: "ex-leo",
          audioUrl: "https://cdn.example/leo.webm",
        },
      ],
    });
    const examples = next[0]?.examples as Array<{ id: string; audio_url?: string }>;
    expect(examples.find((row) => row.id === "ex-mia")?.audio_url).toBeUndefined();
    expect(examples.find((row) => row.id === "ex-leo")?.audio_url).toBe(
      "https://cdn.example/leo.webm",
    );
  });

  it("lists examples from the hobbies fixture and upserts overlays", () => {
    const screens = loadFixture("hobbies-like-ing");
    const examples = listLifExamplesFromScreens(screens);
    expect(examples.map((row) => row.exampleId)).toEqual(["ex-mia", "ex-leo"]);

    const overlays = upsertLifExampleOverlay(undefined, "ex-mia", {
      audioUrl: "https://cdn.example/mia.webm",
    });
    expect(overlays?.[0]).toEqual({
      exampleId: "ex-mia",
      audioUrl: "https://cdn.example/mia.webm",
    });
  });

  it("wires overlays through fixture beat resolve", () => {
    const beat: LearningTrackBeatInstance = {
      id: "beat-lif",
      kind: "language_in_focus",
      source: { type: "fixture", fixtureId: "hobbies-like-ing" },
      presentation: {
        languageInFocus: {
          exampleOverlays: [
            {
              exampleId: "ex-mia",
              audioUrl: "https://cdn.example/mia-i-like-drawing.webm",
            },
          ],
        },
      },
    };
    const screens = applyLanguageInFocusBeatPresentation(
      beat,
      loadFixture("hobbies-like-ing"),
    );
    const examples = screens[0]?.examples as Array<{
      id: string;
      audio_url?: string;
    }>;
    expect(examples.find((row) => row.id === "ex-mia")?.audio_url).toBe(
      "https://cdn.example/mia-i-like-drawing.webm",
    );
  });
});
