import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const candidates = [standaloneRoot, path.join(standaloneRoot, path.basename(projectRoot))];
let standaloneAppRoot;

for (const candidate of candidates) {
  try {
    await access(path.join(candidate, "server.js"));
    standaloneAppRoot = candidate;
    break;
  } catch {
    // Try the next supported standalone layout.
  }
}

if (!standaloneAppRoot) {
  throw new Error("Could not locate the Next.js standalone server after build.");
}

await mkdir(path.join(standaloneAppRoot, ".next"), { recursive: true });
await cp(path.join(projectRoot, ".next", "static"), path.join(standaloneAppRoot, ".next", "static"), {
  recursive: true,
});

if (standaloneAppRoot !== standaloneRoot) {
  const nestedServer = `./${path.basename(projectRoot)}/server.js`;
  await writeFile(
    path.join(standaloneRoot, "server.js"),
    [
      '"use strict";',
      'process.env.HOSTNAME = "0.0.0.0";',
      `require(${JSON.stringify(nestedServer)});`,
      "",
    ].join("\n"),
  );
}

const deployRoot = path.join(projectRoot, "dist");
await rm(deployRoot, { recursive: true, force: true });
await cp(standaloneRoot, deployRoot, { recursive: true });

console.log("Prepared the WKE Deploy standalone runtime in dist/.");
