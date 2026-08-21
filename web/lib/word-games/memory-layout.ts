export type MemoryGridLayout = {
  columns: number;
  rows: number;
};

/**
 * Pick the largest readable 4:5-ish card grid for the available panel.
 * Six rows is the ceiling so large decks do not turn into unreadable strips.
 */
export function chooseMemoryGridLayout(
  cardCount: number,
  width: number,
  height: number,
  gap = 8,
): MemoryGridLayout {
  const count = Math.max(1, Math.round(cardCount));
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 640;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 480;
  const maxColumns = Math.min(6, count);
  let best: (MemoryGridLayout & { scale: number; empty: number }) | null = null;

  for (let columns = 2; columns <= maxColumns; columns += 1) {
    const rows = Math.ceil(count / columns);
    if (rows > 6) continue;
    const cellWidth = (safeWidth - gap * (columns - 1)) / columns;
    const cellHeight = (safeHeight - gap * (rows - 1)) / rows;
    if (cellWidth <= 0 || cellHeight <= 0) continue;
    const scale = Math.min(cellWidth / 4, cellHeight / 5);
    const empty = columns * rows - count;
    if (
      !best ||
      scale > best.scale + 0.01 ||
      (Math.abs(scale - best.scale) <= 0.01 && empty < best.empty)
    ) {
      best = { columns, rows, scale, empty };
    }
  }

  if (best) return { columns: best.columns, rows: best.rows };
  const columns = Math.min(maxColumns, Math.max(2, Math.ceil(count / 6)));
  return { columns, rows: Math.ceil(count / columns) };
}
