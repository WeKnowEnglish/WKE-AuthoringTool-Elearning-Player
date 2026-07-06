import { describe, expect, it } from "vitest";
import {
  GARDEN_SHEET_INTERIOR_GUTTER_TOLERANCE,
  keyOutBorderConnectedGutterInImageData,
  keyOutGutterInImageData,
  keyOutInteriorGutterHolesInImageData,
  LETTER_FRUIT_GUTTER_KEY_OPTIONS,
} from "@/lib/topdown/gutter-key-sprite";
import { isLetterFruitSheetBackground } from "@/lib/topdown/sprite-edge-detection";

const GUTTER = { r: 58, g: 58, b: 58 };
const SPRITE = { r: 120, g: 80, b: 200 };
const HIGHLIGHT = { r: 90, g: 90, b: 95 };
/** Art shading within border tol but outside strict interior tol. */
const SHADING = { r: 70, g: 70, b: 72 };
/** Dark soil/shadow within RGB distance of gutter but below luminance floor. */
const DARK_SHADOW = { r: 35, g: 50, b: 30 };

function makeImage(width: number, height: number, fill: typeof GUTTER): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill.r;
    data[i + 1] = fill.g;
    data[i + 2] = fill.b;
    data[i + 3] = 255;
  }
  return { data, width, height } as ImageData;
}

function setPixel(image: ImageData, x: number, y: number, color: typeof GUTTER) {
  const i = (y * image.width + x) * 4;
  image.data[i] = color.r;
  image.data[i + 1] = color.g;
  image.data[i + 2] = color.b;
  image.data[i + 3] = 255;
}

function alphaAt(image: ImageData, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3]!;
}

function fillDonutHole(image: ImageData, innerSize: number) {
  const { width, height } = image;
  const x0 = Math.floor((width - innerSize) / 2);
  const y0 = Math.floor((height - innerSize) / 2);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const onBorder = x === 1 || x === width - 2 || y === 1 || y === height - 2;
      const inHole =
        x >= x0 &&
        x < x0 + innerSize &&
        y >= y0 &&
        y < y0 + innerSize;
      if (onBorder || !inHole) {
        setPixel(image, x, y, SPRITE);
      }
    }
  }
}

function fillRing(image: ImageData, centerColor: typeof GUTTER) {
  for (let y = 1; y <= 3; y++) {
    for (let x = 1; x <= 3; x++) {
      if (x === 2 && y === 2) {
        setPixel(image, x, y, centerColor);
      } else {
        setPixel(image, x, y, SPRITE);
      }
    }
  }
}

describe("gutter-key-sprite", () => {
  it("keys border-connected gutter pixels to transparent", () => {
    const image = makeImage(4, 4, GUTTER);
    setPixel(image, 1, 1, SPRITE);

    keyOutGutterInImageData(image, GUTTER, 32);

    expect(alphaAt(image, 0, 0)).toBe(0);
    expect(alphaAt(image, 1, 1)).toBe(255);
  });

  it("keys interior gutter holes to transparent by default", () => {
    const image = makeImage(5, 5, GUTTER);
    fillRing(image, GUTTER);

    keyOutGutterInImageData(image, GUTTER, 32);

    expect(alphaAt(image, 0, 0)).toBe(0);
    expect(alphaAt(image, 2, 2)).toBe(0);
    expect(alphaAt(image, 1, 1)).toBe(255);
  });

  it("keys a larger donut hole (letter-A style cavity)", () => {
    const image = makeImage(9, 9, GUTTER);
    fillDonutHole(image, 5);

    keyOutGutterInImageData(image, GUTTER, 32);

    expect(alphaAt(image, 0, 0)).toBe(0);
    expect(alphaAt(image, 4, 4)).toBe(0);
    expect(alphaAt(image, 1, 1)).toBe(255);
  });

  it("preserves interior non-gutter art colors", () => {
    const image = makeImage(5, 5, GUTTER);
    fillRing(image, HIGHLIGHT);

    keyOutGutterInImageData(image, GUTTER, 32);

    expect(alphaAt(image, 2, 2)).toBe(255);
  });

  it("preserves interior shading within border tol but outside strict interior tol", () => {
    const image = makeImage(5, 5, GUTTER);
    fillRing(image, SHADING);

    keyOutGutterInImageData(image, GUTTER, 42);

    expect(alphaAt(image, 2, 2)).toBe(255);
  });

  it("letter-fruit classifier preserves dark shadow connected to border gutter", () => {
    const image = makeImage(5, 5, GUTTER);
    setPixel(image, 1, 1, DARK_SHADOW);
    setPixel(image, 2, 1, DARK_SHADOW);

    keyOutGutterInImageData(image, GUTTER, 42, {
      isBackground: isLetterFruitSheetBackground,
      keyInteriorHoles: false,
    });

    expect(alphaAt(image, 1, 1)).toBe(255);
    expect(alphaAt(image, 2, 1)).toBe(255);
    expect(alphaAt(image, 0, 0)).toBe(0);
  });

  it("letter-fruit preset preserves dark interior shadow but still keys enclosed gutter", () => {
    const image = makeImage(5, 5, GUTTER);
    fillRing(image, DARK_SHADOW);

    keyOutGutterInImageData(image, GUTTER, 42, LETTER_FRUIT_GUTTER_KEY_OPTIONS);

    expect(alphaAt(image, 2, 2)).toBe(255);

    const holeImage = makeImage(5, 5, GUTTER);
    fillRing(holeImage, GUTTER);
    keyOutGutterInImageData(holeImage, GUTTER, 42, LETTER_FRUIT_GUTTER_KEY_OPTIONS);
    expect(alphaAt(holeImage, 2, 2)).toBe(0);
  });

  it("can opt out of interior hole knockout", () => {
    const image = makeImage(5, 5, GUTTER);
    fillRing(image, GUTTER);

    keyOutGutterInImageData(image, GUTTER, 32, { keyInteriorHoles: false });

    expect(alphaAt(image, 0, 0)).toBe(0);
    expect(alphaAt(image, 2, 2)).toBe(255);
  });

  it("respects minInteriorHolePixels for small interior blobs", () => {
    const image = makeImage(5, 5, GUTTER);
    fillRing(image, GUTTER);

    keyOutGutterInImageData(image, GUTTER, 42, { minInteriorHolePixels: 100 });

    expect(alphaAt(image, 2, 2)).toBe(255);
  });

  it("keys large interior holes when minInteriorHolePixels is set", () => {
    const image = makeImage(9, 9, GUTTER);
    fillDonutHole(image, 5);

    keyOutGutterInImageData(image, GUTTER, 42, { minInteriorHolePixels: 4 });

    expect(alphaAt(image, 4, 4)).toBe(0);
  });

  it("pass 2 leaves already-transparent pixels unchanged", () => {
    const image = makeImage(4, 4, GUTTER);
    setPixel(image, 1, 1, SPRITE);
    keyOutBorderConnectedGutterInImageData(image, GUTTER, 32);

    const before = new Uint8ClampedArray(image.data);
    keyOutInteriorGutterHolesInImageData(
      image,
      GUTTER,
      GARDEN_SHEET_INTERIOR_GUTTER_TOLERANCE,
    );

    expect(alphaAt(image, 1, 1)).toBe(255);
    expect(alphaAt(image, 0, 0)).toBe(before[(0 * 4) + 3]);
  });
});
