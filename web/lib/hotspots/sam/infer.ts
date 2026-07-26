import {
  carveExcludePoints,
  fillSmallMaskHoles,
} from "@wke/explore-hotspots-author";
import { countMaskPixels, maskBoundingBox } from "./maskHelpers";
import type { SamMask } from "./types";
import { imageDataFingerprint, isForegroundAt } from "./util";

export { fillSmallMaskHoles };

export function amgGridPoints(
  width: number,
  height: number,
  pointsPerSide: number,
): { x: number; y: number }[] {
  const n = Math.max(2, Math.min(32, pointsPerSide));
  const points: { x: number; y: number }[] = [];
  const stepX = width / (n + 1);
  const stepY = height / (n + 1);

  for (let row = 1; row <= n; row++) {
    for (let col = 1; col <= n; col++) {
      points.push({
        x: Math.round(col * stepX),
        y: Math.round(row * stepY),
      });
    }
  }

  return points;
}

interface SamProcessorLike {
  (
    image: unknown,
    options?: {
      input_points?: number[][][];
      input_labels?: number[][] | number[][][];
      input_boxes?: number[][][];
    },
  ): Promise<{
    original_sizes: number[][];
    reshaped_input_sizes: number[][];
    pixel_values: unknown;
    input_points?: unknown;
    input_labels?: unknown;
    input_boxes?: unknown;
  }>;
  post_process_masks: (
    pred_masks: unknown,
    original_sizes: number[][],
    reshaped_input_sizes: number[][],
    input_points?: number[][][],
  ) => Promise<unknown[]>;
}

export type SamPromptPoint = { x: number; y: number; label: 1 | 0 };

export type SamPromptBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type SamPromptGuidance = { box?: SamPromptBox };

function isMaskOn(value: number | undefined): boolean {
  return typeof value === "number" && (value > 0.5 || value >= 128);
}

function clampPromptBox(box: SamPromptBox, width: number, height: number): SamPromptBox {
  const x1 = Math.max(0, Math.min(width - 1, Math.floor(Math.min(box.x1, box.x2))));
  const y1 = Math.max(0, Math.min(height - 1, Math.floor(Math.min(box.y1, box.y2))));
  const x2 = Math.max(x1 + 1, Math.min(width, Math.ceil(Math.max(box.x1, box.x2))));
  const y2 = Math.max(y1 + 1, Math.min(height, Math.ceil(Math.max(box.y1, box.y2))));
  return { x1, y1, x2, y2 };
}

function maskHitsPoint(
  mask: Uint8Array,
  width: number,
  height: number,
  point: SamPromptPoint,
  radius = 3,
): boolean {
  const cx = Math.round(point.x);
  const cy = Math.round(point.y);
  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
      if (mask[y * width + x]) return true;
    }
  }
  return false;
}

export function scoreGuidedSamMask(
  mask: Uint8Array,
  width: number,
  height: number,
  modelScore: number,
  prompts: SamPromptPoint[],
  guidance?: SamPromptGuidance,
): number {
  const positives = prompts.filter((prompt) => prompt.label === 1);
  const negatives = prompts.filter((prompt) => prompt.label === 0);
  const positiveCoverage = positives.length
    ? positives.filter((point) => maskHitsPoint(mask, width, height, point)).length / positives.length
    : 0;
  const negativeExclusion = negatives.length
    ? negatives.filter((point) => !maskHitsPoint(mask, width, height, point)).length / negatives.length
    : 1;

  let area = 0;
  let insideArea = 0;
  const box = guidance?.box ? clampPromptBox(guidance.box, width, height) : null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      area += 1;
      if (!box || (x >= box.x1 && x < box.x2 && y >= box.y1 && y < box.y2)) insideArea += 1;
    }
  }
  const insideRatio = area ? insideArea / area : 0;
  const boxArea = box ? Math.max(1, (box.x2 - box.x1) * (box.y2 - box.y1)) : width * height;
  const fillRatio = insideArea / boxArea;
  const fillPlausibility = fillRatio >= 0.02 && fillRatio <= 0.96 ? 1 : 0;

  return Math.max(0, Math.min(1, modelScore)) * 0.35
    + positiveCoverage * 0.3
    + negativeExclusion * 0.2
    + insideRatio * 0.1
    + fillPlausibility * 0.05;
}

