import { describe, expect, it } from "vitest";
import { isCongratsEndScreen, normalizeLessonScreenOrderIds } from "@/lib/lesson-bookends";
import {
  completionPlaygroundSchema,
  parseScreenPayload,
  startPayloadSchema,
  startPlaygroundSchema,
  storyPayloadFromStartPlayground,
} from "@/lib/lesson-schemas";

const minimalPage = {
  id: "pg1",
  background_image_url: "https://placehold.co/800x500/e2e8f0/1e293b?text=Play",
  items: [
    {
      id: "sticker1",
      kind: "image" as const,
      image_url: "https://placehold.co/80x80/fcfbbf/854d0e?text=Hi",
      x_percent: 42,
      y_percent: 40,
      w_percent: 16,
      h_percent: 20,
    },
  ],
};

describe("start playground schema", () => {
  it("parses legacy start payload without playground", () => {
    const raw = {
      type: "start",
      image_url: "https://example.com/a.png",
      cta_label: "Go",
    };
    const p = startPayloadSchema.safeParse(raw);
    expect(p.success).toBe(true);
    if (p.success) expect(p.data.playground).toBeUndefined();
  });

  it("parses start with playground and tap_rewards", () => {
    const raw = {
      type: "start",
      cta_label: "Start learning",
      playground: {
        page: minimalPage,
        tap_rewards: [{ item_id: "sticker1", gold: 2, max_triggers: 1 }],
      },
    };
    const p = startPayloadSchema.safeParse(raw);
    expect(p.success).toBe(true);
    if (p.success) {
      expect(p.data.playground?.page.id).toBe("pg1");
      const story = storyPayloadFromStartPlayground(p.data.playground!);
      expect(story.type).toBe("story");
      expect(story.pages?.length).toBe(1);
    }
  });

  it("rejects playground page with phases", () => {
    const playground = {
      page: {
        ...minimalPage,
        phases: [{ id: "ph1", is_start: true }],
      },
    };
    const p = startPlaygroundSchema.safeParse(playground);
    expect(p.success).toBe(false);
  });

  it("completionPlaygroundSchema matches start playground shape", () => {
    const pg = {
      page: minimalPage,
      tap_rewards: [{ item_id: "sticker1", experience: 5 }],
    };
    expect(completionPlaygroundSchema.safeParse(pg).success).toBe(true);
  });
});

describe("lesson bookends with playground", () => {
  it("isCongratsEndScreen unchanged when playground present", () => {
    const payload = {
      type: "start",
      cta_label: "Finish activity",
      read_aloud_title: "Congratulations",
      playground: { page: minimalPage },
    };
    expect(isCongratsEndScreen("start", payload)).toBe(true);
  });

  it("normalizeLessonScreenOrderIds pins opening and congrats", () => {
    const screens = [
      { id: "m1", screen_type: "story", payload: { type: "story", body_text: "x" } },
      { id: "o", screen_type: "start", payload: { type: "start", cta_label: "Start" } },
      {
        id: "c",
        screen_type: "start",
        payload: {
          type: "start",
          cta_label: "Finish activity",
          read_aloud_title: "Congratulations",
          playground: { page: minimalPage },
        },
      },
    ];
    const ids = normalizeLessonScreenOrderIds(screens);
    expect(ids[0]).toBe("o");
    expect(ids[ids.length - 1]).toBe("c");
    expect(ids).toContain("m1");
  });
});

describe("parseScreenPayload start", () => {
  it("returns playground on start rows", () => {
    const pl = parseScreenPayload("start", {
      type: "start",
      playground: { page: minimalPage },
    });
    expect(pl?.type).toBe("start");
    if (pl?.type === "start") expect(pl.playground?.page.id).toBe("pg1");
  });
});
