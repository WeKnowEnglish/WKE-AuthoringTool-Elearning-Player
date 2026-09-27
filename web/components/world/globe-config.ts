/** Globe radius. Terrain and camera limits are authored against this. */
export const GLOBE_RADIUS = 1;

/** Closest camera distance — stays outside the sphere so students cannot zoom inside. */
export const MIN_CAMERA_DISTANCE = 2.28;

/** Farthest camera distance — globe stays large enough to read and grab. */
export const MAX_CAMERA_DISTANCE = 6.4;

export const DEFAULT_CAMERA_DISTANCE = 4.2;
export const DEFAULT_CAMERA_DISTANCE_NARROW = 3.6;

/** After a hub pick, zoom in so the continent fills the top of the globe. */
export const FOCUS_CAMERA_DISTANCE = 2.52;
export const FOCUS_CAMERA_DISTANCE_NARROW = 2.38;

/** Wider than a telephoto so the sphere reads as a ball, not a flat disc. */
export const CAMERA_FOV = 50;

/**
 * Fixed viewing angle: a globe on a desk, low enough that the top of the ball
 * is obvious. Zoom only scales distance along this direction.
 */
export const CAMERA_VIEW_OFFSET: [number, number, number] = [0.12, 0.34, 1];

/** Look at the globe center so a focused hub can sit on the top of the ball. */
export const CAMERA_LOOK_AT: [number, number, number] = [0, 0.02, 0];

export function cameraPositionFromDistance(distance: number): [number, number, number] {
  const [x, y, z] = CAMERA_VIEW_OFFSET;
  const length = Math.hypot(x, y, z) || 1;
  return [(x / length) * distance, (y / length) * distance, (z / length) * distance];
}

/** Radians of yaw per CSS pixel of horizontal drag. */
export const YAW_SENSITIVITY = 0.0055;

/** Radians of pitch per CSS pixel of vertical drag. */
export const PITCH_SENSITIVITY = 0.0042;

/** Max tilt from the equator, in radians (~72°). Prevents flipping the globe. */
export const MAX_PITCH = (72 * Math.PI) / 180;

/** Peak coasting speed after a flick, in radians / second. */
export const MAX_ANGULAR_VELOCITY = 3.2;

/**
 * Frame-rate-independent damping. After 1 second, velocity is this fraction
 * of its previous value (`velocity *= Math.pow(DAMPING_PER_SECOND, delta)`).
 */
export const DAMPING_PER_SECOND = 0.12;

/** Stop applying leftover inertia below this speed (radians / second). */
export const VELOCITY_EPSILON = 0.012;

/** Ignore a “flick” if the last move was this stale (seconds). */
export const FLICK_MAX_AGE_SECONDS = 0.08;

/** Wheel: distance change per pixel of deltaY. */
export const WHEEL_ZOOM_SPEED = 0.0024;

export const SCENE_BACKGROUND = "#0b1220";
export const OCEAN_COLOR = "#2563eb";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampCameraDistance(distance: number): number {
  return clamp(distance, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
}

export function defaultCameraDistance(viewportWidth: number): number {
  return viewportWidth < 768 ? DEFAULT_CAMERA_DISTANCE_NARROW : DEFAULT_CAMERA_DISTANCE;
}

export function focusCameraDistance(viewportWidth: number): number {
  return viewportWidth < 768 ? FOCUS_CAMERA_DISTANCE_NARROW : FOCUS_CAMERA_DISTANCE;
}

/** Close enough that a building is the stage, with neighbors still in view. */
export function areaCameraDistance(viewportWidth: number): number {
  return viewportWidth < 768 ? 2.3 : 2.36;
}

export function overviewCameraDistance(viewportWidth: number): number {
  return viewportWidth < 768 ? 4.7 : 5.2;
}
