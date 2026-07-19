import { BOARD_HEIGHT, BOARD_WIDTH, type BoardBackground, type WhiteboardElement } from "@/lib/whiteboard/domain";
import { pointsToPath } from "@/lib/whiteboard/coordinates";
import { getStamp } from "@/lib/whiteboard/stamps";

export function renderElementToSvgMarkup(el: WhiteboardElement): string {
  if (el.type === "stroke") {
    return `<path d="${escapeAttr(pointsToPath(el.points))}" stroke="${escapeAttr(el.color)}" stroke-width="${el.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity}"/>`;
  }
  if (el.type === "text") {
    return `<text x="${el.x}" y="${el.y}" fill="${escapeAttr(el.color)}" font-size="${el.fontSize}" font-family="Nunito, system-ui, sans-serif">${escapeXml(el.text)}</text>`;
  }
  if (el.type === "shape") {
    if (el.shape === "rect") {
      return `<rect x="${el.x}" y="${el.y}" width="${Math.abs(el.width)}" height="${Math.abs(el.height)}" fill="${escapeAttr(el.fill)}" stroke="${escapeAttr(el.stroke)}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}"/>`;
    }
    if (el.shape === "ellipse") {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${Math.abs(el.width) / 2}" ry="${Math.abs(el.height) / 2}" fill="${escapeAttr(el.fill)}" stroke="${escapeAttr(el.stroke)}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}"/>`;
    }
    return `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" stroke="${escapeAttr(el.stroke)}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}" stroke-linecap="round"/>`;
  }
  const stamp = getStamp(el.stampId);
  const href = stamp
    ? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${stamp.svg.replace(/currentColor/g, "#0f172a")}</svg>`)}`
    : "";
  return `<image href="${escapeAttr(href)}" x="${el.x - el.size / 2}" y="${el.y - el.size / 2}" width="${el.size}" height="${el.size}"/>`;
}

export function boardToSvgString(input: {
  elements: WhiteboardElement[];
  background?: BoardBackground | null;
  annotations?: WhiteboardElement[];
}): string {
  const bg = input.background?.url
    ? `<image href="${escapeAttr(input.background.url)}" x="0" y="0" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" preserveAspectRatio="${input.background.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}" opacity="${input.background.opacity}"/>`
    : `<rect width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" fill="#f8fafc"/>`;

  const highlights = input.elements.filter((e) => e.type === "stroke" && e.strokeKind === "highlight");
  const rest = input.elements.filter((e) => !(e.type === "stroke" && e.strokeKind === "highlight"));
  const body = [...highlights, ...rest].map(renderElementToSvgMarkup).join("");
  const notes = (input.annotations ?? []).map(renderElementToSvgMarkup).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}">
  ${bg}
  ${body}
  ${notes}
</svg>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
