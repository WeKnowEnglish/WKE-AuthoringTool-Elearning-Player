import { describe, expect, it } from "vitest";
import {
  actionToResponseCard,
  resolveOnTapActions,
  responseCardToAction,
  syncResponseCardsFromOnTap,
} from "@/lib/wke-activity/on-tap-actions";
import type { WkeHotspotElement, WkeResponseCard } from "@/lib/wke-activity/types";

describe("on-tap-actions", () => {
  it("round-trips content cards through actions", () => {
    const cards: WkeResponseCard[] = [
      { id: "i1", kind: "info", text: "Hello" },
      { id: "a1", kind: "audio", audioUrl: "/a.mp3", label: "Listen" },
      { id: "d1", kind: "dialogue" },
      {
        id: "q1",
        kind: "question",
        prompt: "True?",
        questionType: "true_false",
        choices: [
          { id: "true", label: "True" },
          { id: "false", label: "False" },
        ],
        correctChoiceId: "true",
      },
    ];
    const actions = cards.map(responseCardToAction);
    expect(actions.map((a) => a.type)).toEqual([
      "show_info",
      "play_audio",
      "show_dialogue",
      "ask_question",
    ]);
    expect(actions.map(actionToResponseCard)).toEqual(cards);
  });

  it("prefers onTap over responseCards", () => {
    const hotspot = {
      id: "h1",
      kind: "hotspot" as const,
      regionId: "r1",
      geometry: { shape: "rectangle" as const, x: 0, y: 0, width: 0.2, height: 0.2 },
      responseCards: [{ id: "old", kind: "info" as const, text: "Old" }],
      onTap: [
        {
          id: "new",
          type: "play_audio" as const,
          audioUrl: "/x.mp3",
          wait: true,
        },
      ],
    } satisfies WkeHotspotElement;
    expect(resolveOnTapActions(hotspot)[0]?.type).toBe("play_audio");
  });

  it("syncs only content actions back to responseCards", () => {
    const cards = syncResponseCardsFromOnTap([
      { id: "a", type: "play_audio", audioUrl: "/a.mp3" },
      { id: "w", type: "wait", ms: 200 },
      { id: "e", type: "enter_object", targetId: "h1", to: { x: 0, y: 0, width: 0.2, height: 0.2 }, durationMs: 400 },
    ]);
    expect(cards).toEqual([{ id: "a", kind: "audio", audioUrl: "/a.mp3" }]);
  });
});
