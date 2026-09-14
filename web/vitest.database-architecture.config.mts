import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/database-architecture-audit-core.test.mjs"],
  },
});
