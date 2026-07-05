import { describe, expect, it } from "vitest";
import { grammarCatalogSchema } from "./catalog-schema";

describe("grammarCatalogSchema", () => {
  it("parses the runtime catalog", async () => {
    const catalogModule = await import("@/content/grammar/catalog.json");
    const catalog = grammarCatalogSchema.parse(catalogModule.default);

    expect(catalog.version).toBe(1);
    expect(catalog.modules.length).toBeGreaterThanOrEqual(2);
    expect(catalog.modules.some((entry) => entry.slug === "there-is-there-are-questions-a1")).toBe(
      true,
    );
    expect(
      catalog.modules.some((entry) => entry.slug === "there-is-there-are-affirmative-a1"),
    ).toBe(true);
  });

  it("rejects duplicate slugs", () => {
    const result = grammarCatalogSchema.safeParse({
      version: 1,
      modules: [
        {
          slug: "test-a1",
          title: "Test",
          file: "a.json",
          status: "published",
        },
        {
          slug: "test-a1",
          title: "Test 2",
          file: "b.json",
          status: "draft",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects catalog.json as a module file", () => {
    const result = grammarCatalogSchema.safeParse({
      version: 1,
      modules: [
        {
          slug: "test-a1",
          title: "Test",
          file: "catalog.json",
          status: "published",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
