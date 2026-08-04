import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => (error || port === null ? reject(error) : resolve(port)));
    });
  });
}

async function waitUntilReady(origin, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Next server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${origin}/secondary`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the production server");
}

async function assertRoute(origin, route, expectedStatuses, textPattern) {
  const response = await fetch(`${origin}${route}`, { redirect: "manual" });
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${route} returned ${response.status}; expected ${expectedStatuses.join(" or ")}`);
  }
  if (textPattern && response.status === 200) {
    const body = await response.text();
    if (!textPattern.test(body)) throw new Error(`${route} did not contain ${textPattern}`);
  }
  process.stdout.write(`OK ${response.status} ${route}\n`);
}

const port = await reservePort();
const origin = `http://127.0.0.1:${port}`;
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

try {
  await waitUntilReady(origin, child);
  await assertRoute(origin, "/secondary/login", [200], /Secondary student login/i);
  await assertRoute(origin, "/secondary", [307, 308], null);
  await assertRoute(origin, "/secondary/match", [307, 308], null);
  await assertRoute(origin, "/secondary/cloze", [307, 308], null);
  await assertRoute(origin, "/secondary/spelling", [307, 308], null);
  await assertRoute(origin, "/secondary/sentence", [307, 308], null);
  await assertRoute(origin, "/teacher/login", [307, 308], null);
  await assertRoute(origin, "/teacher", [200, 307, 308], null);
  await assertRoute(origin, "/grammar", [200], /Grammar/i);
} finally {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
  }
}

if (stderr.trim()) process.stderr.write(stderr);
