export type StampDef = {
  id: string;
  label: string;
  /** Inline SVG markup for the stamp glyph (no external fetch). */
  svg: string;
};

/** Curated ESL vocab stamps — no emoji, no arbitrary uploads. */
export const WHITEBOARD_STAMP_PACK: StampDef[] = [
  {
    id: "bed",
    label: "bed",
    svg: `<rect x="8" y="28" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="8" y="18" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="3"/>`,
  },
  {
    id: "desk",
    label: "desk",
    svg: `<rect x="10" y="24" width="44" height="8" fill="none" stroke="currentColor" stroke-width="3"/><line x1="14" y1="32" x2="14" y2="48" stroke="currentColor" stroke-width="3"/><line x1="50" y1="32" x2="50" y2="48" stroke="currentColor" stroke-width="3"/>`,
  },
  {
    id: "chair",
    label: "chair",
    svg: `<rect x="18" y="14" width="28" height="20" fill="none" stroke="currentColor" stroke-width="3"/><line x1="18" y1="34" x2="18" y2="50" stroke="currentColor" stroke-width="3"/><line x1="46" y1="34" x2="46" y2="50" stroke="currentColor" stroke-width="3"/><line x1="18" y1="34" x2="46" y2="34" stroke="currentColor" stroke-width="3"/>`,
  },
  {
    id: "lamp",
    label: "lamp",
    svg: `<path d="M20 28 L44 28 L32 12 Z" fill="none" stroke="currentColor" stroke-width="3"/><line x1="32" y1="28" x2="32" y2="48" stroke="currentColor" stroke-width="3"/><line x1="22" y1="48" x2="42" y2="48" stroke="currentColor" stroke-width="3"/>`,
  },
  {
    id: "window",
    label: "window",
    svg: `<rect x="12" y="12" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3"/><line x1="32" y1="12" x2="32" y2="52" stroke="currentColor" stroke-width="3"/><line x1="12" y1="32" x2="52" y2="32" stroke="currentColor" stroke-width="3"/>`,
  },
  {
    id: "star",
    label: "star",
    svg: `<polygon points="32,8 38,24 56,24 42,34 48,50 32,40 16,50 22,34 8,24 26,24" fill="none" stroke="currentColor" stroke-width="3"/>`,
  },
];

export function getStamp(stampId: string): StampDef | undefined {
  return WHITEBOARD_STAMP_PACK.find((s) => s.id === stampId);
}

export function stampDataUrl(stampId: string, color = "#0f172a"): string {
  const stamp = getStamp(stampId);
  if (!stamp) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" color="${color}">${stamp.svg.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
