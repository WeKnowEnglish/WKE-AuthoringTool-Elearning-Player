import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "wke_deploy_session";
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function decode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPassword(candidate, expected) {
  const candidateDigest = createHmac("sha256", "wke-deploy-password").update(String(candidate)).digest();
  const expectedDigest = createHmac("sha256", "wke-deploy-password").update(String(expected)).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function createSessionToken(secret, now = Date.now()) {
  if (!secret || secret.length < 32) throw new Error("Session secret is not configured securely.");
  const payload = encode(
    JSON.stringify({
      subject: "administrator",
      issuedAt: Math.floor(now / 1000),
      expiresAt: Math.floor(now / 1000) + SESSION_LIFETIME_SECONDS,
      nonce: randomBytes(16).toString("hex"),
    }),
  );
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (!token || !secret) return false;
  const [payload, suppliedSignature, extra] = String(token).split(".");
  if (!payload || !suppliedSignature || extra || !safeEqual(signature(payload, secret), suppliedSignature)) {
    return false;
  }
  try {
    const session = JSON.parse(decode(payload));
    const nowSeconds = Math.floor(now / 1000);
    return (
      session.subject === "administrator" &&
      Number.isInteger(session.issuedAt) &&
      Number.isInteger(session.expiresAt) &&
      session.issuedAt <= nowSeconds + 60 &&
      session.expiresAt > nowSeconds
    );
  } catch {
    return false;
  }
}

export function getRequestOrigin(request, environment = process.env) {
  const requestUrl = new URL(request.url);
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || requestUrl.host;
  const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");
  if (!/^(https?|HTTPS?)$/.test(protocol)) {
    throw new Error("The request protocol is invalid.");
  }
  const configuredOrigin = environment.WKE_DASHBOARD_ORIGIN?.trim();
  if (configuredOrigin) {
    const configured = new URL(configuredOrigin);
    const localHttp =
      configured.protocol === "http:" &&
      (configured.hostname === "localhost" || configured.hostname === "127.0.0.1");
    if (
      configured.origin !== configuredOrigin ||
      (configured.protocol !== "https:" && !localHttp) ||
      configured.host.toLowerCase() !== host.toLowerCase() ||
      configured.protocol.slice(0, -1) !== protocol.toLowerCase()
    ) {
      throw new Error("The request origin does not match WKE_DASHBOARD_ORIGIN.");
    }
    return configured.origin;
  }
  const expected = new URL(`${protocol.toLowerCase()}://${host}`).origin;
  if (new URL(expected).host !== host.toLowerCase()) {
    throw new Error("The request host is invalid.");
  }
  return expected;
}

export function assertSameOrigin(request) {
  const expected = getRequestOrigin(request);
  const supplied = request.headers.get("origin");
  if (!supplied || supplied !== expected) {
    throw new Error("Cross-origin form submission was rejected.");
  }
}
