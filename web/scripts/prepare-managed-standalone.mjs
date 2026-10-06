import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = process.cwd();
const standaloneRoot = resolve(webRoot, ".next", "standalone");
const standaloneWebRoot = resolve(standaloneRoot, "web");
const standaloneServer = resolve(standaloneWebRoot, "server.js");

if (!existsSync(standaloneServer)) {
  throw new Error(`Next.js standalone server was not produced at ${standaloneServer}`);
}

function copyRequiredDirectory(relativeSource, relativeDestination) {
  const source = resolve(webRoot, relativeSource);
  const destination = resolve(standaloneWebRoot, relativeDestination);

  if (!existsSync(source)) {
    throw new Error(`Required Next.js runtime directory is missing: ${source}`);
  }

  cpSync(source, destination, { recursive: true, force: true });
}

copyRequiredDirectory("public", "public");
copyRequiredDirectory(".next/static", ".next/static");

// outputFileTracingRoot is the repository root, so Next writes the generated
// app server to standalone/web/server.js and shared node_modules beside web/.
// Hostinger expects nodejs/server.js at the artifact root. Keep the wrapper at
// that root so Node can resolve next from the adjacent node_modules directory.
writeFileSync(
  resolve(standaloneRoot, "server.js"),
  [
    '"use strict";',
    'process.env.HOSTNAME = "0.0.0.0";',
    'require("./web/server.js");',
    "",
  ].join("\n"),
);

// Hostinger's generic Node.js runtime expects the entry file and its traced
// dependencies to share one output directory. Flatten Next's monorepo layout
// into web/dist so hPanel can use output directory `web/dist` and entry file
// `server.js` without relying on a wrapper or a nested application directory.
const deployRoot = resolve(webRoot, "dist");
rmSync(deployRoot, { recursive: true, force: true });
cpSync(standaloneWebRoot, deployRoot, { recursive: true, force: true });

const standaloneNodeModules = resolve(standaloneRoot, "node_modules");
if (!existsSync(standaloneNodeModules)) {
  throw new Error(`Next.js standalone dependencies were not produced at ${standaloneNodeModules}`);
}
cpSync(standaloneNodeModules, resolve(deployRoot, "node_modules"), {
  recursive: true,
  force: true,
});

writeFileSync(
  resolve(deployRoot, "package.json"),
  `${JSON.stringify(
    {
      name: "wke-preview-runtime",
      version: "0.1.0",
      private: true,
      engines: { node: "24.x" },
      scripts: { start: "node server.js" },
    },
    null,
    2,
  )}\n`,
);

console.log("Managed-hosting standalone bundle: OK (web/dist)");
