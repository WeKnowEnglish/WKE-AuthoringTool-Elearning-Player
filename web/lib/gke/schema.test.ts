import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  conceptsExportSchema,
  domainsIndexSchema,
  errorsExportSchema,
  microSkillsExportSchema,
} from "./schema";

const GKE_ROOT = join(process.cwd(), "docs/grammar-knowledge-engine/exports");
const FIXTURES = join(GKE_ROOT, "fixtures");

function loadJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, relativePath), "utf8"));
}

describe("GKE export schemas", () => {
  it("parses empty concept fixtures and populated live concepts export", () => {
    const fixture = loadJson("valid/empty-concepts-envelope.json");
    expect(conceptsExportSchema.parse(fixture).records).toEqual([]);

    const live = JSON.parse(
      readFileSync(join(GKE_ROOT, "concepts-a1-a2.json"), "utf8"),
    );
    const parsed = conceptsExportSchema.parse(live);
    expect(parsed.records).toHaveLength(8);
    expect(parsed.records.map((record) => record.id)).toEqual([
      "grammar.existential.there_is_are.affirmative",
      "grammar.existential.there_is_are.questions",
      "grammar.existential.there_is_are.short_answers",
      "grammar.nouns.countability.countable",
      "grammar.nouns.countability.uncountable",
      "grammar.determiners.quantifiers.some_and_any",
      "grammar.nouns.plural.spelling",
      "grammar.nouns.plural.pronunciation",
    ]);
  });

  it("parses empty micro-skill/error fixtures and populated live exports", () => {
    expect(
      microSkillsExportSchema.parse(loadJson("valid/empty-micro-skills-envelope.json")).records,
    ).toEqual([]);
    expect(errorsExportSchema.parse(loadJson("valid/empty-errors-envelope.json")).records).toEqual(
      [],
    );

    const liveMicroSkills = JSON.parse(
      readFileSync(join(GKE_ROOT, "micro-skills-a1-a2.json"), "utf8"),
    );
    expect(microSkillsExportSchema.parse(liveMicroSkills).records).toHaveLength(31);

    const liveErrors = JSON.parse(readFileSync(join(GKE_ROOT, "errors-a1-a2.json"), "utf8"));
    expect(errorsExportSchema.parse(liveErrors).records).toHaveLength(13);
  });

  it("parses sample existential concept fixture", () => {
    const parsed = conceptsExportSchema.parse(loadJson("valid/sample-existential-concept.json"));
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0]?.id).toBe("grammar.existential.there_is_are.affirmative");
  });

  it("parses sample existential micro-skill fixture", () => {
    const parsed = microSkillsExportSchema.parse(
      loadJson("valid/sample-existential-micro-skill.json"),
    );
    expect(parsed.records[0]?.parentConceptId).toBe(
      "grammar.existential.there_is_are.affirmative",
    );
  });

  it("parses empty domains index", () => {
    const live = JSON.parse(readFileSync(join(GKE_ROOT, "domains-index.json"), "utf8"));
    expect(domainsIndexSchema.parse(live).domains).toEqual([]);
  });

  it("rejects concept fixture missing id", () => {
    expect(
      conceptsExportSchema.safeParse(loadJson("invalid/bad-concept-missing-id.json")).success,
    ).toBe(false);
  });

  it("rejects micro-skill with parent prefix mismatch", () => {
    expect(
      microSkillsExportSchema.safeParse(loadJson("invalid/bad-micro-skill-bad-parent.json"))
        .success,
    ).toBe(false);
  });

  it("rejects error record with invalid id format", () => {
    expect(
      errorsExportSchema.safeParse(loadJson("invalid/bad-error-code-format.json")).success,
    ).toBe(false);
  });

  it("rejects published concept without posterSlug", () => {
    const result = conceptsExportSchema.safeParse({
      schemaVersion: 1,
      generatedAt: "2026-07-07",
      records: [
        {
          id: "grammar.existential.there_is_are.affirmative",
          level: 3,
          parentId: "grammar.existential.there_is_are",
          label: { teacher: "T", student: "S" },
          function: "Test",
          cefr: ["A1"],
          strands: ["language_focused_learning"],
          teachOrder: 1,
          precursorIds: ["domain_entry"],
          successorIds: [],
          contrastIds: [],
          status: "published",
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
