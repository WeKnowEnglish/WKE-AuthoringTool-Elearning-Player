/** Build a clockwise inward spiral cell order for a square grid. */
function buildSpiralOrder(size: number): { col: number; row: number }[] {
  const order: { col: number; row: number }[] = [];
  let top = 0;
  let bottom = size - 1;
  let left = 0;
  let right = size - 1;

  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col++) order.push({ col, row: top });
    top++;
    for (let row = top; row <= bottom; row++) order.push({ col: right, row });
    right--;
    if (top <= bottom) {
      for (let col = right; col >= left; col--) order.push({ col, row: bottom });
      bottom--;
    }
    if (left <= right) {
      for (let row = bottom; row >= top; row--) order.push({ col: left, row });
      left++;
    }
  }

  return order;
}

export function spiralGridForPathIndex(pathIndex: number, pathLength: number): { col: number; row: number } {
  const size = Math.max(4, Math.ceil(Math.sqrt(pathLength)));
  const order = buildSpiralOrder(size);
  return order[pathIndex] ?? order[order.length - 1] ?? { col: 0, row: 0 };
}

export function spiralGridBounds(pathLength: number): { cols: number; rows: number } {
  const size = Math.max(4, Math.ceil(Math.sqrt(pathLength)));
  return { cols: size, rows: size };
}