export type CleanGuidedSamMaskOptions = {
  /** Default true (sprite sheets). Hotspot authoring disables this when excludes are present. */
  fillSmallHoles?: boolean;
  /** Pixel radius carved around exclude prompts after component cleanup. Default 0. */
  excludeCarveRadius?: number;
};

export function cleanGuidedSamMask(
  source: Uint8Array,
  width: number,
  height: number,
  prompts: SamPromptPoint[],
  guidance?: SamPromptGuidance,
  options: CleanGuidedSamMaskOptions = {},
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const rawBox = guidance?.box ? clampPromptBox(guidance.box, width, height) : null;
  const pad = rawBox
    ? Math.max(2, Math.round(Math.max(rawBox.x2 - rawBox.x1, rawBox.y2 - rawBox.y1) * 0.04))
    : 0;
  const box = rawBox ? clampPromptBox({ x1: rawBox.x1 - pad, y1: rawBox.y1 - pad, x2: rawBox.x2 + pad, y2: rawBox.y2 + pad }, width, height) : null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = !box || (x >= box.x1 && x < box.x2 && y >= box.y1 && y < box.y2);
      if (inside && isMaskOn(source[y * width + x])) mask[y * width + x] = 255;
    }
  }

  const labels = new Int32Array(width * height);
  const areas: number[] = [0];
  let componentCount = 0;
  const queue: number[] = [];
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index] || labels[index]) continue;
    componentCount += 1;
    labels[index] = componentCount;
    queue.length = 0;
    queue.push(index);
    let area = 0;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]!;
      area += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
          const next = (y + dy) * width + x + dx;
          if (!mask[next] || labels[next]) continue;
          labels[next] = componentCount;
          queue.push(next);
        }
      }
    }
    areas[componentCount] = area;
  }
  if (!componentCount) return mask;

  const keep = new Set<number>();
  for (const prompt of prompts) {
    if (prompt.label !== 1) continue;
    const cx = Math.round(prompt.x);
    const cy = Math.round(prompt.y);
    let foundForPrompt = false;
    for (let radius = 0; radius <= 4 && !foundForPrompt; radius++) {
      for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
        for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
          const label = labels[y * width + x];
          if (label) {
            keep.add(label);
            foundForPrompt = true;
          }
        }
      }
    }
  }
  if (!keep.size) {
    let largest = 1;
    for (let label = 2; label <= componentCount; label++) {
      if ((areas[label] ?? 0) > (areas[largest] ?? 0)) largest = label;
    }
    keep.add(largest);
  }

  for (let index = 0; index < mask.length; index++) {
    if (mask[index] && !keep.has(labels[index]!)) mask[index] = 0;
  }

  const excludeCarveRadius = options.excludeCarveRadius ?? 0;
  if (excludeCarveRadius > 0) {
    const excludes = prompts.filter((prompt) => prompt.label === 0);
    if (excludes.length) {
      const carved = carveExcludePoints(mask, width, height, excludes, excludeCarveRadius);
      mask.set(carved);
    }
  }

  if (options.fillSmallHoles === false) return mask;

  const referenceArea = rawBox
    ? Math.max(1, (rawBox.x2 - rawBox.x1) * (rawBox.y2 - rawBox.y1))
    : keep.values().reduce((total, label) => total + (areas[label] ?? 0), 0);
  const maxHoleArea = Math.max(6, Math.min(96, Math.round(referenceArea * 0.0012)));
  return fillSmallMaskHoles(mask, width, height, maxHoleArea);
}

interface SamModelLike {
  (
    inputs: Record<string, unknown>,
  ): Promise<{
    pred_masks: unknown;
    iou_scores?: { data?: Float32Array | number[] };
  }>;
  get_image_embeddings: (inputs: {
    pixel_values: unknown;
  }) => Promise<{
    image_embeddings: unknown;
    image_positional_embeddings: unknown;
  }>;
}

