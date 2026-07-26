import {
  filterSeedsOnForeground,
  findMaskRescueSeed,
  hotspotGeometryBounds,
  hotspotGeometrySeedPoints,
} from "@wke/explore-hotspots-author";
import type { CleanGuidedSamMaskOptions } from "@/lib/hotspots/sam";
import { ensureSamSession } from "@/lib/hotspots/sam";
import { maskToNormalizedContours } from "@/lib/hotspots/maskContours";
import type {
  ActivityAssetReference,
  HotspotGeometry,
  HotspotHighlight,
  HotspotVisualShape,
  NormalizedPoint,
} from "@/lib/hotspots/types";

export type NormalizedSamPrompt = NormalizedPoint & { label: 1 | 0 };

export type DetectActivityHotspotOptions = {
  /** Inject centerline auto seeds (default true). Turn off for box-only / manual include points. */
  useAutoSeeds?: boolean;
};

export type DetectActivityHotspotResult = {
  visualShape: HotspotVisualShape;
  autoSeeds: NormalizedPoint[];
  usedAutoSeeds: NormalizedPoint[];
  droppedAutoSeeds: NormalizedPoint[];
};

export const DEFAULT_OBJECT_HIGHLIGHT: HotspotHighlight = {
  style: "spotlight-outline",
  color: "#fbbf24",
  outlineWidth: 5,
  glowRadius: 10,
  backgroundDim: 0.14,
};

export { hotspotGeometryBounds, hotspotGeometrySeedPoints };

async function loadDetectionImage(
  src: string,
  maxDimension = 768,
): Promise<{ imageData: ImageData; sourceWidth: number; sourceHeight: number }> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    if (/^https?:/i.test(src)) element.crossOrigin = "anonymous";
    element.onload = () => resolve(element);
    element.onerror = () =>
      reject(new Error("Could not load the activity image for object detection."));
    element.src = src;
  });
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not create an object-detection canvas.");
  context.drawImage(image, 0, 0, width, height);
  return {
    imageData: context.getImageData(0, 0, width, height),
    sourceWidth: image.naturalWidth,
    sourceHeight: image.naturalHeight,
  };
}

function toPixelPrompts(prompts: NormalizedSamPrompt[], width: number, height: number) {
  return prompts.map((prompt) => ({
    x: Math.max(0, Math.min(width - 1, Math.round(prompt.x * width))),
    y: Math.max(0, Math.min(height - 1, Math.round(prompt.y * height))),
    label: prompt.label,
  }));
}

function hotspotCleanOptions(
  prompts: NormalizedSamPrompt[],
  imageWidth: number,
  imageHeight: number,
  normalizedBox: { x1: number; y1: number; x2: number; y2: number },
): CleanGuidedSamMaskOptions {
  const hasExclude = prompts.some((prompt) => prompt.label === 0);
  if (!hasExclude) return { fillSmallHoles: true, excludeCarveRadius: 0 };
  const boxW = Math.max(1, (normalizedBox.x2 - normalizedBox.x1) * imageWidth);
  const boxH = Math.max(1, (normalizedBox.y2 - normalizedBox.y1) * imageHeight);
  return {
    fillSmallHoles: false,
    excludeCarveRadius: Math.max(6, Math.round(Math.min(boxW, boxH) * 0.04)),
  };
}

export async function detectActivityHotspotContour(
  media: ActivityAssetReference,
  prompts: NormalizedSamPrompt[],
  geometry: HotspotGeometry,
  options: DetectActivityHotspotOptions = {},
): Promise<DetectActivityHotspotResult> {
  const useAutoSeeds = options.useAutoSeeds !== false;
  const { imageData, sourceWidth, sourceHeight } = await loadDetectionImage(media.src);
  const session = await ensureSamSession();
  const normalizedBox = hotspotGeometryBounds(geometry);
  const guidance = {
    box: {
      x1: normalizedBox.x1 * imageData.width,
      y1: normalizedBox.y1 * imageData.height,
      x2: normalizedBox.x2 * imageData.width,
      y2: normalizedBox.y2 * imageData.height,
    },
  };
  const cleanOptions = hotspotCleanOptions(
    prompts,
    imageData.width,
    imageData.height,
    normalizedBox,
  );

  const autoSeeds = useAutoSeeds ? hotspotGeometrySeedPoints(geometry) : [];
  let usedAutoSeeds = [...autoSeeds];
  let droppedAutoSeeds: NormalizedPoint[] = [];

  const runWithSeeds = async (seeds: NormalizedPoint[]) => {
    const guided: NormalizedSamPrompt[] = [
      ...seeds.map((point) => ({ ...point, label: 1 as const })),
      ...prompts,
    ];
    return session.runPrompts(
      imageData,
      toPixelPrompts(guided, imageData.width, imageData.height),
      guidance,
      cleanOptions,
    );
  };

  let mask = await runWithSeeds(usedAutoSeeds);

  if (useAutoSeeds && autoSeeds.length && mask) {
    const filtered = filterSeedsOnForeground(
      autoSeeds,
      mask.data,
      mask.width,
      mask.height,
    );
    droppedAutoSeeds = filtered.dropped;
    if (filtered.kept.length > 0 && filtered.kept.length < autoSeeds.length) {
      usedAutoSeeds = filtered.kept;
      const refined = await runWithSeeds(usedAutoSeeds);
      if (refined) mask = refined;
    } else if (filtered.kept.length === 0) {
      const userHasInclude = prompts.some((prompt) => prompt.label === 1);
      if (!userHasInclude) {
        const rescue = findMaskRescueSeed(
          mask.data,
          mask.width,
          mask.height,
          normalizedBox,
        );
        if (rescue) {
          usedAutoSeeds = [rescue];
          droppedAutoSeeds = autoSeeds;
          const rescued = await runWithSeeds(usedAutoSeeds);
          if (rescued) mask = rescued;
        } else {
          usedAutoSeeds = [];
          droppedAutoSeeds = autoSeeds;
        }
      } else {
        usedAutoSeeds = [];
        droppedAutoSeeds = autoSeeds;
        const withoutSeeds = await runWithSeeds([]);
        if (withoutSeeds) mask = withoutSeeds;
      }
    } else {
      usedAutoSeeds = filtered.kept;
    }
  }

  if (!mask) throw new Error("Object detection did not return a usable mask. Try another point.");
  const paths = maskToNormalizedContours(mask.data, mask.width, mask.height);
  if (!paths.length) throw new Error("The detected mask did not contain a usable object outline.");

  return {
    visualShape: {
      type: "segmentation-contour",
      sourceAssetId: media.id,
      sourceWidth,
      sourceHeight,
      paths,
      score: mask.score,
    },
    autoSeeds,
    usedAutoSeeds,
    droppedAutoSeeds,
  };
}
