export type NextOutputEnvironment = {
  vercel?: string;
};

export function resolveNextOutputMode(
  environment: NextOutputEnvironment,
): "standalone" | undefined {
  return environment.vercel?.trim() ? undefined : "standalone";
}
