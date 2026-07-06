import { describe, expect, it } from "vitest";
import {
  getPublishedGrammarModules,
  getPublishedGrammarSlugs,
  groupPublishedGrammarModulesByTopic,
} from "./load-catalog";

describe("loadGrammarCatalog helpers", () => {
  it("returns published modules sorted by sortOrder", () => {
    const modules = getPublishedGrammarModules();

    expect(modules.length).toBeGreaterThanOrEqual(8);
    expect(modules[0]?.slug).toBe("there-is-there-are-questions-a1");
    expect(modules[1]?.slug).toBe("there-is-there-are-affirmative-a1");
    expect(modules[2]?.slug).toBe("short-answers-there-is-a1");
    expect(modules.every((entry) => entry.status === "published")).toBe(true);
  });

  it("includes all published posters including plural A2", () => {
    const slugs = getPublishedGrammarSlugs();

    expect(slugs).not.toContain("draft-only-slug");
    expect(slugs).toContain("plural-spelling-a2");
    expect(slugs).toContain("plural-pronunciation-a2");
  });

  it("groups published modules by topicGroup", () => {
    const groups = groupPublishedGrammarModulesByTopic();

    expect(groups.some((group) => group.groupId === "there-is-there-are")).toBe(true);
    expect(groups.some((group) => group.groupId === "nouns")).toBe(true);
    expect(groups.some((group) => group.groupId === "quantifiers")).toBe(true);
  });
});
