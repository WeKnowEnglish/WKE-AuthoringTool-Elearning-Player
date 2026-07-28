import { describe, expect, it } from "vitest";
import { validateExploreHotspotsDocument } from "../studio";
import {
  createCoverAndExploreStarterDocument,
  createVocabBoardStarterDocument,
} from "./libraryStarters";

describe("library starters", () => {
  it("validates cover-and-explore starter", () => {
    const doc = validateExploreHotspotsDocument(createCoverAndExploreStarterDocument());
    expect(doc.name).toBe("Cover + Explore starter");
    expect(doc.interaction.phases?.length).toBe(2);
    expect(doc.layout.elements.filter((el) => el.kind === "hotspot")).toHaveLength(4);
  });

  it("validates vocab-board starter", () => {
    const doc = validateExploreHotspotsDocument(createVocabBoardStarterDocument());
    expect(doc.name).toBe("Vocab board starter");
    expect(doc.layout.elements.filter((el) => el.kind === "hotspot")).toHaveLength(6);
  });
});
