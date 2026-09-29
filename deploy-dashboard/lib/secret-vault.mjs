import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const FORMAT_VERSION = "v1";

function decodeMasterKey(value) {
  const key = Buffer.from(String(value || ""), "base64");
  if (key.length !== 32) {
    throw new Error("CONTROL_PLANE_MASTER_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

function contextString(context) {
  const values = [context.organizationId, context.projectId || "organization", context.kind, context.label];
  if (values.some((value) => !value || String(value).includes("\0"))) {
    throw new Error("Credential encryption context is incomplete.");
  }
  return values.map(String).join("\0");
}

export function readSecretVaultConfig(environment = process.env) {
  const masterKey = environment.CONTROL_PLANE_MASTER_KEY?.trim();
  const keyVersionRaw = environment.CONTROL_PLANE_MASTER_KEY_VERSION?.trim() || "1";
  const keyVersion = Number(keyVersionRaw);
  const missing = masterKey ? [] : ["CONTROL_PLANE_MASTER_KEY"];
  if (!Number.isSafeInteger(keyVersion) || keyVersion < 1) {
    throw new Error("CONTROL_PLANE_MASTER_KEY_VERSION must be a positive integer.");
  }
  if (masterKey) decodeMasterKey(masterKey);
  return { configured: missing.length === 0, missing, config: { masterKey, keyVersion } };
}

export function encryptCredential(plaintext, { masterKey, keyVersion, context }) {
  if (typeof plaintext !== "string" || !plaintext) throw new Error("Credential plaintext is required.");
  const key = decodeMasterKey(masterKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(contextString(context)));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [FORMAT_VERSION, String(keyVersion), iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptCredential(envelope, { masterKeys, context }) {
  const [format, versionRaw, ivRaw, tagRaw, ciphertextRaw, extra] = String(envelope || "").split(".");
  if (format !== FORMAT_VERSION || !versionRaw || !ivRaw || !tagRaw || !ciphertextRaw || extra) {
    throw new Error("Credential envelope is invalid.");
  }
  const keyVersion = Number(versionRaw);
  const encodedKey = masterKeys?.[keyVersion];
  if (!encodedKey) throw new Error(`Credential key version ${keyVersion} is unavailable.`);
  const decipher = createDecipheriv("aes-256-gcm", decodeMasterKey(encodedKey), Buffer.from(ivRaw, "base64url"));
  decipher.setAAD(Buffer.from(contextString(context)));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
