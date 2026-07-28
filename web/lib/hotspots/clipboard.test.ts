import { describe, expect, it } from "vitest";
import {
  buildHotspotClipboardPayload,
  insertHotspotClipboardPayload,
  offsetGeometry,
  parseHotspotClipboardPayload,
} from "./clipboard";
import { createBlankExploreHotspotsDocument } from "./fixtures/blankExploreHotspots";

describe("hotspot clipboard", () => {
  it("offsets rectangle geometry within bounds", () => {
    const next = offsetGeometry(
      { shape: "rectangle", x: 0.9, y: 0.9, width: 0.2, height: 0.2 },
      0.05,
      0.05,
    );
    expect(next).toEqual({
      shape: "rectangle",
      x: 0.8,
      y: 0.8,
      width: 0.2,
      height: 0.2,
    });
  });

  it("round-trips a hotspot payload with a new id", () => {
    const document = createBlankExploreHotspotsDocument();
    const payload = buildHotspotClipboardPayload(document, "hotspot-1");
    expect(payload?.hotspot.id).toBe("hotspot-1");
    expect(parseHotspotClipboardPayload(payload)).toEqual(payload);

    const inserted = insertHotspotClipboardPayload(document, payload!);
    expect(inserted.newId).not.toBe("hotspot-1");
    expect(
      inserted.document.layout.elements.some(
        (element) => element.kind === "hotspot" && element.id === inserted.newId,
      ),
    ).toBe(true);
    expect(
      inserted.document.interaction.dialogues.some(
        (dialogue) => dialogue.hotspotId === inserted.newId,
      ),
    ).toBe(true);
  });
});
