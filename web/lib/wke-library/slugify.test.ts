import { describe, expect, it } from "vitest";
import { slugifyLibraryTitle } from "@/lib/wke-library/map-row";

describe("slugifyLibraryTitle", () => {
  it("slugifies titles for contribution rows", () => {
    expect(slugifyLibraryTitle("Mia's Morning!")).toBe("mia-s-morning");
    expect(slugifyLibraryTitle("  ")).toBe("contribution");
  });
});
