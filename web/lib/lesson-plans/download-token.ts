import { createHmac, timingSafeEqual } from "node:crypto";
import { MINI_SERIES_LIBRARY_ID } from "@/lib/lesson-plans/mini-series-manifest";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ResourceDownloadTokenPayload = {
  email: string;
  bundleId: typeof MINI_SERIES_LIBRARY_ID;
  expiresAt: number;
};

function signingKey(): string {
  const secret = process.env.RESOURCE_DOWNLOAD_SECRET?.trim();
  if (secret) return `resource-download:${secret}`;
  if (process.env.NODE_ENV === "production") {
    throw new Error("RESOURCE_DOWNLOAD_SECRET is required in production.");
  }
  return "resource-download:dev-only-secret";
}

function signature(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createResourceDownloadToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const payload = Buffer.from(
    JSON.stringify({
      email: normalized,
      bundleId: MINI_SERIES_LIBRARY_ID,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    } satisfies ResourceDownloadTokenPayload),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyResourceDownloadToken(
  token: string | null | undefined,
): ResourceDownloadTokenPayload | null {
  if (!token) return null;
  const [payload, suppliedSignature, ...rest] = token.split(".");
  if (!payload || !suppliedSignature || rest.length > 0) return null;

  let expected: string;
  try {
    expected = signature(payload);
  } catch {
    return null;
  }

  const suppliedBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<ResourceDownloadTokenPayload>;
    if (
      typeof value.email !== "string" ||
      !value.email.includes("@") ||
      value.bundleId !== MINI_SERIES_LIBRARY_ID ||
      typeof value.expiresAt !== "number" ||
      value.expiresAt <= Date.now()
    ) {
      return null;
    }
    return {
      email: value.email,
      bundleId: value.bundleId,
      expiresAt: value.expiresAt,
    };
  } catch {
    return null;
  }
}

export const RESOURCE_DOWNLOAD_TOKEN_TTL_MS = TOKEN_TTL_MS;
