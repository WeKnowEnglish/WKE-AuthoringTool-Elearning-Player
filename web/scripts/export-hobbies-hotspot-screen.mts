import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import hobbiesActivity from "../content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import { wkeActivityToExploreHotspotsPayload } from "../lib/wke-activity/to-lesson-screen";

const payload = wkeActivityToExploreHotspotsPayload(hobbiesActivity);
const out = resolve(
  "C:/Education/1 We Know English Center/7. Content Creation/WKE Animator/svg-edu-studio/src/lib/learning-tracks/fixtures/hobbies-hotspots.screen.json",
);
writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${out} (${payload.hotspots.length} hotspots)`);
