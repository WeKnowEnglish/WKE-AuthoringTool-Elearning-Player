import { describe, expect, it } from "vitest";
import {
  applyListenItemOverlays,
  listListenItemsFromScreens,
  upsertListenItemOverlay,
} from "@/lib/learning-tracks/listen-item-overlays";
import {
  applyListenAndChooseBeatPresentation,
  loadFixture,
} from "@/lib/learning-tracks/resolve-beat-screens";
import type {
  LearningTrackBeatInstance,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";

describe("Listen & Choose overlays (Phase D)", () => {
  it("stamps prompt audio and auto_play by quiz_group_order", () => {
    const screens: LearningTrackScreenPayload[] = [
      {
        type: "interaction",
        subtype: "listen_and_choose",
        quiz_group_order: 0,
        dialog_text: "Hello",
        auto_play: false,
      },
      {
        type: "interaction",
        subtype: "listen_and_choose",
        quiz_group_order: 1,
        dialog_text: "World",
        auto_play: false,
      },
    ];
    const next = applyListenItemOverlays(screens, {
      itemOverlays: [
        {
          itemIndex: 1,
          promptAudioUrl: "https://cdn.example/q2.webm",
          autoPlay: true,
        },
      ],
    });
    expect(next[0]?.prompt_audio_url).toBeUndefined();
    expect(next[1]?.prompt_audio_url).toBe("https://cdn.example/q2.webm");
    expect(next[1]?.auto_play).toBe(true);
  });

  it("stamps question prompt body_text overlays", () => {
    const screens: LearningTrackScreenPayload[] = [
      {
        type: "interaction",
        subtype: "listen_and_choose",
        quiz_group_order: 0,
        body_text: "Old prompt?",
        dialog_text: "Hello",
      },
    ];
    const next = applyListenItemOverlays(screens, {
      itemOverlays: [{ itemIndex: 0, bodyText: "What is Mia doing?" }],
    });
    expect(next[0]?.body_text).toBe("What is Mia doing?");
  });

  it("keeps spaces while typing question prompts", () => {
    const overlays = upsertListenItemOverlay(undefined, 0, {
      bodyText: "What is ",
    });
    expect(overlays?.[0]?.bodyText).toBe("What is ");
  });

  it("lists editable items and upserts overlays", () => {
    const screens = loadFixture("hobbies-listen-choose");
    const items = listListenItemsFromScreens(screens);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.itemIndex).toBe(0);

    const overlays = upsertListenItemOverlay(undefined, 0, {
      promptAudioUrl: "https://cdn.example/mia.webm",
      autoPlay: true,
    });
    expect(overlays?.[0]).toEqual({
      itemIndex: 0,
      promptAudioUrl: "https://cdn.example/mia.webm",
      autoPlay: true,
    });
  });

  it("wires overlays through fixture beat resolve", () => {
    const beat: LearningTrackBeatInstance = {
      id: "beat-listen",
      kind: "listen_and_choose",
      source: { type: "fixture", fixtureId: "hobbies-listen-choose" },
      presentation: {
        listenAndChoose: {
          itemOverlays: [
            {
              itemIndex: 0,
              promptAudioUrl: "https://cdn.example/painting-dialog.webm",
              autoPlay: true,
            },
          ],
        },
      },
    };
    const screens = applyListenAndChooseBeatPresentation(
      beat,
      loadFixture("hobbies-listen-choose"),
    );
    expect(screens[0]?.prompt_audio_url).toBe(
      "https://cdn.example/painting-dialog.webm",
    );
    expect(screens[0]?.auto_play).toBe(true);
  });
});
