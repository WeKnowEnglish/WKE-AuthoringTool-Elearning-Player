import { cpSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = process.cwd();
const standaloneWebRoot = resolve(webRoot, ".next", "standalone", "web");
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
  resolve(webRoot, ".next", "standalone", "server.js"),
  [
    '"use strict";',
    'process.env.HOSTNAME = "0.0.0.0";',
    'require("./web/server.js");',
    "",
  ].join("\n"),
);

console.log("Managed-hosting standalone bundle: OK");
