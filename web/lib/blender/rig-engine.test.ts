import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { applyRigFrame, rigViewBox, sampleRigTrack } from "@/lib/blender/rig-engine";
import { parseRigDocument, sceneById } from "@/lib/blender/load-scene";

const dogFixturePath = path.join(process.cwd(), "public", "pet", "dog-poses.json");

function loadDogDocument() {
  const raw = JSON.parse(fs.readFileSync(dogFixturePath, "utf8"));
  return parseRigDocument(raw);
}

describe("parseRigDocument (dog-poses.json)", () => {
  it("loads three scenes", () => {
    const doc = loadDogDocument();
    expect(doc.scenes).toHaveLength(3);
    expect(sceneById(doc, "scene-standing")).toBeDefined();
    expect(sceneById(doc, "scene-happy")).toBeDefined();
    expect(sceneById(doc, "scene-downward")).toBeDefined();
  });
});

describe("sampleRigTrack", () => {
  it("samples tail rotation at standing idle key times", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-standing")!;
    const tail = scene.tracks.g62803!;
    const at0 = sampleRigTrack(0, tail, scene.duration);
    const at1000 = sampleRigTrack(1000, tail, scene.duration);
    expect(at0.rotate).toBe(0);
    expect(at1000.rotate).toBeCloseTo(6, 3);
  });

  it("loops with modulo duration", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-standing")!;
    const tail = scene.tracks.g62803!;
    const a = sampleRigTrack(0, tail, scene.duration);
    const b = sampleRigTrack(scene.duration, tail, scene.duration);
    expect(b.rotate).toBeCloseTo(a.rotate, 5);
  });
});

describe("rigViewBox", () => {
  it("uses the embedded SVG viewBox, not editor world viewport", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-standing")!;
    expect(rigViewBox(scene)).toBe("0 0 210 297");
  });
});

describe("applyRigFrame", () => {
  it("applies transforms without throwing", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-standing")!;
    const dom = new JSDOM(`<div id="root">${scene.rawSvgString}</div>`, {
      contentType: "text/html",
    });
    const svg = dom.window.document.querySelector("svg")!;
    expect(() => applyRigFrame(svg, scene, 1000)).not.toThrow();
    const tail = svg.querySelector("#g62803") as HTMLElement;
    expect(tail.style.transform).toContain("rotate");
  });

  it("does not apply CSS to snout nested under animated head", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-standing")!;
    const dom = new JSDOM(`<div id="root">${scene.rawSvgString}</div>`, {
      contentType: "text/html",
    });
    const svg = dom.window.document.querySelector("svg")!;
    applyRigFrame(svg, scene, 1000);
    const snout = svg.querySelector("#g62859") as HTMLElement;
    expect(snout.style.transform).toBe("");
  });

  it("does not apply CSS to paw group nested under animated leg", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-standing")!;
    const dom = new JSDOM(`<div id="root">${scene.rawSvgString}</div>`, {
      contentType: "text/html",
    });
    const svg = dom.window.document.querySelector("svg")!;
    applyRigFrame(svg, scene, 1000);
    const paw = svg.querySelector("#g62651") as HTMLElement;
    expect(paw.style.transform).toBe("");
  });

  it("animates body and legs at standing idle mid-breath", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-standing")!;
    const dom = new JSDOM(`<div id="root">${scene.rawSvgString}</div>`, {
      contentType: "text/html",
    });
    const svg = dom.window.document.querySelector("svg")!;
    applyRigFrame(svg, scene, 2000);
    const body = svg.querySelector("#g62635") as HTMLElement;
    const frontLeg = svg.querySelector("#g62467") as HTMLElement;
    expect(body.style.transform).toContain("scale");
    expect(frontLeg.style.transform).toContain("rotate");
  });
});

describe("scene-downward (playful downward dog)", () => {
  it("uses the studio downward body pose at t=0", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-downward")!;
    const body = scene.tracks.g62635!;
    const at0 = sampleRigTrack(0, body, scene.duration);
    expect(at0.x).toBeCloseTo(-14.086616332407004, 5);
    expect(at0.y).toBeCloseTo(-62.614285714285714, 5);
    expect(at0.rotate).toBeCloseTo(-2.057989934638748, 5);
    expect(at0.scale).toBeCloseTo(0.4820889553391513, 5);
  });

  it("animates body rotation mid-scene", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-downward")!;
    const body = scene.tracks.g62635!;
    const mid = sampleRigTrack(618, body, scene.duration);
    expect(mid.rotate).toBeCloseTo(-42.69093699656817, 5);
  });
});

describe("scene-happy (two-leg standing)", () => {
  it("uses the studio happy body pose at t=0", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-happy")!;
    const body = scene.tracks.g62635!;
    const at0 = sampleRigTrack(0, body, scene.duration);
    expect(at0.x).toBeCloseTo(-4.789746885855147, 5);
    expect(at0.y).toBeCloseTo(7.6184436883024365, 5);
    expect(at0.rotate).toBeCloseTo(49.60355115722281, 5);
    expect(at0.scale).toBeCloseTo(0.9749743672576708, 5);
  });

  it("applies body and front-leg transforms at t=0 without throwing", () => {
    const doc = loadDogDocument();
    const scene = sceneById(doc, "scene-happy")!;
    const dom = new JSDOM(`<div id="root">${scene.rawSvgString}</div>`, {
      contentType: "text/html",
    });
    const svg = dom.window.document.querySelector("svg")!;
    expect(() => applyRigFrame(svg, scene, 0)).not.toThrow();
    const body = svg.querySelector("#g62635") as HTMLElement;
    const frontLeg = svg.querySelector("#g62467") as HTMLElement;
    expect(body.style.transform).not.toBe("");
    expect(frontLeg.style.transform).not.toBe("");
  });
});
