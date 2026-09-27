import { Euler, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { HUB_CROWN, lookAtLatLon, shortestAngleDelta } from "@/components/world/look-at-hub";
import { latLonToNormal } from "@/components/world/sphere-wrap";

function applyLookAt(lat: number, lon: number): Vector3 {
  const pose = lookAtLatLon(lat, lon);
  const euler = new Euler(pose.pitch, pose.yaw, 0, "YXZ");
  return latLonToNormal(lat, lon).applyEuler(euler);
}

describe("lookAtLatLon", () => {
  it("puts a hub on the top of the globe, facing forward", () => {
    const facing = applyLookAt(-2, 0);
    const crown = new Vector3(...HUB_CROWN).normalize();
    expect(facing.dot(crown)).toBeGreaterThan(0.98);
    expect(facing.y).toBeGreaterThan(0.45);
    expect(facing.z).toBeGreaterThan(0.55);
  });

  it("keeps home and a far hub on a short turn", () => {
    const home = lookAtLatLon(-2, 0);
    const reading = lookAtLatLon(16, 108);
    expect(Math.abs(shortestAngleDelta(home.yaw, reading.yaw))).toBeLessThan(Math.PI);
  });
});
