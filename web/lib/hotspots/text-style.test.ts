import { describe, expect, it } from "vitest";
import {
  resolveTextStyle,
  textAnchorForAlign,
  textFontSize,
  textXForAlign,
} from "@wke/explore-hotspots-play";

describe("textStyle helpers", () => {
  it("defaults role and align", () => {
    expect(resolveTextStyle(undefined)).toEqual({ role: "body", align: "center" });
  });

  it("maps role to font size bands", () => {
    expect(textFontSize(0.1, 1000, "caption")).toBeLessThan(
      textFontSize(0.1, 1000, "body"),
    );
    expect(textFontSize(0.1, 1000, "body")).toBeLessThan(
      textFontSize(0.1, 1000, "title"),
    );
  });

  it("maps align to anchor and x", () => {
    const geometry = { x: 0.2, y: 0.3, width: 0.4, height: 0.1 };
    expect(textAnchorForAlign("left")).toBe("start");
    expect(textAnchorForAlign("right")).toBe("end");
    expect(textXForAlign(geometry, 1000, "left")).toBeCloseTo(200);
    expect(textXForAlign(geometry, 1000, "center")).toBeCloseTo(400);
    expect(textXForAlign(geometry, 1000, "right")).toBeCloseTo(600);
  });
});
