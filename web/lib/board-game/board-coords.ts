export function elementTopLeftWithin(
  element: HTMLElement,
  container: HTMLElement,
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = element;

  while (current && current !== container) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return { x, y };
}

export function elementCenterWithin(
  element: HTMLElement,
  container: HTMLElement,
): { x: number; y: number } {
  const topLeft = elementTopLeftWithin(element, container);
  return {
    x: topLeft.x + element.offsetWidth / 2,
    y: topLeft.y + element.offsetHeight / 2,
  };
}

/** Bottom-center anchor where a pawn stands on a tile. */
export function pawnAnchorWithin(
  tile: HTMLElement,
  board: HTMLElement,
  stackOffsetX = 0,
  pawnHeight = 32,
): { x: number; y: number } {
  const topLeft = elementTopLeftWithin(tile, board);
  return {
    x: topLeft.x + tile.offsetWidth / 2 + stackOffsetX,
    y: topLeft.y + tile.offsetHeight - pawnHeight / 2 - 4,
  };
}

export function pawnTopLeftFromAnchor(
  anchor: { x: number; y: number },
  pawnWidth: number,
  pawnHeight: number,
): { left: number; top: number } {
  return {
    left: anchor.x - pawnWidth / 2,
    top: anchor.y - pawnHeight / 2,
  };
}
