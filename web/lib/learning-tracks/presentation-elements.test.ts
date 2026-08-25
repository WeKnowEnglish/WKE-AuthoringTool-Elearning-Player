import { describe, expect, it } from "vitest";
import {
  clampPresentationElement,
  createPresentationShapeElement,
  presentationElementsForSlide,
} from "@/lib/learning-tracks/presentation-elements";

describe("learning-track presentation elements", () => {
  it("migrates legacy heading and body fields into movable text elements", () => {
    const elements = presentationElementsForSlide({
      id: "slide-one",
      title: "A heading",
      bodyText: "A useful explanation.",
      backgroundColor: "#ffffff",
      imageFit: "cover",
    });
    expect(elements).toHaveLength(2);
    expect(elements.map((element) => element.kind)).toEqual(["text", "text"]);
    expect(elements[0]).toMatchObject({ text: "A heading", textSizePx: 40 });
  });

  it("honours an intentionally empty editable canvas", () => {
    expect(
      presentationElementsForSlide({
        id: "blank",
        title: "Legacy title should not return",
        bodyText: "Legacy body should not return",
        backgroundColor: "#ffffff",
        imageFit: "cover",
        elements: [],
      }),
    ).toEqual([]);
  });

  it("clamps moved and resized shapes inside the slide", () => {
    const shape = createPresentationShapeElement("ellipse", {
      xPercent: 95,
      yPercent: -10,
      widthPercent: 30,
      heightPercent: 120,
    });
    expect(clampPresentationElement(shape)).toMatchObject({
      xPercent: 70,
      yPercent: 0,
      widthPercent: 30,
      heightPercent: 100,
    });
  });
});
