import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const candidates = [path.join(standaloneRoot, path.basename(projectRoot)), standaloneRoot];
let standaloneAppRoot;

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

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
await cp(standaloneAppRoot, deployRoot, { recursive: true });

const standaloneNodeModules = path.join(standaloneRoot, "node_modules");
if (
  standaloneAppRoot !== standaloneRoot &&
  (await exists(standaloneNodeModules)) &&
  !(await exists(path.join(deployRoot, "node_modules")))
) {
  await cp(standaloneNodeModules, path.join(deployRoot, "node_modules"), {
    recursive: true,
  });
}

await writeFile(
  path.join(deployRoot, "package.json"),
  `${JSON.stringify(
    {
      name: "wke-deploy-dashboard-runtime",
      version: "0.1.0",
      private: true,
      engines: { node: "24.x" },
      scripts: { start: "node server.js" },
    },
    null,
    2,
  )}\n`,
);

console.log("Prepared the WKE Deploy standalone runtime in dist/.");
