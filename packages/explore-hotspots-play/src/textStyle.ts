export const TEXT_STYLE_ROLES = ["title", "body", "caption"] as const;
export const TEXT_STYLE_ALIGNS = ["left", "center", "right"] as const;

export type TextStyleRole = (typeof TEXT_STYLE_ROLES)[number];
export type TextStyleAlign = (typeof TEXT_STYLE_ALIGNS)[number];

export type ObjectTextStyle = {
  role?: TextStyleRole;
  align?: TextStyleAlign;
};

export const TEXT_STYLE_ROLE_LABELS: Record<TextStyleRole, string> = {
  title: "Title",
  body: "Body",
  caption: "Caption",
};

export const TEXT_STYLE_ALIGN_LABELS: Record<TextStyleAlign, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
};

type RectGeometry = { x: number; y: number; width: number; height: number };

/** Map role + box height to SVG font size at the given viewBox scale. */
export function textFontSize(
  height: number,
  scale: number,
  role: TextStyleRole = "body",
): number {
  const h = Math.max(0, height) * scale;
  if (role === "title") return Math.max(28, Math.min(96, h * 0.7));
  if (role === "caption") return Math.max(14, Math.min(28, h * 0.35));
  return Math.max(18, Math.min(48, h * 0.45));
}

export function textAnchorForAlign(align: TextStyleAlign = "center"): "start" | "middle" | "end" {
  if (align === "left") return "start";
  if (align === "right") return "end";
  return "middle";
}

/** X position in SVG space for the given align within a normalized rectangle. */
export function textXForAlign(
  geometry: RectGeometry,
  scale: number,
  align: TextStyleAlign = "center",
): number {
  if (align === "left") return geometry.x * scale;
  if (align === "right") return (geometry.x + geometry.width) * scale;
  return (geometry.x + geometry.width / 2) * scale;
}

export function resolveTextStyle(style?: ObjectTextStyle | null): {
  role: TextStyleRole;
  align: TextStyleAlign;
} {
  return {
    role: style?.role ?? "body",
    align: style?.align ?? "center",
  };
}
