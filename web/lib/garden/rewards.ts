import type { GardenItemId } from "@/lib/garden/types";

export const GARDEN_ITEM_LABELS: Record<GardenItemId, string> = {
  watering_can: "Watering Can",
  fertilizer: "Fertilizer",
};

export const GARDEN_ITEM_EMOJI: Record<GardenItemId, string> = {
  watering_can: "🪣",
  fertilizer: "🧪",
};
