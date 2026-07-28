import { describe, expect, it } from "vitest";
import { pickHotspotId, type PlayHotspot } from "@wke/explore-hotspots-play";

const target: PlayHotspot = {
  id: "mia",
  presentation: "target",
  interactionKind: "dialogue",
  geometry: { shape: "rectangle", x: 0.3, y: 0.2, width: 0.3, height: 0.5 },
};

const silentSprite: PlayHotspot = {
  id: "mia-prop",
  presentation: "sprite",
  interactionKind: "silent",
  tabOrder: 99,
  geometry: { shape: "rectangle", x: 0.32, y: 0.22, width: 0.25, height: 0.45 },
};

const audioSprite: PlayHotspot = {
  id: "clock-prop",
  presentation: "sprite",
  interactionKind: "audio",
  tabOrder: 100,
  geometry: { shape: "rectangle", x: 0.32, y: 0.22, width: 0.25, height: 0.45 },
};

describe("pickHotspotId sprite vs target", () => {
  it("prefers dialogue targets over silent sprites", () => {
    expect(pickHotspotId({ x: 0.4, y: 0.4 }, [target, silentSprite])).toBe("mia");
    expect(pickHotspotId({ x: 0.4, y: 0.4 }, [silentSprite, target])).toBe("mia");
  });

  it("prefers action sprites over overlapping dialogue targets", () => {
    expect(pickHotspotId({ x: 0.4, y: 0.4 }, [target, audioSprite])).toBe(
      "clock-prop",
    );
  });

  it("falls back to a silent sprite when no action hit", () => {
    expect(pickHotspotId({ x: 0.4, y: 0.4 }, [silentSprite])).toBe("mia-prop");
  });
});
