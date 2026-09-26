import { cpSync, existsSync } from "node:fs";
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

console.log("Managed-hosting standalone bundle: OK");
