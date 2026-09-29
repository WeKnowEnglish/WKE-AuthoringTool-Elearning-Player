import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { createGitHubAppJwt, createGitHubAppTokenProvider } from "./github-app.mjs";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();

test("GitHub App JWT has a short lifetime and app issuer", () => {
  const now = Date.parse("2026-09-30T00:00:00Z");
  const jwt = createGitHubAppJwt({ appId: "12345", privateKey: pem, now });
  const [, payload] = jwt.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  assert.equal(claims.iss, "12345");
  assert.ok(claims.exp - claims.iat <= 10 * 60);
});

test("GitHub App installation tokens are short-lived and cached", async () => {
  let calls = 0;
  const provider = createGitHubAppTokenProvider({
    appId: "12345",
    privateKey: pem,
    installationId: "67890",
    now: () => Date.parse("2026-09-30T00:00:00Z"),
    fetchImplementation: async (url, options) => {
      calls += 1;
      assert.match(url, /installations\/67890\/access_tokens$/);
      assert.match(options.headers.Authorization, /^Bearer /);
      return Response.json({ token: "installation-token", expires_at: "2026-09-30T01:00:00Z" });
    },
  });
  assert.equal(await provider(), "installation-token");
  assert.equal(await provider(), "installation-token");
  assert.equal(calls, 1);
});
