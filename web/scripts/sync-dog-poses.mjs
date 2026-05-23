/**
 * Copy WKE Animator dog-poses build output into public/pet for the Lesson Player.
 *
 * Run from Lesson Player/web:
 *   node scripts/sync-dog-poses.mjs
 *
 * Rebuild source first (from WKE Animator repo root):
 *   node svg-edu-studio/scripts/build-dog-poses.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const SOURCE = path.resolve(
  WEB_ROOT,
  "../../WKE Animator/Projects/dog-poses.wkeanim.json",
);
const DEST = path.join(WEB_ROOT, "public", "pet", "dog-poses.json");

if (!fs.existsSync(SOURCE)) {
  console.error(`Missing source: ${SOURCE}`);
  console.error("Run build-dog-poses.mjs in WKE Animator first.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.copyFileSync(SOURCE, DEST);

const doc = JSON.parse(fs.readFileSync(DEST, "utf8"));
console.log(`Synced ${DEST}`);
console.log(`  Scenes: ${doc.scenes.map((s) => s.name).join(", ")}`);
