import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import {
  applyInteractState,
  applyInteractStateById,
  resolveBlendInteractStateId,
  sampleTrack,
  splashInteractStateId,
} from "@/lib/blender/engine";
import { parseBlenderDocument, primarySceneFromDocument } from "@/lib/blender/load-scene";
import {
  recipeMatchesFruits,
  pickRecipeForSession,
  resolveJuiceColor,
  DRINK_RECIPES,
} from "@/lib/blender/drink-recipes";
import fs from "fs";
import path from "path";

const fixturePath = path.join(
  process.cwd(),
  "public",
  "pet",
  "blender-scene.json",
);

function loadFixtureScene() {
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  return primarySceneFromDocument(parseBlenderDocument(raw));
}

describe("sampleTrack", () => {
  it("returns first keyframe at t=0", () => {
    const scene = loadFixtureScene();
    const track = scene.tracks.layer1!;
    const sample = sampleTrack(0, track, scene.duration);
    expect(sample).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  it("interpolates between keyframes", () => {
    const scene = loadFixtureScene();
    const track = scene.tracks.layer1!;
    const sample = sampleTrack(75, track, scene.duration);
    expect(sample.x).toBeCloseTo(1, 5);
    expect(sample.y).toBeCloseTo(-0.75, 5);
    expect(sample.rotate).toBeCloseTo(0.5, 5);
  });

  it("loops with modulo duration", () => {
    const scene = loadFixtureScene();
    const track = scene.tracks.layer1!;
    const a = sampleTrack(0, track, scene.duration);
    const b = sampleTrack(scene.duration, track, scene.duration);
    expect(b).toEqual(a);
  });
});

describe("applyInteractState", () => {
  it("toggles layer visibility in SVG DOM", () => {
    const scene = loadFixtureScene();
    const dom = new JSDOM(
      `<div id="root">${scene.rawSvgString}</div>`,
      { contentType: "text/html" },
    );
    const root = dom.window.document.getElementById("root")!;
    const svg = root.querySelector("svg")!;

    applyInteractState(svg, scene.interact.states.powerOff!);
    const knobOff = svg.querySelector("#g7067") as HTMLElement;
    const knobOn = svg.querySelector("#g3426") as HTMLElement;
    expect(knobOff.style.display).toBe("inline");
    expect(knobOn.style.display).toBe("none");

    applyInteractState(svg, scene.interact.states.powerOn!);
    expect(knobOff.style.display).toBe("none");
    expect(knobOn.style.display).toBe("inline");
  });

  it("shows orange splash layers after powerOff (Illustrator display:none override)", () => {
    const scene = loadFixtureScene();
    const dom = new JSDOM(
      `<div id="root">${scene.rawSvgString}</div>`,
      { contentType: "text/html" },
    );
    const svg = dom.window.document.querySelector("svg")!;

    applyInteractState(svg, scene.interact.states.powerOff!);
    applyInteractState(svg, scene.interact.states.orangeLeft!);

    const splash = svg.querySelector("#g7131") as HTMLElement;
    expect(splash.style.display).toBe("inline");
    expect(splash.style.visibility).toBe("visible");
  });
});

describe("resolveBlendInteractStateId", () => {
  it("returns splash state ids for orange and pink", () => {
    const scene = loadFixtureScene();
    expect(resolveBlendInteractStateId(scene, "orange", 0)).toBe("orangeLeft");
    expect(resolveBlendInteractStateId(scene, "pink", 2)).toBe("pinkRight");
  });
});

describe("applyInteractStateById", () => {
  it("falls back to powerOn for unknown state ids", () => {
    const scene = loadFixtureScene();
    const dom = new JSDOM(
      `<div id="root">${scene.rawSvgString}</div>`,
      { contentType: "text/html" },
    );
    const svg = dom.window.document.querySelector("svg")!;
    applyInteractStateById(svg, scene, "not_a_real_state");
    const knobOn = svg.querySelector("#g3426") as HTMLElement;
    expect(knobOn.style.display).toBe("inline");
  });
});

describe("splashInteractStateId", () => {
  it("maps color and position to state ids", () => {
    expect(splashInteractStateId("orange", "left")).toBe("orangeLeft");
    expect(splashInteractStateId("pink", "right")).toBe("pinkRight");
  });
});

describe("recipeMatchesFruits", () => {
  it("matches order-independent fruit sets", () => {
    const recipe = DRINK_RECIPES.find((r) => r.id === "orange_juice")!;
    expect(recipeMatchesFruits(recipe, ["banana", "orange"])).toBe(true);
    expect(recipeMatchesFruits(recipe, ["orange"])).toBe(false);
    expect(recipeMatchesFruits(recipe, ["orange", "apple"])).toBe(false);
  });
});

describe("pickRecipeForSession", () => {
  it("returns a recipe from the pool", () => {
    const recipe = pickRecipeForSession(() => 0);
    expect(DRINK_RECIPES).toContainEqual(recipe);
  });
});

describe("resolveJuiceColor", () => {
  it("uses recipe juiceColor when set", () => {
    const recipe = DRINK_RECIPES.find((r) => r.id === "berry_smoothie")!;
    expect(resolveJuiceColor(recipe, [])).toBe("pink");
  });

  it("infers pink from mostly pink fruits when recipe color missing", () => {
    const recipe = {
      ...DRINK_RECIPES[0]!,
      juiceColor: undefined as unknown as "orange",
    };
    expect(resolveJuiceColor(recipe, ["strawberry", "watermelon"])).toBe("pink");
  });

  it("defaults to orange", () => {
    const recipe = {
      ...DRINK_RECIPES[0]!,
      juiceColor: undefined as unknown as "orange",
    };
    expect(resolveJuiceColor(recipe, ["mango", "pineapple"])).toBe("orange");
  });
});
