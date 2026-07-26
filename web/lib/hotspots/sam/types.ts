export type PixelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SamMask = {
  data: Uint8Array;
  width: number;
  height: number;
  bbox: PixelRect;
  area: number;
  score: number;
};

export type SamModelLoadState = "idle" | "loading" | "ready" | "error";

export type SamModelStatus = {
  state: SamModelLoadState;
  progress: number;
  error: string | null;
};
