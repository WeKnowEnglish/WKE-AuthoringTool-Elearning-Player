import { describe, expect, it } from "vitest";
import { buildHobbiesDay1BuiltinTrackPack } from "@/lib/learning-tracks/build-hobbies-day-1-builtin";
import {
  practiceSegmentIndexForScreen,
  resolvePracticeTrackSegments,
} from "@/lib/practice-tracks/resolve-segments";

describe("resolvePracticeTrackSegments", () => {
  it("maps beat_plan entries in order with screen ranges", () => {
    const pack = buildHobbiesDay1BuiltinTrackPack();
    const segments = resolvePracticeTrackSegments(pack);

    expect(segments.length).toBe(pack.beat_plan.length);
    expect(segments[0]).toMatchObject({
      id: pack.beat_plan[0]?.id,
      screenStart: pack.beat_plan[0]?.screenStart,
      screenEnd: pack.beat_plan[0]?.screenEnd,
      gradingPolicy: "completion",
    });
  });

  it("resolves the active segment from a screen index inside a beat", () => {
    const pack = buildHobbiesDay1BuiltinTrackPack();
    const segments = resolvePracticeTrackSegments(pack);
    const firstBeat = pack.beat_plan[0];
    expect(firstBeat).toBeTruthy();

    const segmentIndex = practiceSegmentIndexForScreen(
      segments,
      firstBeat!.screenStart,
    );
    expect(segments[segmentIndex]?.id).toBe(firstBeat!.id);
  });
});