function tensorMaskToSamMask(
  maskData: Float32Array | Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  score: number,
): SamMask | null {
  const binary = new Uint8Array(width * height);
  let area = 0;
  for (let i = 0; i < width * height; i++) {
    const v = maskData[i] ?? 0;
    const on = isMaskOn(v);
    binary[i] = on ? 255 : 0;
    if (on) area += 1;
  }
  if (area === 0) return null;
  const bbox = maskBoundingBox(binary, width, height);
  if (!bbox) return null;
  return { data: binary, width, height, bbox, area, score };
}

async function imageDataToObjectUrl(detect: ImageData): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = detect.width;
  canvas.height = detect.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create SAM canvas.");
  ctx.putImageData(detect, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
  return URL.createObjectURL(blob);
}

export function extractBestMask(
  masks: unknown,
  detect: ImageData,
  iouScores?: Float32Array | number[],
  prompts: SamPromptPoint[] = [],
  guidance?: SamPromptGuidance,
  cleanOptions?: CleanGuidedSamMaskOptions,
): SamMask | null {
  const output = masks as Array<{
    data?: Float32Array | Uint8Array;
    dims?: number[];
  }>;
  const tensor = output[0];
  if (!tensor?.data || !tensor.dims || tensor.dims.length < 3) return null;

  const h = tensor.dims.at(-2) ?? detect.height;
  const w = tensor.dims.at(-1) ?? detect.width;
  const planeSize = h * w;
  const availablePlanes = Math.max(1, Math.floor(tensor.data.length / planeSize));
  const numMasks = Math.min(availablePlanes, iouScores?.length || availablePlanes);
  let bestIdx = 0;
  let bestModelScore = Number(iouScores?.[0] ?? 0);
  let bestGuidedScore = -Infinity;

  for (let i = 0; i < numMasks; i++) {
    const modelScore = Number(iouScores?.[i] ?? 0);
    const offset = i * planeSize;
    const binary = new Uint8Array(planeSize);
    for (let pixel = 0; pixel < planeSize; pixel++) binary[pixel] = isMaskOn(tensor.data[offset + pixel]) ? 255 : 0;
    const guidedScore = scoreGuidedSamMask(binary, w, h, modelScore, prompts, guidance);
    if (guidedScore > bestGuidedScore) {
      bestGuidedScore = guidedScore;
      bestModelScore = modelScore;
      bestIdx = i;
    }
  }

  const offset = bestIdx * planeSize;
  const plane = tensor.data.subarray(offset, offset + planeSize);
  const binary = new Uint8Array(planeSize);
  for (let pixel = 0; pixel < planeSize; pixel++) binary[pixel] = isMaskOn(plane[pixel]) ? 255 : 0;
  const cleaned = cleanGuidedSamMask(binary, w, h, prompts, guidance, cleanOptions);
  return tensorMaskToSamMask(cleaned, w, h, bestModelScore > 0 ? bestModelScore : 0.9);
}

export type SamInferenceSession = {
  runPrompts: (
    detect: ImageData,
    prompts: SamPromptPoint[],
    guidance?: SamPromptGuidance,
    cleanOptions?: CleanGuidedSamMaskOptions,
  ) => Promise<SamMask | null>;
  runPointPrompt: (
    detect: ImageData,
    x: number,
    y: number,
    label?: 1 | 0,
  ) => Promise<SamMask | null>;
  dispose: () => void;
};

