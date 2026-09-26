export type NextOutputEnvironment = {
  managedHosting?: string;
  vercel?: string;
};

export function resolveNextOutputMode(
  environment: NextOutputEnvironment,
): "standalone" | undefined {
  return environment.vercel?.trim() || environment.managedHosting?.trim()
    ? undefined
    : "standalone";
}
