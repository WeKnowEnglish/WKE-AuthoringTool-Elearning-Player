import { Euler, Quaternion, Vector3 } from "three";
import { MAX_PITCH, clamp } from "./globe-config";
import { latLonToNormal } from "./sphere-wrap";

const FROM = new Vector3();
const TO = new Vector3();
const QUAT = new Quaternion();
const EULER = new Euler();

export type GlobeFocus = {
  token: number;
  lat: number;
  lon: number;
  distance: number;
  snap?: boolean;
};

/**
 * Upper-front of the globe, in world space.
 * A focused hub turns to face the student and sits on the top of the ball.
 */
export const HUB_CROWN: [number, number, number] = [0.08, 0.58, 0.81];

/** Rotate the globe so a lat/lon faces forward on the top of the globe. */
export function lookAtLatLon(lat: number, lon: number): { yaw: number; pitch: number } {
  FROM.copy(latLonToNormal(lat, lon));
  const [x, y, z] = HUB_CROWN;
  TO.set(x, y, z).normalize();
  QUAT.setFromUnitVectors(FROM, TO);
  EULER.setFromQuaternion(QUAT, "YXZ");
  return {
    yaw: EULER.y,
    pitch: clamp(EULER.x, -MAX_PITCH, MAX_PITCH),
  };
}

export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
