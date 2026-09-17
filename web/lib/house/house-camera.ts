import type { HouseDesignerCamera, HouseCameraPreset } from "./house-types";

export const DEFAULT_HOUSE_CAMERA: HouseDesignerCamera = {
  preset: "corner",
  turn: 0,
  zoom: 1,
};

const PRESET = {
  door: { yaw: 0, y: 2.7, dist: 8.2, lookY: 1.05 },
  corner: { yaw: Math.PI * 0.25, y: 5.1, dist: 10.4, lookY: 0.9 },
  top: { yaw: 0, y: 12.4, dist: 0.35, lookY: 0 },
} as const;

const ZOOM = [1.22, 1, 0.78] as const;

export function turnCamera(camera: HouseDesignerCamera, dir: -1 | 1): HouseDesignerCamera {
  return { ...camera, turn: camera.turn + dir };
}

export function zoomCamera(camera: HouseDesignerCamera, dir: -1 | 1): HouseDesignerCamera {
  const zoom = Math.min(2, Math.max(0, camera.zoom + dir)) as 0 | 1 | 2;
  return { ...camera, zoom };
}

export function setCameraPreset(camera: HouseDesignerCamera, preset: HouseCameraPreset): HouseDesignerCamera {
  return { ...camera, preset, turn: preset === "top" ? camera.turn : 0 };
}

export function cameraPose(camera: HouseDesignerCamera): {
  position: [number, number, number];
  lookAt: [number, number, number];
} {
  const base = PRESET[camera.preset];
  const yaw = base.yaw + camera.turn * (Math.PI / 4);
  const zoom = ZOOM[camera.zoom];
  if (camera.preset === "top") {
    return {
      position: [Math.sin(yaw) * 0.2, base.y * zoom, Math.cos(yaw) * 0.2],
      lookAt: [0, 0, 0],
    };
  }
  const dist = base.dist * zoom;
  return {
    position: [Math.sin(yaw) * dist, base.y * zoom, Math.cos(yaw) * dist],
    lookAt: [0, base.lookY, 0],
  };
}
