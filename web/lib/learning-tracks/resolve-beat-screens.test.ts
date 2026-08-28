import { afterEach, describe, expect, it, vi } from "vitest";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import hobbiesHotspots from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";
import {
  beatSupportsLibrary,
  libraryFormatForBeatKind,
  resolveBeatScreens,
} from "@/lib/learning-tracks/resolve-beat-screens";
import type { LearningTrackBeatInstance } from "@/lib/learning-tracks/composition-types";

describe("libraryFormatForBeatKind / beatSupportsLibrary", () => {
  it("wires explore_hotspots to Activity Bank library format", () => {
    expect(libraryFormatForBeatKind("explore_hotspots")).toBe("explore_hotspots");
    expect(beatSupportsLibrary("explore_hotspots")).toBe(true);
  });

  it("keeps Language in Focus fixture-only for now", () => {
    expect(libraryFormatForBeatKind("language_in_focus")).toBeNull();
    expect(beatSupportsLibrary("language_in_focus")).toBe(false);
  });

  it("enables library for mapped quiz formats", () => {
    expect(libraryFormatForBeatKind("multiple_choice")).toBe("multiple_choice");
    expect(beatSupportsLibrary("multiple_choice")).toBe(true);
    expect(beatSupportsLibrary("flashcards")).toBe(true);
    expect(beatSupportsLibrary("wordsearch")).toBe(true);
  });
});

describe("resolveBeatScreens library multiple_choice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads games pack from Activity Bank", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          format: "multiple_choice",
          pack: bakeryQuickCheck,
        }),
      }),
    );

    const beat: LearningTrackBeatInstance = {
      id: "mc",
      kind: "multiple_choice",
      source: {
        type: "library",
        libraryId: "bank-mc-1",
        format: "multiple_choice",
      },
    };

    const screens = await resolveBeatScreens(beat);
    expect(screens.length).toBeGreaterThan(0);
    expect(screens[0]?.subtype).toBe("mc_quiz");
    expect(screens[0]?.question).toMatch(/bread|bakery/i);
  });
});

describe("resolveBeatScreens library explore_hotspots", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads pack from Activity Bank and applies panel overlays", async () => {
    const pack = wkeActivityToExploreHotspotsPayload(hobbiesHotspots);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        format: "explore_hotspots",
        pack,
        authoring: hobbiesHotspots,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const beat: LearningTrackBeatInstance = {
      id: "hotspots",
      kind: "explore_hotspots",
      label: "Explore hotspots",
      source: {
        type: "library",
        libraryId: "bank-hotspot-1",
        format: "explore_hotspots",
      },
      presentation: {
        exploreHotspots: {
          panelOverlays: [
            {
              dialogueId: "dialogue-mia-drawing",
              cards: [
                {
                  id: "card-1",
                  type: "dialogue_turn",
                  speaker: "Mia",
                  text: "I like drawing.",
                  audioUrl: "https://example.com/mia.mp3",
                },
              ],
            },
          ],
        },
      },
    };

    const screens = await resolveBeatScreens(beat);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/studio/activities/bank-hotspot-1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(screens).toHaveLength(1);
    expect(screens[0]?.subtype).toBe("explore_hotspots");
    const dialogues = screens[0]?.dialogues as Array<{
      id?: string;
      turns?: Array<{ audio_url?: string; text?: string }>;
    }>;
    const mia = dialogues?.find((d) => d.id === "dialogue-mia-drawing");
    expect(mia?.turns?.[0]?.audio_url).toBe("https://example.com/mia.mp3");
  });

  it("falls back to authoring when pack is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          format: "explore_hotspots",
          authoring: hobbiesHotspots,
        }),
      }),
    );

    const beat: LearningTrackBeatInstance = {
      id: "hotspots",
      kind: "explore_hotspots",
      source: {
        type: "library",
        libraryId: "bank-hotspot-2",
        format: "explore_hotspots",
      },
    };

    const screens = await resolveBeatScreens(beat);
    expect(screens[0]?.subtype).toBe("explore_hotspots");
    expect(Array.isArray(screens[0]?.hotspots)).toBe(true);
  });
});

describe("resolveBeatScreens word-game settings", () => {
  it("compiles Memory, Crossword, and Word search settings", async () => {
    const memoryBeat: LearningTrackBeatInstance = {
      id: "memory",
      kind: "memory",
      source: {
        type: "vocab_compile",
        listId: "hobbies-default",
        format: "memory",
      },
      presentation: { memory: { textMode: "example" } },
    };
    const crosswordBeat: LearningTrackBeatInstance = {
      id: "crossword",
      kind: "crossword",
      source: {
        type: "vocab_compile",
        listId: "hobbies-default",
        format: "crossword",
      },
      presentation: { crossword: { clueMode: "definition" } },
    };
    const wordSearchBeat: LearningTrackBeatInstance = {
      id: "wordsearch",
      kind: "wordsearch",
      source: {
        type: "vocab_compile",
        listId: "hobbies-default",
        format: "wordsearch",
      },
      presentation: {
        wordSearch: {
          allowBackwards: true,
          allowDiagonals: false,
          allowBackwardsDiagonals: true,
        },
      },
    };

    const [memoryScreen] = await resolveBeatScreens(memoryBeat);
    const [crosswordScreen] = await resolveBeatScreens(crosswordBeat);
    const [wordSearchScreen] = await resolveBeatScreens(wordSearchBeat);
    expect(memoryScreen?.subtype).toBe("memory");
    expect(
      (memoryScreen?.pairs as Array<{ text_kind?: string }> | undefined)?.[0]
        ?.text_kind,
    ).toBe("example");
    expect(crosswordScreen?.subtype).toBe("crossword");
    expect(
      (crosswordScreen?.entries as Array<{ clue?: string }> | undefined)?.[0]
        ?.clue,
    ).toMatch(/making|moving|looking|riding/i);
    expect(wordSearchScreen).toMatchObject({
      subtype: "wordsearch",
      allow_backwards: true,
      allow_diagonals: false,
      allow_backwards_diagonals: true,
    });
  });
});
