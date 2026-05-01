import type { StoryItem } from "@/lib/lesson-schemas";

export function migrateStoryItemKind(
  prev: StoryItem,
  kind: NonNullable<StoryItem["kind"]>,
): StoryItem {
  const base: StoryItem = { ...prev, kind };
  if (kind === "image") {
    return {
      ...base,
      image_url:
        prev.image_url?.trim() || "https://placehold.co/120x80/f1f5f9/334155?text=Item",
    };
  }
  if (kind === "text") {
    return {
      ...base,
      text: prev.text?.trim() || "Text",
      show_card: false,
      image_url: prev.image_url || "https://placehold.co/2x2/ffffff/ffffff",
    };
  }
  if (kind === "shape") {
    return {
      ...base,
      color_hex: prev.color_hex?.trim() || "#3b82f6",
      show_card: false,
    };
  }
  if (kind === "line") {
    return {
      ...base,
      color_hex: prev.color_hex?.trim() || "#0f172a",
      line_width_px: prev.line_width_px ?? 3,
      show_card: false,
    };
  }
  if (kind === "button") {
    return {
      ...base,
      text: prev.text?.trim() || "Button",
      color_hex: prev.color_hex?.trim() || "#0ea5e9",
      text_color: prev.text_color ?? "#ffffff",
      text_size_px: prev.text_size_px ?? 18,
      show_card: true,
    };
  }
  return base;
}
