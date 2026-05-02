import { describe, expect, it } from "vitest";
import {
  migratePresentationInteractiveToStory,
  parseScreenPayload,
  presentationInteractivePayloadSchema,
} from "@/lib/lesson-schemas";

describe("presentationInteractivePayloadSchema", () => {
  it("accepts valid minimal payload", () => {
    const parsed = presentationInteractivePayloadSchema.parse({
      type: "interaction",
      subtype: "presentation_interactive",
      slides: [
        {
          id: "slide-1",
          elements: [
            {
              id: "el-1",
              kind: "button",
              x_percent: 10,
              y_percent: 12,
              w_percent: 24,
              h_percent: 12,
              z_index: 1,
              actions: [{ type: "info_popup", title: "Info" }],
            },
          ],
        },
      ],
    });
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.slides[0]?.elements[0]?.actions?.[0]?.type).toBe("info_popup");
  });

  it("rejects invalid drag check target references", () => {
    const parsed = presentationInteractivePayloadSchema.safeParse({
      type: "interaction",
      subtype: "presentation_interactive",
      slides: [
        {
          id: "slide-1",
          elements: [
            {
              id: "dragger",
              kind: "image",
              x_percent: 10,
              y_percent: 12,
              w_percent: 24,
              h_percent: 12,
              draggable_mode: "check_target",
              drop_target_id: "missing-target",
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects actions that point to missing element ids", () => {
    const parsed = presentationInteractivePayloadSchema.safeParse({
      type: "interaction",
      subtype: "presentation_interactive",
      slides: [
        {
          id: "slide-1",
          elements: [
            {
              id: "el-1",
              kind: "button",
              x_percent: 10,
              y_percent: 12,
              w_percent: 24,
              h_percent: 12,
              actions: [{ type: "show_element", element_id: "el-missing" }],
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("migratePresentationInteractiveToStory", () => {
  const legacy = {
    type: "interaction",
    subtype: "presentation_interactive",
    body_text: "Intro",
    pass_rule: "visit_all_slides",
    slides: [
      {
        id: "s1",
        title: "One",
        elements: [
          {
            id: "btn",
            kind: "button" as const,
            text: "Go",
            x_percent: 5,
            y_percent: 5,
            w_percent: 20,
            h_percent: 10,
            z_index: 1,
            draggable_mode: "none" as const,
            actions: [{ type: "info_popup" as const, title: "Hi", body: "There" }],
          },
        ],
      },
    ],
  };

  it("produces story with slide layout and visit_all_pages pass_rule", () => {
    const story = migratePresentationInteractiveToStory(legacy);
    expect(story.type).toBe("story");
    expect(story.layout_mode).toBe("slide");
    expect(story.pass_rule).toBe("visit_all_pages");
    expect(story.pages).toHaveLength(1);
    expect(story.pages?.[0]?.items[0]?.action_sequences?.[0]?.steps[0]?.kind).toBe("info_popup");
  });

  it("parseScreenPayload returns migrated story for interaction rows", () => {
    const p = parseScreenPayload("interaction", legacy);
    expect(p?.type).toBe("story");
    expect(p && "layout_mode" in p ? p.layout_mode : null).toBe("slide");
  });
});
