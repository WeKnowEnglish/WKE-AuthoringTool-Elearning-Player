/**
 * Adventure / island path: perimeter loop with an inner shortcut row.
 * Produces a wider, more interesting silhouette than a plain snake.
 */
function buildIslandPath(pathLength: number): { col: number; row: number }[] {
  const cols = Math.max(8, Math.min(14, Math.ceil(pathLength / 3)));
  const rows = Math.max(5, Math.ceil(pathLength / cols) + 2);
  const cells: { col: number; row: number }[] = [];

  // Top row left → right
  for (let col = 0; col < cols && cells.length < pathLength; col++) {
    cells.push({ col, row: 0 });
  }
  // Right column down
  for (let row = 1; row < rows - 1 && cells.length < pathLength; row++) {
    cells.push({ col: cols - 1, row });
  }
  // Bottom row right → left
  for (let col = cols - 1; col >= 0 && cells.length < pathLength; col--) {
    cells.push({ col, row: rows - 1 });
  }
  // Left column up (stop before top-left corner duplicate)
  for (let row = rows - 2; row > 0 && cells.length < pathLength; row--) {
    cells.push({ col: 0, row });
  }
  // Inner bridge across middle row
  const midRow = Math.floor(rows / 2);
  for (let col = 1; col < cols - 1 && cells.length < pathLength; col++) {
    cells.push({ col, row: midRow });
  }
  // Fill remainder with a secondary inner row
  const innerRow = Math.max(1, midRow - 1);
  for (let col = cols - 2; col >= 1 && cells.length < pathLength; col--) {
    cells.push({ col, row: innerRow });
  }

  while (cells.length < pathLength) {
    cells.push({ col: cells.length % cols, row: rows - 2 });
  }

  return cells.slice(0, pathLength);
}

export function islandGridForPathIndex(pathIndex: number, pathLength: number): { col: number; row: number } {
  const path = buildIslandPath(pathLength);
  return path[pathIndex] ?? { col: 0, row: 0 };
}

export function islandGridBounds(pathLength: number): { cols: number; rows: number } {
  const cols = Math.max(8, Math.min(14, Math.ceil(pathLength / 3)));
  const rows = Math.max(5, Math.ceil(pathLength / cols) + 2);
  return { cols, rows };
}
