import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "../next.config.mjs";

import {
  assertSameOrigin,
  createSessionToken,
  getRequestOrigin,
  verifyPassword,
  verifySessionToken,
} from "./auth.mjs";

test("admin sessions are signed, expire, and reject tampering", () => {
  const secret = "s".repeat(32);
  const issuedAt = Date.UTC(2026, 8, 29, 0, 0, 0);
  const token = createSessionToken(secret, issuedAt);
  assert.equal(verifySessionToken(token, secret, issuedAt + 60_000), true);
  assert.equal(verifySessionToken(`${token}x`, secret, issuedAt + 60_000), false);
  assert.equal(verifySessionToken(token, secret, issuedAt + 9 * 60 * 60 * 1_000), false);
});

test("password comparison and same-origin enforcement fail closed", () => {
  assert.equal(verifyPassword("correct horse battery staple", "correct horse battery staple"), true);
  assert.equal(verifyPassword("wrong", "correct horse battery staple"), false);
  const proxiedRequest = new Request("http://0.0.0.0:3000/api/action", {
    headers: {
      origin: "https://deploy.weknowenglish.online",
      host: "127.0.0.1:3000",
      "x-forwarded-host": "deploy.weknowenglish.online",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(getRequestOrigin(proxiedRequest), "https://deploy.weknowenglish.online");
  assert.equal(
    getRequestOrigin(proxiedRequest, { WKE_DASHBOARD_ORIGIN: "https://deploy.weknowenglish.online" }),
    "https://deploy.weknowenglish.online",
  );
  assert.throws(
    () => getRequestOrigin(proxiedRequest, { WKE_DASHBOARD_ORIGIN: "https://attacker.example" }),
    /does not match/,
  );
  assert.doesNotThrow(() => assertSameOrigin(proxiedRequest));
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("https://deploy.weknowenglish.online/api/action", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    /rejected/,
  );
});

test("dashboard headers preserve native form origins without sharing cross-origin referrers", async () => {
  const rules = await nextConfig.headers();
  const policy = rules
    .find((rule) => rule.source === "/:path*")
    ?.headers.find((header) => header.key.toLowerCase() === "referrer-policy");
  // A no-referrer policy turns native form Origin headers into null and
  // prevents authenticated operators from passing the request guard.
  assert.equal(policy?.value, "same-origin");
});

test("form origin validation rejects missing, opaque, and foreign origins", () => {
  const url = "https://deploy.weknowenglish.online/api/control/preview";
  for (const origin of [undefined, "null", "https://attacker.example"]) {
    const request = new Request(url, {
      method: "POST",
      headers: origin === undefined ? {} : { origin },
    });
    assert.throws(() => assertSameOrigin(request), /rejected/);
  }
  assert.doesNotThrow(() => assertSameOrigin(new Request(url, {
    method: "POST",
    headers: { origin: "https://deploy.weknowenglish.online" },
  })));
});
