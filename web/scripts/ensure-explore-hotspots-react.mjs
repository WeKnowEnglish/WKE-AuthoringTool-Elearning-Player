/**
 * Next typechecks ../packages/explore-hotspots-play/*.tsx outside web/,
 * so module resolution never sees web/node_modules/react. Link the app's
 * React (+ types) into the package before build/typecheck.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageNodeModules = path.resolve(
  webRoot,
  "../packages/explore-hotspots-play/node_modules",
);
const webNodeModules = path.join(webRoot, "node_modules");

const packagesToLink = [
  "react",
  "react-dom",
  "scheduler",
  "@types/react",
  "@types/react-dom",
  "csstype",
];

function linkOne(name) {
  const target = path.join(webNodeModules, ...name.split("/"));
  const linkPath = path.join(packageNodeModules, ...name.split("/"));
  if (!fs.existsSync(target)) {
    console.warn(`[ensure-explore-hotspots-react] skip missing ${name}`);
    return;
  }
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.rmSync(linkPath, { recursive: true, force: true });
  const type = process.platform === "win32" ? "junction" : "dir";
  fs.symlinkSync(target, linkPath, type);
  console.log(`[ensure-explore-hotspots-react] linked ${name}`);
}

fs.mkdirSync(packageNodeModules, { recursive: true });
for (const name of packagesToLink) {
  linkOne(name);
}
