import { describe, expect, it } from "vitest";
import { presentationInteractivePayloadSchema } from "@/lib/lesson-schemas";

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
