/**
 * SEO integration smoke against a running `next start` production build.
 * Extends route checks with robots/sitemap/canonical/noindex assertions.
 *
 * Usage (from web/): npm run build && npm run test:seo
 */
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
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Next server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${origin}/robots.txt`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the production server");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchManual(origin, route) {
  return fetch(`${origin}${route}`, { redirect: "manual" });
}

async function assertStatus(origin, route, expectedStatuses) {
  const response = await fetchManual(origin, route);
  assert(
    expectedStatuses.includes(response.status),
    `${route} returned ${response.status}; expected ${expectedStatuses.join(" or ")}`,
  );
  process.stdout.write(`OK ${response.status} ${route}\n`);
  return response;
}

function hasNoindex(html) {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
    || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
}

function hasCanonical(html, expected) {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
  );
  if (!match) return false;
  const normalize = (value) => value.replace(/\/$/, "");
  return normalize(match[1]) === normalize(expected);
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
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitUntilReady(origin, child);

  const homeHeaders = await assertStatus(origin, "/", [200]);
  assert(
    (homeHeaders.headers.get("x-robots-tag") || "").includes("noindex"),
    "Expected X-Robots-Tag: noindex on non-production host",
  );
  const homeHtml = await homeHeaders.text();
  assert(
    /Interactive ESL activities and teaching tools/i.test(homeHtml),
    "Homepage H1/copy missing interactive ESL activities language",
  );
  assert(/Student sign in/i.test(homeHtml), "Homepage missing Student sign in");
  assert(/Join class|Enter Class Code|enter your class code/i.test(homeHtml), "Homepage missing join-class access");
  assert(!/Choose your learning path/i.test(homeHtml), "Old path-picker H1 should not remain");


  const robots = await assertStatus(origin, "/robots.txt", [200]);
  const robotsBody = await robots.text();
  assert(robotsBody.includes("Sitemap:"), "robots.txt missing Sitemap");
  assert(robotsBody.includes("Disallow: /api/"), "robots.txt should disallow /api/");
  assert(!/Disallow:\s*\/teacher/i.test(robotsBody), "robots.txt must not disallow /teacher (use noindex)");
  assert(!/Disallow:\s*\/primary/i.test(robotsBody), "robots.txt must not disallow /primary");

  const sitemap = await assertStatus(origin, "/sitemap.xml", [200]);
  const sitemapBody = await sitemap.text();
  assert(
    sitemapBody.includes("<loc>https://weknowenglish.online</loc>")
      || sitemapBody.includes("<loc>https://weknowenglish.online/</loc>"),
    "sitemap missing homepage",
  );
  assert(sitemapBody.includes("https://weknowenglish.online/grammar"), "sitemap missing /grammar");
  assert(sitemapBody.includes("https://weknowenglish.online/about"), "sitemap missing /about");
  assert(!sitemapBody.includes("/login"), "sitemap must not include /login");
  assert(!sitemapBody.includes("/pilots"), "sitemap must not include /pilots");
  assert(!sitemapBody.includes("/teacher/"), "sitemap must not include /teacher/");

  const sitemapUrls = [...sitemapBody.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(sitemapUrls.length > 0, "sitemap has no URLs");
  for (const url of sitemapUrls) {
    assert(url.startsWith("https://weknowenglish.online"), `bad host in sitemap: ${url}`);
    assert(!url.includes("?"), `parameterized sitemap URL: ${url}`);
    const localPath = url.replace("https://weknowenglish.online", "").replace(/\/$/, "") || "/";
    const page = await fetchManual(origin, localPath);
    assert(page.status === 200, `sitemap URL ${localPath} returned ${page.status}`);
    assert(page.headers.get("location") == null, `sitemap URL ${localPath} redirected`);
    const html = await page.text();
    assert(!hasNoindex(html), `sitemap URL ${localPath} has noindex`);
    assert(hasCanonical(html, url), `sitemap URL ${localPath} canonical mismatch`);
    process.stdout.write(`OK sitemap page ${localPath}\n`);
  }

  await assertStatus(origin, "/activities", [404]);
  const legacyT = await assertStatus(origin, "/t/example-handle", [308, 301]);
  const location = legacyT.headers.get("location") || "";
  assert(
    location.includes("/wke/example-handle"),
    `Expected /t redirect to /wke/; got ${location}`,
  );

  const login = await assertStatus(origin, "/login", [200]);
  const loginHtml = await login.text();
  assert(hasNoindex(loginHtml), "/login should render noindex");

  // Auth-gated teacher builder: redirect or noindex HTML
  const builder = await fetchManual(origin, "/teacher/activity-builder");
  assert(
    [200, 307, 308].includes(builder.status),
    `/teacher/activity-builder returned ${builder.status}`,
  );
  if (builder.status === 200) {
    const builderHtml = await builder.text();
    assert(hasNoindex(builderHtml), "/teacher/activity-builder should be noindex when rendered");
  }
  process.stdout.write(`OK ${builder.status} /teacher/activity-builder\n`);

  process.stdout.write("SEO integration smoke passed.\n");
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
