import { describe, expect, it } from "vitest";
import { DEFAULT_HOST_PART_MOTION_TUNES } from "./puppets/default-host-part-motion";
import { buildIdleMotionTransition } from "./puppet-spring-presets";
import { buildIdleMotion } from "./use-puppet-bone-motion";
import { PUPPET_PART_KEYS } from "./types";

describe("puppet-spring-presets", () => {
  it("idle transition uses tween with infinite mirror repeat", () => {
    const t = buildIdleMotionTransition("body", DEFAULT_HOST_PART_MOTION_TUNES.body);
    expect(t.repeat).toBe(Infinity);
    expect(t.repeatType).toBe("mirror");
    expect(t.ease).toBe("easeInOut");
    expect(t.duration).toBeGreaterThan(0);
    expect(t).not.toHaveProperty("rotate");
  });

  it("buildIdleMotion bundles targets and transition", () => {
    const motion = buildIdleMotion("head", DEFAULT_HOST_PART_MOTION_TUNES.head, false);
    expect(motion?.rotate).toEqual([-5, 3]);
    expect(motion?.transition).toMatchObject({
      repeat: Infinity,
      repeatType: "mirror",
    });
  });

  it("default host parts with rotate enabled use two-frame idle", () => {
    for (const part of PUPPET_PART_KEYS) {
      const tune = DEFAULT_HOST_PART_MOTION_TUNES[part];
      if (!tune.rotateEnabled) continue;
      const motion = buildIdleMotion(part, tune, false);
      expect(motion?.rotate).toHaveLength(2);
    }
  });
});
