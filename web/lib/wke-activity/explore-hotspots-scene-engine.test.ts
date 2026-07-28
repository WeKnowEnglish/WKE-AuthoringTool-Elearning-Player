import { describe, expect, it } from "vitest";
import hobbiesActivity from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import { parseScreenPayload } from "@/lib/lesson-schemas";
import {
  parseWkeActivity,
  wkeActivityToExploreHotspotsPayload,
} from "@/lib/wke-activity";

describe("explore-hotspots scene engine schema", () => {
  it("still parses the flat hobbies fixture", () => {
    const activity = parseWkeActivity(hobbiesActivity);
    expect(activity.interaction.phases).toBeUndefined();
    const payload = wkeActivityToExploreHotspotsPayload(hobbiesActivity);
    expect(payload.phases).toBeUndefined();
    expect(payload.hotspots).toHaveLength(4);
    expect(parseScreenPayload("interaction", payload)?.subtype).toBe("explore_hotspots");
  });

  it("parses a two-phase activity with response cards and objective", () => {
    const base = structuredClone(hobbiesActivity) as Record<string, unknown>;
    const layout = base.layout as {
      elements: Array<Record<string, unknown>>;
    };
    const assets = base.assets as Array<Record<string, unknown>>;
    const firstHotspot = layout.elements.find((el) => el.kind === "hotspot")!;
    const secondHotspot = layout.elements.filter((el) => el.kind === "hotspot")[1]!;

    assets.push({
      id: "phase-2-image",
      kind: "image",
      src: "/pilots/explore-hotspots/phase-2.png",
      intrinsicSize: { width: 800, height: 450 },
    });

    firstHotspot.interactionKind = "question";
    firstHotspot.orderIndex = 0;
    firstHotspot.responseCards = [
      {
        id: "q1",
        kind: "question",
        prompt: "What is this?",
        questionType: "mc",
        choices: [
          { id: "a", label: "A clock" },
          { id: "b", label: "A bag" },
        ],
        correctChoiceId: "a",
        gateDiscover: true,
      },
    ];
    secondHotspot.orderIndex = 1;
    secondHotspot.initialState = "locked";
    secondHotspot.wrongOrderHint = "Find the first object first.";

    const interaction = base.interaction as Record<string, unknown>;
    interaction.phases = [
      {
        id: "phase-1",
        title: "Morning",
        imageAssetId: (layout.elements.find((el) => el.kind === "media") as { assetId: string })
          .assetId,
        hotspotIds: [firstHotspot.id],
      },
      {
        id: "phase-2",
        title: "Ready for school",
        imageAssetId: "phase-2-image",
        hotspotIds: [secondHotspot.id],
      },
    ];
    interaction.objective = { label: "Help Mia get ready" };
    interaction.strictOrder = true;
    interaction.hintPulseEnabled = true;

    const activity = parseWkeActivity(base);
    expect(activity.interaction.phases).toHaveLength(2);
    expect(activity.interaction.strictOrder).toBe(true);

    const payload = wkeActivityToExploreHotspotsPayload(base);
    expect(payload.phases).toHaveLength(2);
    expect(payload.phases?.[1]?.image_url).toContain("phase-2.png");
    expect(payload.objective?.label).toBe("Help Mia get ready");
    expect(payload.strict_order).toBe(true);
    expect(payload.hotspots[0]?.response_cards?.[0]?.kind).toBe("question");
    expect(payload.hotspots[0]?.on_tap?.[0]?.type).toBe("ask_question");
    expect(parseScreenPayload("interaction", payload)?.subtype).toBe("explore_hotspots");
  });

  it("parses a sprite PNG object without dialogue or cards", () => {
    const base = structuredClone(hobbiesActivity) as Record<string, unknown>;
    const layout = base.layout as { elements: Array<Record<string, unknown>> };
    const assets = base.assets as Array<Record<string, unknown>>;
    assets.push({
      id: "toothbrush-png",
      kind: "image",
      src: "/sprites/toothbrush.png",
      intrinsicSize: { width: 120, height: 320 },
    });
    layout.elements.push({
      id: "toothbrush",
      kind: "hotspot",
      regionId: "main-media",
      name: "Toothbrush",
      accessibleLabel: "Toothbrush",
      geometry: { shape: "rectangle", x: 0.2, y: 0.5, width: 0.08, height: 0.2 },
      tabOrder: 5,
      required: true,
      presentation: "sprite",
      spriteAssetId: "toothbrush-png",
      interactionKind: "silent",
    });
    const interaction = base.interaction as { phases: unknown[] };
    interaction.phases = [
      {
        id: "phase-1",
        title: "Morning",
        imageAssetId: (
          layout.elements.find((el) => el.kind === "media") as { assetId: string }
        ).assetId,
        hotspotIds: layout.elements
          .filter((el) => el.kind === "hotspot")
          .map((el) => el.id as string),
      },
    ];

    const activity = parseWkeActivity(base);
    expect(activity.layout.elements.filter((el) => el.kind === "hotspot")).toHaveLength(5);

    const payload = wkeActivityToExploreHotspotsPayload(base);
    const sprite = payload.hotspots.find((h) => h.id === "toothbrush");
    expect(sprite?.presentation).toBe("sprite");
    expect(sprite?.sprite_url).toContain("toothbrush.png");
    expect(sprite?.interaction_kind).toBe("silent");
  });
});
