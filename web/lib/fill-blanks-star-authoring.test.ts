import { describe, expect, it } from "vitest";
import {
  payloadToStarredText,
  starredTextToPayload,
} from "./fill-blanks-star-authoring";

describe("starredTextToPayload", () => {
  it("builds template and blanks with synonyms", () => {
    const r = starredTextToPayload("The *cat|kitty* sat on the *mat*.");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.template).toBe("The __1__ sat on the __2__.");
    expect(r.blanks).toEqual([
      { id: "1", acceptable: ["cat", "kitty"] },
      { id: "2", acceptable: ["mat"] },
    ]);
  });

  it("errors on no blanks", () => {
    const r = starredTextToPayload("No blanks here.");
    expect(r.ok).toBe(false);
  });
});

describe("payloadToStarredText round-trip", () => {
  it("restores asterisk text from legacy payload", () => {
    const template = "Hello __1__ welcome to __2__.";
    const blanks = [
      { id: "1", acceptable: ["and", "And"] },
      { id: "2", acceptable: ["school"] },
    ];
    const starred = payloadToStarredText(template, blanks);
    const back = starredTextToPayload(starred);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.template).toBe(template);
    expect(back.blanks).toEqual(blanks);
  });
});
