import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const candidates = [
  path.join(standaloneRoot, "server.js"),
  path.join(standaloneRoot, path.basename(projectRoot), "server.js"),
];
let serverPath;

for (const candidate of candidates) {
  try {
    await access(candidate);
    serverPath = candidate;
    break;
  } catch {
    // Try the next supported standalone layout.
  }
}

if (!serverPath) {
  throw new Error("Could not locate the built WKE Deploy server. Run npm run build first.");
}

await import(pathToFileURL(serverPath).href);
