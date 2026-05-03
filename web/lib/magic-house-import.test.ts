import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  interactionPayloadSchema,
  startPayloadSchema,
  storyPayloadSchema,
} from "@/lib/lesson-schemas";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("magic-house-lesson-import.json", () => {
  it("parses full import envelope (screens[])", () => {
    const rawPath = join(__dirname, "../sample-imports/magic-house-lesson-import.json");
    const raw = JSON.parse(readFileSync(rawPath, "utf8")) as {
      screens?: { screen_type: string; payload: unknown }[];
    };
    expect(Array.isArray(raw.screens)).toBe(true);
    const story = raw.screens?.find((s) => s.screen_type === "story");
    expect(story?.payload).toBeDefined();
    const parsed = storyPayloadSchema.safeParse(story!.payload);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error)).toBe(
      true,
    );
    expect(parsed.success && parsed.data.pages?.length).toBe(4);
    expect(parsed.success && parsed.data.cast?.length).toBe(2);
    const aj = parsed.success && parsed.data.pages?.[0].items.find((i) => i.id === "p1_aj");
    expect(aj?.registry_id).toBe("cast_magic_aj");
  });

  it("would accept each enumerated screen payload like importLessonScreensJson", () => {
    const rawPath = join(__dirname, "../sample-imports/magic-house-lesson-import.json");
    const raw = JSON.parse(readFileSync(rawPath, "utf8")) as {
      screens?: { screen_type: string; payload: unknown }[];
    };
    for (const s of raw.screens ?? []) {
      if (s.screen_type === "start") startPayloadSchema.parse(s.payload);
      else if (s.screen_type === "story") storyPayloadSchema.parse(s.payload);
      else if (s.screen_type === "interaction") interactionPayloadSchema.parse(s.payload);
      else throw new Error(`bad type ${s.screen_type}`);
    }
  });
});
