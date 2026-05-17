import { describe, expect, it } from "vitest";
import { DEFAULT_HOST } from "./puppets/default-host";
import {
  buildDefaultMotionTuneMap,
  buildRigExportBundle,
  formatRigExportJson,
  formatPartMotionForSource,
} from "./part-motion-tune";
import { buildPivotPercentMap } from "./pivot-utils";

describe("part-motion-tune", () => {
  it("exports full rig bundle JSON", () => {
    const bundle = buildRigExportBundle(
      buildPivotPercentMap(DEFAULT_HOST),
      buildDefaultMotionTuneMap(),
    );
    const json = formatRigExportJson(bundle);
    const parsed = JSON.parse(json) as { puppetId: string; pivots: unknown };
    expect(parsed.puppetId).toBe("default_host");
    expect(parsed.pivots).toBeTruthy();
  });

  it("formats motion source snippet", () => {
    expect(formatPartMotionForSource(buildDefaultMotionTuneMap())).toContain("upperArm:");
  });
});
