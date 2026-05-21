function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Colored square placeholder until real photos are uploaded. */
export function readingSquareSvgDataUrl(opts: {
  fillHex: string;
  label?: string;
}): string {
  const fill = opts.fillHex.startsWith("#") ? opts.fillHex : `#${opts.fillHex}`;
  const label = opts.label?.trim() ? escapeXml(opts.label.trim()) : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${fill}" rx="12"/>
  ${
    label
      ? `<text x="200" y="210" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="600" fill="rgba(15,23,42,0.45)">${label}</text>`
      : ""
  }
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Wide park scene placeholder for cloze section hero. */
export function readingParkSceneSvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <rect width="800" height="450" fill="#86efac"/>
  <rect y="300" width="800" height="150" fill="#4ade80"/>
  <circle cx="120" cy="80" r="48" fill="#fde047"/>
  <text x="400" y="240" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="700" fill="#14532d">Park</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
