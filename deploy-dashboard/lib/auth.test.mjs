import assert from "node:assert/strict";
import test from "node:test";

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
