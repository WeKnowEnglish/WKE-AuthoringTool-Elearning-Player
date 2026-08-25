import type {
  LearningTrackPresentationElement,
  LearningTrackPresentationShapeElement,
  LearningTrackPresentationSlide,
  LearningTrackPresentationTextElement,
} from "@/lib/learning-tracks/composition-types";

function newElementId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createPresentationTextElement(
  overrides: Partial<LearningTrackPresentationTextElement> = {},
): LearningTrackPresentationTextElement {
  return {
    id: overrides.id ?? newElementId("text"),
    kind: "text",
    text: overrides.text ?? "New text",
    textColor: overrides.textColor ?? "#0f172a",
    textSizePx: overrides.textSizePx ?? 28,
    showCard: overrides.showCard ?? true,
    xPercent: overrides.xPercent ?? 20,
    yPercent: overrides.yPercent ?? 35,
    widthPercent: overrides.widthPercent ?? 60,
    heightPercent: overrides.heightPercent ?? 22,
    zIndex: overrides.zIndex ?? 1,
  };
}
export function createPresentationShapeElement(
  shape: LearningTrackPresentationShapeElement["shape"] = "rectangle",
  overrides: Partial<LearningTrackPresentationShapeElement> = {},
): LearningTrackPresentationShapeElement {
  return {
    id: overrides.id ?? newElementId("shape"),
    kind: "shape",
    shape,
    fillColor: overrides.fillColor ?? "#38bdf8",
    xPercent: overrides.xPercent ?? 30,
    yPercent: overrides.yPercent ?? 30,
    widthPercent: overrides.widthPercent ?? (shape === "ellipse" ? 24 : 40),
    heightPercent: overrides.heightPercent ?? 24,
    zIndex: overrides.zIndex ?? 0,
  };
}

/** Convert V1 fixed heading/body slides without mutating the saved draft. */
export function presentationElementsForSlide(
  slide: LearningTrackPresentationSlide,
): LearningTrackPresentationElement[] {
  if (slide.elements !== undefined) return slide.elements;

  const elements: LearningTrackPresentationElement[] = [];
  const title = slide.title.trim();
  const bodyText = slide.bodyText.trim();
  if (title) {
    elements.push(
      createPresentationTextElement({
        id: `${slide.id}-title`,
        text: title,
        textSizePx: 40,
        xPercent: 7,
        yPercent: 7,
        widthPercent: 86,
        heightPercent: 15,
        zIndex: 2,
      }),
    );
  }
  if (bodyText) {
    elements.push(
      createPresentationTextElement({
        id: `${slide.id}-body`,
        text: bodyText,
        textColor: "#1e293b",
        textSizePx: 27,
        xPercent: 9,
        yPercent: title ? 28 : 12,
        widthPercent: 82,
        heightPercent: title ? 60 : 76,
        zIndex: 1,
      }),
    );
  }
  return elements;
}

export function clampPresentationElement(
  element: LearningTrackPresentationElement,
): LearningTrackPresentationElement {
  const widthPercent = Math.min(100, Math.max(5, element.widthPercent));
  const heightPercent = Math.min(100, Math.max(5, element.heightPercent));
  return {
    ...element,
    widthPercent,
    heightPercent,
    xPercent: Math.min(100 - widthPercent, Math.max(0, element.xPercent)),
    yPercent: Math.min(100 - heightPercent, Math.max(0, element.yPercent)),
  };
}
