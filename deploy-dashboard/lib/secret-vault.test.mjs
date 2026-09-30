import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { decryptCredential, encryptCredential, readSecretVaultConfig } from "./secret-vault.mjs";

const masterKey = randomBytes(32).toString("base64");
const context = {
  organizationId: "9c2110c4-1354-4bd4-8d38-72d40f015c91",
  projectId: "1fd94bef-dbe1-4d12-a42c-d083c80880de",
  kind: "hostinger-api-token",
  label: "production",
};

test("credential envelopes are bound to project context", () => {
  const envelope = encryptCredential("high-value-secret", { masterKey, keyVersion: 1, context });
  assert.doesNotMatch(envelope, /high-value-secret/);
  assert.equal(decryptCredential(envelope, { masterKeys: { 1: masterKey }, context }), "high-value-secret");
  assert.throws(
    () => decryptCredential(envelope, { masterKeys: { 1: masterKey }, context: { ...context, projectId: "another-project" } }),
  );
});

test("credential envelopes reject tampering and invalid keys", () => {
  const envelope = encryptCredential("secret", { masterKey, keyVersion: 7, context });
  const parts = envelope.split(".");
  parts[3] = `${parts[3][0] === "A" ? "B" : "A"}${parts[3].slice(1)}`;
  assert.throws(() => decryptCredential(parts.join("."), { masterKeys: { 7: masterKey }, context }));
  assert.throws(() => decryptCredential(envelope, { masterKeys: {}, context }), /unavailable/);
  assert.throws(
    () => readSecretVaultConfig({ CONTROL_PLANE_MASTER_KEY: Buffer.from("short").toString("base64") }),
    /32-byte/,
  );
});
