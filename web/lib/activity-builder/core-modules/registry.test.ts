import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import {
  CORE_MODULE_IDS,
  compileCoreModule,
  exportCoreModuleToLessonPlayer,
  getCoreModule,
  getCoreModuleGradingPolicy,
  listCoreModules,
} from "@/lib/activity-builder/core-modules";

describe("core module registry", () => {
  it("lists the V1 vocab-compile modules", () => {
    const modules = listCoreModules();
    expect(modules.map((m) => m.meta.id)).toEqual([...CORE_MODULE_IDS]);
    expect(modules).toHaveLength(CORE_MODULE_IDS.length);
    for (const definition of modules) {
      expect(definition.meta.beatKind).toBe(definition.meta.id);
      expect(definition.meta.title.trim().length).toBeGreaterThan(0);
      expect(["automatic", "completion"]).toContain(
        getCoreModuleGradingPolicy(definition.meta.id),
      );
      expect(getCoreModuleGradingPolicy(definition.meta.id)).not.toBe("teacher_review");
    }
  });

  it("compiles and exports each module through the registry", () => {
    const list = createBakeryVocabularyListDocument();
    list.entries = list.entries.map((entry) => ({
      ...entry,
      imageUrl: entry.imageUrl ?? `https://example.com/${entry.id}.png`,
    }));
    for (const id of CORE_MODULE_IDS) {
      const result = compileCoreModule(id, { list, formats: [id] });
      expect(result.format).toBe(id);
      expect(result.itemCount).toBeGreaterThan(0);
      expect(result.label).toBe(getCoreModule(id).meta.title);

      const pack = exportCoreModuleToLessonPlayer(id, result.document) as {
        screens?: unknown[];
      };
      expect(Array.isArray(pack.screens)).toBe(true);
      expect((pack.screens?.length ?? 0) > 0).toBe(true);
    }
  });
});