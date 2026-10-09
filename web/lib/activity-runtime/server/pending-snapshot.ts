import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type PendingSnapshotContext = { roomId: string; roundId: string };

/** Purpose, room and round separate activity snapshots even when they share a key. */
export function createPendingSnapshotCodec(config: {
  version: string;
  getSecret: () => string | undefined;
  configurationError: string;
}) {
  function key(): Buffer {
    const secret = config.getSecret();
    if (!secret) throw new Error(config.configurationError);
    return createHash("sha256").update(`${config.version}:${secret}`).digest();
  }
  function contextBytes(context: PendingSnapshotContext): Buffer {
    return Buffer.from(JSON.stringify([config.version, context.roomId, context.roundId]), "utf8");
  }
  return {
    assertConfigured(): void { key(); },
    seal(snapshot: unknown, context: PendingSnapshotContext): string {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key(), iv);
      cipher.setAAD(contextBytes(context));
      const encrypted = Buffer.concat([cipher.update(JSON.stringify(snapshot), "utf8"), cipher.final()]);
      return [config.version, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
    },
    read(value: unknown, context: PendingSnapshotContext): unknown | null {
      if (typeof value !== "string") return null;
      const parts = value.split(".");
      if (parts.length !== 4 || parts[0] !== config.version) return null;
      try {
        const iv = Buffer.from(parts[1], "base64url");
        const tag = Buffer.from(parts[2], "base64url");
        if (iv.length !== 12 || tag.length !== 16) return null;
        const decipher = createDecipheriv("aes-256-gcm", key(), iv);
        decipher.setAAD(contextBytes(context));
        decipher.setAuthTag(tag);
        const body = Buffer.concat([decipher.update(Buffer.from(parts[3], "base64url")), decipher.final()]);
        return JSON.parse(body.toString("utf8")) as unknown;
      } catch {
        return null;
      }
    },
  };
}
