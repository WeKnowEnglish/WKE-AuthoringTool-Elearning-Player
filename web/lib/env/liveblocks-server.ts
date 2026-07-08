/**
 * Server-only — do not import from Client Components.
 */
export function getLiveblocksSecret(): string {
  return process.env.LIVEBLOCKS_SECRET_KEY?.trim() ?? "";
}

export function assertLiveblocksSecret(): string {
  const secret = getLiveblocksSecret();
  if (!secret) {
    throw new Error(
      "Missing LIVEBLOCKS_SECRET_KEY. Add it to .env.local from your Liveblocks dashboard.",
    );
  }
  return secret;
}
