import { describe, expect, it } from "vitest";
import { STARTER_HOUSE, normalizeHouseLayout } from "./house-normalize";
import { canPlaceItem, snapItem, snapToGrid } from "./house-grid";
import { furnitureWalls } from "./house-collision";
import { cameraPose, setCameraPreset, turnCamera, zoomCamera } from "./house-camera";
import type { HousePlacedItem } from "./house-types";

describe("normalizeHouseLayout", () => {
  it("keeps the starter fridge on wood and stripes", () => {
    expect(STARTER_HOUSE.floor).toBe("wood");
    expect(STARTER_HOUSE.walls).toBe("stripes");
    expect(STARTER_HOUSE.items).toHaveLength(1);
    expect(STARTER_HOUSE.items[0]?.kind).toBe("fridge");
  });

  it("drops unknown furniture and clamps rot", () => {
    const layout = normalizeHouseLayout({
      floor: "marble",
      walls: "stripes",
      items: [{ id: "a", kind: "spaceship", x: 1, z: 1, rot: 9 }],
    });
    expect(layout.floor).toBe("wood");
    expect(layout.items).toHaveLength(0);
  });
});

describe("house grid", () => {
  it("snaps to half-meter cells", () => {
    expect(snapToGrid(1.24)).toBe(1);
    expect(snapToGrid(1.26)).toBe(1.5);
  });

  it("blocks the doorway", () => {
    const chair: HousePlacedItem = { id: "chair", kind: "chair", x: 0, z: 4, rot: 0 };
    expect(canPlaceItem([], chair)).toBe("door");
  });

  it("lets the starter fridge sit in the back corner", () => {
    const fridge = STARTER_HOUSE.items[0]!;
    expect(canPlaceItem([], fridge)).toBeNull();
  });

  it("stops two beds occupying the same cells", () => {
    const first: HousePlacedItem = { id: "a", kind: "bed", ...snapItem("bed", -2, -1, 0), rot: 0 };
    const second: HousePlacedItem = { id: "b", kind: "bed", ...snapItem("bed", -2, -1, 0), rot: 0 };
    expect(canPlaceItem([first], second)).toBe("overlap");
  });

  it("lets a rug sit under a table", () => {
    const table: HousePlacedItem = { id: "t", kind: "table", ...snapItem("table", 0, 0, 0), rot: 0 };
    const rug: HousePlacedItem = { id: "r", kind: "rug", ...snapItem("rug", 0, 0, 0), rot: 0 };
    expect(canPlaceItem([table], rug)).toBeNull();
  });
});

describe("furniture walls", () => {
  it("builds a walk collider for the fridge, not the rug", () => {
    const layout = normalizeHouseLayout({
      ...STARTER_HOUSE,
      items: [
        ...STARTER_HOUSE.items,
        { id: "rug", kind: "rug", x: 0, z: 0, rot: 0 },
      ],
    });
    expect(furnitureWalls(layout)).toHaveLength(1);
  });
});

describe("designer camera", () => {
  it("turns in 45 degree steps from the door view", () => {
    const door = setCameraPreset({ preset: "corner", turn: 2, zoom: 1 }, "door");
    expect(door.turn).toBe(0);
    const turned = turnCamera(door, 1);
    const pose = cameraPose(turned);
    expect(pose.position[0]).toBeGreaterThan(0);
  });

  it("clamps zoom to three steps", () => {
    const far = zoomCamera({ preset: "corner", turn: 0, zoom: 0 }, -1);
    expect(far.zoom).toBe(0);
    const close = zoomCamera({ preset: "corner", turn: 0, zoom: 2 }, 1);
    expect(close.zoom).toBe(2);
  });
});