export async function createSamInferenceSession(): Promise<SamInferenceSession> {
  const { SamModel, AutoProcessor, RawImage, env } = await import(
    "@huggingface/transformers"
  );

  env.allowLocalModels = false;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }

  const modelId = "Xenova/slimsam-77-uniform";
  const model = (await SamModel.from_pretrained(modelId)) as unknown as SamModelLike;
  const processor = (await AutoProcessor.from_pretrained(
    modelId,
  )) as unknown as SamProcessorLike;

  let cachedKey = "";
  let cachedImage: Awaited<ReturnType<typeof RawImage.fromURL>> | null = null;
  let cachedBaseInputs: Awaited<ReturnType<SamProcessorLike>> | null = null;
  let cachedEmbeddings: Awaited<
    ReturnType<SamModelLike["get_image_embeddings"]>
  > | null = null;

  async function ensureImage(detect: ImageData) {
    const key = imageDataFingerprint(detect);
    if (cachedKey === key && cachedImage && cachedBaseInputs && cachedEmbeddings) {
      return;
    }

    cachedImage = null;
    cachedBaseInputs = null;
    cachedEmbeddings = null;

    const url = await imageDataToObjectUrl(detect);
    try {
      const image = await RawImage.fromURL(url);
      const inputs = await processor(image);
      const embeddings = await model.get_image_embeddings({
        pixel_values: inputs.pixel_values,
      });
      cachedImage = image;
      cachedBaseInputs = inputs;
      cachedEmbeddings = embeddings;
      cachedKey = key;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const runPrompts = async (
    detect: ImageData,
    prompts: SamPromptPoint[],
    guidance?: SamPromptGuidance,
    cleanOptions?: CleanGuidedSamMaskOptions,
  ) => {
      if (!guidance?.box && (!prompts.length || !prompts.some((prompt) => prompt.label === 1))) return null;
      await ensureImage(detect);
      if (!cachedImage || !cachedBaseInputs || !cachedEmbeddings) return null;

      const input_points = prompts.length ? [prompts.map((prompt) => [prompt.x, prompt.y])] : undefined;
      const input_labels = prompts.length ? [prompts.map((prompt) => prompt.label)] : undefined;
      const input_boxes = guidance?.box
        ? [[[
          guidance.box.x1,
          guidance.box.y1,
          guidance.box.x2,
          guidance.box.y2,
        ]]]
        : undefined;
      const promptInputs = await processor(cachedImage, {
        input_points,
        input_labels,
        input_boxes,
      });

      const outputs = await model({
        ...cachedBaseInputs,
        ...promptInputs,
        ...cachedEmbeddings,
      });

      const masks = await processor.post_process_masks(
        outputs.pred_masks,
        promptInputs.original_sizes,
        promptInputs.reshaped_input_sizes,
      );

      const scoreData = outputs.iou_scores?.data;
      const scores =
        scoreData instanceof Float32Array
          ? scoreData
          : Array.isArray(scoreData)
            ? scoreData
            : undefined;
      return extractBestMask(masks, detect, scores, prompts, guidance, cleanOptions);
  };

  return {
    runPrompts,
    runPointPrompt(detect, x, y, label = 1) {
      return runPrompts(detect, [{ x, y, label }]);
    },
    dispose() {
      cachedImage = null;
      cachedBaseInputs = null;
      cachedEmbeddings = null;
      cachedKey = "";
    },
  };
}

const AMG_YIELD_EVERY = 4;

export async function runSamAmg(
  session: SamInferenceSession,
  detect: ImageData,
  pointsPerSide: number,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<SamMask[]> {
  const points = amgGridPoints(detect.width, detect.height, pointsPerSide);
  const masks: SamMask[] = [];

  for (let i = 0; i < points.length; i++) {
    if (signal?.aborted) break;
    const { x, y } = points[i]!;
    if (!isForegroundAt(detect, x, y)) {
      onProgress?.((i + 1) / points.length);
      continue;
    }
    const mask = await session.runPointPrompt(detect, x, y, 1);
    if (mask && countMaskPixels(mask.data) > 0) {
      masks.push(mask);
    }
    onProgress?.((i + 1) / points.length);
    if (i > 0 && i % AMG_YIELD_EVERY === 0) {
      await new Promise<void>((resolve) => {
        if (typeof window !== "undefined") {
          window.setTimeout(resolve, 0);
        } else {
          resolve();
        }
      });
    }
  }

  return masks;
}

export async function runSamPointPrompts(
  session: SamInferenceSession,
  detect: ImageData,
  prompts: { x: number; y: number; label: 1 | 0 }[],
  signal?: AbortSignal,
): Promise<SamMask[]> {
  if (signal?.aborted || !prompts.length) return [];
  const mask = await session.runPrompts(detect, prompts);
  return mask ? [mask] : [];
}
