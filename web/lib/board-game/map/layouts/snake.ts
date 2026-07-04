/** Assign grid cells in a classic snake (boustrophedon) path left-to-right / right-to-left. */
export function snakeGridForPathIndex(pathIndex: number, columns: number): { col: number; row: number } {
  const row = Math.floor(pathIndex / columns);
  const posInRow = pathIndex % columns;
  const col = row % 2 === 1 ? columns - 1 - posInRow : posInRow;
  return { col, row };
}

export function snakeColumnsForLength(pathLength: number): number {
  const boardLength = pathLength - 1;
  if (boardLength <= 12) return 6;
  if (boardLength <= 20) return 10;
  if (boardLength <= 30) return 12;
  if (boardLength <= 40) return 14;
  if (boardLength <= 60) return 16;
  return 18;
}
