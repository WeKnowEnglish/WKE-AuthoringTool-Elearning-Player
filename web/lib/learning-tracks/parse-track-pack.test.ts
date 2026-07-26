import { describe, expect, it } from "vitest";
import { buildHobbiesDay1BuiltinTrackPack } from "./build-hobbies-day-1-builtin";
import { parseLearningTrackLessonPlayerPack } from "./parse-track-pack";

describe("learning-track pack", () => {
  it("builds and re-parses hobbies day-1 builtin", () => {
    const builtin = buildHobbiesDay1BuiltinTrackPack();
    expect(builtin.kind).toBe("lessonplayer-track-pack");
    expect(builtin.screens.length).toBeGreaterThan(3);
    expect(builtin.screens[0]?.type).toBe("interaction");

    const parsed = parseLearningTrackLessonPlayerPack(builtin);
    expect(parsed.id).toBe("hobbies-day-1");
    expect(parsed.screens.length).toBe(builtin.screens.length);
  });

  it("parses emitted post-quiz report bridges", () => {
    const builtin = buildHobbiesDay1BuiltinTrackPack();
    const reportIndex = builtin.screens.length;
    const withBridge = {
      ...builtin,
      screens: [
        ...builtin.screens,
        {
          type: "interaction" as const,
          subtype: "post_quiz_report" as const,
          source_beat_id: "listen",
          source_beat_label: "Listen and choose",
          source_screen_start: 2,
          source_screen_end: reportIndex,
          title: "Nice work!",
          encouragement: "You completed this activity. Keep going!",
          next_beat_id: "mcq",
          next_activity_label: "Multiple choice",
          next_activity_cue: "Next up: Multiple choice",
        },
      ],
      beat_plan: builtin.beat_plan.map((beat) =>
        beat.kind === "listen_and_choose"
          ? {
              ...beat,
              afterBridge: {
                kind: "post_quiz_report" as const,
                status: "emitted" as const,
                nextBeatId: "mcq",
                nextBeatLabel: "Multiple choice",
                screenIndex: reportIndex,
                intent:
                  "Show a brief quiz report with encouragement, then cue the next activity (“Multiple choice”).",
              },
            }
          : beat,
      ),
    };
    const parsed = parseLearningTrackLessonPlayerPack(withBridge);
    const listen = parsed.beat_plan.find((beat) => beat.kind === "listen_and_choose");
    expect(listen?.afterBridge?.kind).toBe("post_quiz_report");
    expect(listen?.afterBridge?.status).toBe("emitted");
    expect(listen?.afterBridge?.screenIndex).toBe(reportIndex);
    expect(listen?.afterBridge?.nextBeatLabel).toBe("Multiple choice");
    expect(parsed.screens.at(-1)?.subtype).toBe("post_quiz_report");
    expect(listen?.screenStart).toBeDefined();
    expect(listen?.screenEnd).toBeGreaterThan(listen?.screenStart ?? 0);
  });

  it("rejects wrong kind", () => {
    expect(() =>
      parseLearningTrackLessonPlayerPack({
        version: 1,
        kind: "lessonplayer-games-pack",
        screens: [],
      }),
    ).toThrow(/lessonplayer-track-pack/);
  });
});
