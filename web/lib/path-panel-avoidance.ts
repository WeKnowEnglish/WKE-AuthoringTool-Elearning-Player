/** Corner placement for the story path authoring panel inside the stage overlay. */
export type PathPanelPlacement = "tl" | "tr" | "bl" | "br" | "strip";

function readOnlyRect(x: number, y: number, w: number, h: number): DOMRectReadOnly {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as DOMRectReadOnly;
}

export function rectsOverlap(
  a: DOMRectReadOnly,
  b: DOMRectReadOnly,
  pad: number,
): boolean {
  return !(
    a.right + pad <= b.left ||
    a.left - pad >= b.right ||
    a.bottom + pad <= b.top ||
    a.top - pad >= b.bottom
  );
}

function rectForCorner(
  overlay: DOMRectReadOnly,
  panelW: number,
  panelH: number,
  inset: number,
  corner: Exclude<PathPanelPlacement, "strip">,
): DOMRectReadOnly {
  switch (corner) {
    case "tl":
      return readOnlyRect(overlay.left + inset, overlay.top + inset, panelW, panelH);
    case "tr":
      return readOnlyRect(
        overlay.right - inset - panelW,
        overlay.top + inset,
        panelW,
        panelH,
      );
    case "bl":
      return readOnlyRect(
        overlay.left + inset,
        overlay.bottom - inset - panelH,
        panelW,
        panelH,
      );
    case "br":
      return readOnlyRect(
        overlay.right - inset - panelW,
        overlay.bottom - inset - panelH,
        panelW,
        panelH,
      );
  }
}

/** Bottom strip occupies overlay bottom band (fallback when all corners overlap). */
function rectForStrip(overlay: DOMRectReadOnly, inset: number, stripMaxRatio = 0.42): DOMRectReadOnly {
  const h = Math.min(overlay.height * stripMaxRatio, 220);
  return readOnlyRect(
    overlay.left + inset,
    overlay.bottom - inset - h,
    overlay.width - inset * 2,
    h,
  );
}

/**
 * Pick where to place the path panel so it does not overlap the dragged item rect.
 * Tries corners in order tl → tr → bl → br, then a bottom strip.
 */
export function pickPathPanelPlacement(
  overlayRect: DOMRectReadOnly,
  itemRect: DOMRectReadOnly,
  panelWidth: number,
  panelHeight: number,
  pad: number,
  inset = 8,
): PathPanelPlacement {
  const corners: Exclude<PathPanelPlacement, "strip">[] = ["tl", "tr", "bl", "br"];
  for (const c of corners) {
    const candidate = rectForCorner(overlayRect, panelWidth, panelHeight, inset, c);
    if (!rectsOverlap(itemRect, candidate, pad)) return c;
  }
  const strip = rectForStrip(overlayRect, inset);
  if (!rectsOverlap(itemRect, strip, pad)) return "strip";
  return "br";
}
