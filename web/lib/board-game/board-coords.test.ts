import { describe, expect, it } from "vitest";
import {
  elementCenterWithin,
  elementTopLeftWithin,
  pawnAnchorWithin,
  pawnTopLeftFromAnchor,
} from "@/lib/board-game/board-coords";

function mockElement(options: {
  offsetLeft: number;
  offsetTop: number;
  offsetWidth: number;
  offsetHeight: number;
  offsetParent: HTMLElement | null;
}): HTMLElement {
  return options as unknown as HTMLElement;
}

describe("elementCenterWithin", () => {
  it("returns center coordinates relative to the container", () => {
    const container = mockElement({
      offsetLeft: 0,
      offsetTop: 0,
      offsetWidth: 500,
      offsetHeight: 400,
      offsetParent: null,
    });
    const row = mockElement({
      offsetLeft: 5,
      offsetTop: 15,
      offsetWidth: 200,
      offsetHeight: 100,
      offsetParent: container,
    });
    const tile = mockElement({
      offsetLeft: 20,
      offsetTop: 10,
      offsetWidth: 100,
      offsetHeight: 80,
      offsetParent: row,
    });

    expect(elementCenterWithin(tile, container)).toEqual({
      x: 5 + 20 + 50,
      y: 15 + 10 + 40,
    });
  });
});

describe("elementTopLeftWithin", () => {
  it("returns top-left coordinates relative to the container", () => {
    const container = mockElement({
      offsetLeft: 0,
      offsetTop: 0,
      offsetWidth: 500,
      offsetHeight: 400,
      offsetParent: null,
    });
    const tile = mockElement({
      offsetLeft: 30,
      offsetTop: 40,
      offsetWidth: 100,
      offsetHeight: 80,
      offsetParent: container,
    });

    expect(elementTopLeftWithin(tile, container)).toEqual({ x: 30, y: 40 });
  });
});

describe("pawnAnchorWithin", () => {
  it("anchors pawns near the bottom center of a tile", () => {
    const board = mockElement({
      offsetLeft: 0,
      offsetTop: 0,
      offsetWidth: 500,
      offsetHeight: 400,
      offsetParent: null,
    });
    const tile = mockElement({
      offsetLeft: 10,
      offsetTop: 20,
      offsetWidth: 100,
      offsetHeight: 80,
      offsetParent: board,
    });

    expect(pawnAnchorWithin(tile, board, 4, 32)).toEqual({
      x: 10 + 50 + 4,
      y: 20 + 80 - 16 - 4,
    });
  });
});

describe("pawnTopLeftFromAnchor", () => {
  it("converts anchor point to pawn top-left position", () => {
    expect(pawnTopLeftFromAnchor({ x: 100, y: 200 }, 40, 32)).toEqual({
      left: 80,
      top: 184,
    });
  });
});
