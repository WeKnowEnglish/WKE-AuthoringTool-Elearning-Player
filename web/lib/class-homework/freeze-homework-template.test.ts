import { describe, expect, it } from "vitest";
import {
  freezeHomeworkTemplateDocument,
  parseFrozenPrimaryHomeworkTemplateDocument,
  parseFrozenSecondaryHomeworkTemplateDocument,
} from "@/lib/class-homework/freeze-homework-template";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { HOMEWORK_TEMPLATE_ONE } from "@/lib/homework-templates/homework-template-one";
import { SECONDARY_HOMEWORK_ONE } from "@/lib/homework-templates/secondary-homework-one";

describe("frozen homework templates", () => {
  it("creates an assignment-owned Primary document", () => {
    const document = freezeHomeworkTemplateDocument("homework-template-one");
    expect(document).toEqual(HOMEWORK_TEMPLATE_ONE);
    expect(document).not.toBe(HOMEWORK_TEMPLATE_ONE);

    document.title = "Changed assignment title";
    expect(HOMEWORK_TEMPLATE_ONE.title).toBe("Homework Template One");
    expect(
      parseFrozenPrimaryHomeworkTemplateDocument(
        freezeHomeworkTemplateDocument("homework-template-one"),
      )?.title,
    ).toBe("Homework Template One");
  });

  it("creates an assignment-owned Secondary document", () => {
    const document = freezeHomeworkTemplateDocument(
      "secondary-homework-template-one",
    );
    expect(document).toEqual(SECONDARY_HOMEWORK_ONE);
    expect(document).not.toBe(SECONDARY_HOMEWORK_ONE);

    const reading = document.reading as Record<string, unknown>;
    reading.title = "Changed assignment reading";
    expect(SECONDARY_HOMEWORK_ONE.reading.title).not.toBe(
      "Changed assignment reading",
    );
    expect(
      parseFrozenSecondaryHomeworkTemplateDocument(
        freezeHomeworkTemplateDocument("secondary-homework-template-one"),
      )?.reading.title,
    ).toBe(SECONDARY_HOMEWORK_ONE.reading.title);
  });

  it("preserves legacy pointer rows and validates new snapshots", () => {
    const legacy = normalizeHomeworkPayload({
      type: "homework_template",
      templateId: "secondary-homework-template-one",
      title: "Past tense review",
      sectionCount: 5,
      frozenAt: "2026-08-05T00:00:00.000Z",
    });
    expect(legacy?.type).toBe("homework_template");
    expect(legacy && "document" in legacy).toBe(false);

    const frozen = normalizeHomeworkPayload({
      ...legacy,
      document: freezeHomeworkTemplateDocument(
        "secondary-homework-template-one",
      ),
    });
    expect(frozen?.type).toBe("homework_template");
    expect(frozen?.type === "homework_template" && frozen.document).toBeTruthy();

    expect(
      normalizeHomeworkPayload({
        ...legacy,
        document: { reading: {} },
      }),
    ).toBeNull();
  });
});
