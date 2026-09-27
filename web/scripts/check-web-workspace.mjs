import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_SIBLING_PACKAGES = [
  "explore-hotspots-play",
  "explore-hotspots-author",
];

/**
 * Hostinger (and any self-host) must clone the full git repo and set the
 * Node.js app root to `web/`. Building a copy of `web/` alone breaks the
 * `file:../packages/...` dependencies.
 */
export function validateWebWorkspace(webRoot, options = {}) {
  const exists = options.exists ?? existsSync;
  const errors = [];
  for (const name of REQUIRED_SIBLING_PACKAGES) {
    const packageJson = join(webRoot, "..", "packages", name, "package.json");
    if (!exists(packageJson)) {
      errors.push(
        `Missing packages/${name}. Set the Hostinger root directory to web/ inside the full repository clone, not a copy of web/ alone.`,
      );
    }
  }
  return errors;
}

export function assertWebWorkspace(webRoot = join(dirname(fileURLToPath(import.meta.url)), "..")) {
  const errors = validateWebWorkspace(webRoot);
  if (errors.length) {
    throw new Error(`Web workspace layout is incomplete:\n- ${errors.join("\n- ")}`);
  }
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assertWebWorkspace();
  console.log("Web workspace layout: OK");
}
