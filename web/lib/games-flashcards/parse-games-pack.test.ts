import { describe, expect, it } from "vitest";
import bakeryFlashcards from "@/content/pilots/games-flashcards/bakery-flashcards.json";
import hobbiesFlashcards from "@/content/pilots/games-flashcards/hobbies-flashcards.json";
import { parseGamesFlashcardsLessonPlayerPack } from "./parse-games-pack";
import { rawInteractionTemplateForSubtype } from "@/lib/teacher-interaction-templates";
import { interactionPayloadSchema } from "@/lib/lesson-schemas";

describe("parseGamesFlashcardsLessonPlayerPack", () => {
  it("parses the hobbies pilot fixture", () => {
    const pack = parseGamesFlashcardsLessonPlayerPack(hobbiesFlashcards);
    expect(pack.activity_name).toBe("Our favorite hobbies");
    expect(pack.screens).toHaveLength(1);
    expect(pack.screens[0]?.subtype).toBe("flashcards");
    expect(pack.screens[0]?.cards).toHaveLength(9);
    expect(pack.screens[0]?.cards[0]?.front_faces).toEqual(["picture"]);
    expect(pack.screens[0]?.cards[0]?.back_faces).toEqual(["word", "example"]);
    expect(pack.screens[0]?.cards[0]?.faces.word).toBe("painting");
    expect(pack.screens[0]?.cards[0]?.faces.picture_url).toMatch(
      /^\/pilots\/games-flashcards\/hobbies\//,
    );
    // TTS default — no recorded override on the hardwired deck.
    expect(pack.screens[0]?.cards[0]?.prompt_audio_url).toBeUndefined();
  });

  it("keeps optional per-face audio overrides", () => {
    const pack = parseGamesFlashcardsLessonPlayerPack({
      ...hobbiesFlashcards,
      screens: [
        {
          ...hobbiesFlashcards.screens[0],
          cards: [
            {
              ...hobbiesFlashcards.screens[0].cards[0],
              prompt_audio_url: "https://example.com/painting.mp3",
              example_audio_url: "https://example.com/painting-example.mp3",
              definition_audio_url: "https://example.com/painting-def.mp3",
            },
          ],
        },
      ],
    });
    expect(pack.screens[0]?.cards[0]?.prompt_audio_url).toBe(
      "https://example.com/painting.mp3",
    );
    expect(pack.screens[0]?.cards[0]?.example_audio_url).toBe(
      "https://example.com/painting-example.mp3",
    );
    expect(pack.screens[0]?.cards[0]?.definition_audio_url).toBe(
      "https://example.com/painting-def.mp3",
    );
  });

  it("parses the bakery pilot fixture", () => {
    const pack = parseGamesFlashcardsLessonPlayerPack(bakeryFlashcards);
    expect(pack.activity_name).toBe("Bakery flashcards");
    expect(pack.screens).toHaveLength(1);
    expect(pack.screens[0]?.subtype).toBe("flashcards");
    expect(pack.screens[0]?.cards).toHaveLength(4);
    expect(pack.screens[0]?.cards[0]?.front_faces).toEqual(["word"]);
    expect(pack.screens[0]?.cards[0]?.faces.word).toBe("bakery");
  });

  it("rejects Studio authoring documents", () => {
    expect(() =>
      parseGamesFlashcardsLessonPlayerPack({
        version: 1,
        kind: "activity-authoring",
        interaction: { type: "games", format: "flashcards" },
      }),
    ).toThrow(/Export for Lesson Player/);
  });
});

describe("flashcards template", () => {
  it("parses the teacher template", () => {
    const parsed = interactionPayloadSchema.parse(
      rawInteractionTemplateForSubtype("flashcards"),
    );
    expect(parsed.subtype).toBe("flashcards");
    if (parsed.subtype === "flashcards") {
      expect(parsed.cards.length).toBeGreaterThanOrEqual(1);
    }
  });
});
