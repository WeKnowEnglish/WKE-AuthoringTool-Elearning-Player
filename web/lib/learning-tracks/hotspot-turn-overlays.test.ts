import { describe, expect, it } from "vitest";
import { exploreHotspotsPayloadSchema } from "@/lib/lesson-schemas";
import {
  addHotspotDialogueTurnCard,
  applyHotspotTurnOverlays,
  listHotspotPanelsFromScreens,
  patchHotspotDialogueTurnCard,
  removeHotspotDialogueTurnCard,
} from "@/lib/learning-tracks/hotspot-turn-overlays";
import {
  applyExploreHotspotsBeatPresentation,
  loadFixture,
} from "@/lib/learning-tracks/resolve-beat-screens";
import type {
  LearningTrackBeatInstance,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";

describe("Explore Hotspots staged panels", () => {
  it("accepts speak_text and empty speaker on turns", () => {
    const screen = loadFixture("hobbies-hotspots")[0]!;
    const dialogues = Array.isArray(screen.dialogues)
      ? (screen.dialogues as Array<Record<string, unknown>>)
      : [];
    const withFlexible = {
      ...screen,
      dialogues: dialogues.map((dialogue, index) =>
        index === 0
          ? {
              ...dialogue,
              turns: [
                {
                  speaker: "",
                  text: "Tap to listen.",
                  speak_text: "Listen carefully.",
                },
                {
                  speaker: "Mia",
                  text: "I like drawing.",
                  audio_url: "https://cdn.example/mia.webm",
                },
              ],
            }
          : dialogue,
      ),
    };
    const parsed = exploreHotspotsPayloadSchema.parse(withFlexible);
    expect(parsed.dialogues[0]?.turns[0]?.speaker).toBe("");
    expect(parsed.dialogues[0]?.turns[0]?.speak_text).toBe("Listen carefully.");
    expect(parsed.dialogues[0]?.turns[1]?.audio_url).toBe(
      "https://cdn.example/mia.webm",
    );
  });

  it("replaces dialogue turns from staged panel cards", () => {
    const screens: LearningTrackScreenPayload[] = [
      {
        type: "interaction",
        subtype: "explore_hotspots",
        dialogues: [
          {
            id: "dialogue-mia-drawing",
            hotspot_id: "mia-drawing",
            title: "Mia",
            turns: [
              { speaker: "AJ", text: "Old?" },
              { speaker: "Mia", text: "Old answer." },
            ],
          },
        ],
      },
    ];
    const next = applyHotspotTurnOverlays(screens, {
      panelOverlays: [
        {
          dialogueId: "dialogue-mia-drawing",
          title: "Mia likes drawing",
          cards: [
            {
              id: "c1",
              type: "dialogue_turn",
              speaker: "Teacher",
              text: "What do you like?",
              speakText: "What do you like doing?",
            },
            {
              id: "c2",
              type: "dialogue_turn",
              speaker: "Mia",
              text: "I like drawing pictures.",
              audioUrl: "https://cdn.example/mia.webm",
            },
          ],
        },
      ],
    });
    const dialogue = (
      next[0]?.dialogues as Array<{
        title: string;
        turns: Array<{
          speaker: string;
          text: string;
          speak_text?: string;
          audio_url?: string;
        }>;
      }>
    )[0];
    expect(dialogue?.title).toBe("Mia likes drawing");
    expect(dialogue?.turns).toHaveLength(2);
    expect(dialogue?.turns[0]?.speak_text).toBe("What do you like doing?");
    expect(dialogue?.turns[1]?.audio_url).toBe("https://cdn.example/mia.webm");
  });

  it("adds and removes dialogue cards in LTC settings", () => {
    const screens = loadFixture("hobbies-hotspots");
    const panels = listHotspotPanelsFromScreens(screens);
    const mia = panels.find((panel) => panel.dialogueId === "dialogue-mia-drawing");
    expect(mia?.cards.length).toBe(2);

    let settings = addHotspotDialogueTurnCard(
      undefined,
      "dialogue-mia-drawing",
      mia!.cards,
      mia!.dialogueTitle,
    );
    expect(settings.panelOverlays?.[0]?.cards).toHaveLength(3);

    const removeId = settings.panelOverlays![0]!.cards[2]!.id;
    settings = removeHotspotDialogueTurnCard(
      settings,
      "dialogue-mia-drawing",
      removeId,
      settings.panelOverlays![0]!.cards,
      mia!.dialogueTitle,
    );
    expect(settings.panelOverlays?.[0]?.cards).toHaveLength(2);

    settings = patchHotspotDialogueTurnCard(
      settings,
      "dialogue-mia-drawing",
      settings.panelOverlays![0]!.cards[0]!.id,
      { text: "Hello there " },
      settings.panelOverlays![0]!.cards,
      mia!.dialogueTitle,
    );
    expect(
      settings.panelOverlays?.[0]?.cards.find((card) => card.type === "dialogue_turn")
        ?.text,
    ).toBe("Hello there ");
  });

  it("wires panel overlays through fixture beat resolve", () => {
    const beat: LearningTrackBeatInstance = {
      id: "beat-hotspots",
      kind: "explore_hotspots",
      source: { type: "fixture", fixtureId: "hobbies-hotspots" },
      presentation: {
        exploreHotspots: {
          panelOverlays: [
            {
              dialogueId: "dialogue-mia-drawing",
              cards: [
                {
                  id: "ask",
                  type: "dialogue_turn",
                  speaker: "AJ",
                  text: "What do you like doing?",
                },
                {
                  id: "answer",
                  type: "dialogue_turn",
                  speaker: "Mia",
                  text: "I like drawing.",
                  audioUrl: "https://cdn.example/mia-drawing.webm",
                },
              ],
            },
          ],
        },
      },
    };
    const screens = applyExploreHotspotsBeatPresentation(
      beat,
      loadFixture("hobbies-hotspots"),
    );
    const dialogue = (
      screens[0]?.dialogues as Array<{
        id: string;
        turns: Array<{ text: string; audio_url?: string }>;
      }>
    ).find((row) => row.id === "dialogue-mia-drawing");
    expect(dialogue?.turns).toHaveLength(2);
    expect(dialogue?.turns[1]?.audio_url).toBe(
      "https://cdn.example/mia-drawing.webm",
    );
  });
});
