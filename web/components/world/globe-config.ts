/** Placeholder ocean radius. Island and camera limits are authored against this. */
export const GLOBE_RADIUS = 1;

/** Closest camera distance — stays outside the sphere so students cannot zoom inside. */
export const MIN_CAMERA_DISTANCE = 2.4;

/** Farthest camera distance — globe stays large enough to read and grab. */
export const MAX_CAMERA_DISTANCE = 6;

export const DEFAULT_CAMERA_DISTANCE = 3.35;
export const DEFAULT_CAMERA_DISTANCE_NARROW = 2.85;

export const CAMERA_FOV = 45;

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

/** Idle yaw while nobody is touching the globe (radians / second). */
export const IDLE_YAW_SPEED = 0.085;

/** Wait after the last interaction before idle spin returns. */
export const IDLE_RESUME_DELAY_MS = 900;

/** Ease idle speed from 0 → full over this window after the delay. */
export const IDLE_RESUME_FADE_MS = 700;

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

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
