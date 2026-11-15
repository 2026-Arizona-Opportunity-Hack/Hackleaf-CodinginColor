import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Embedded Postgres boots WebAssembly; bound workers to avoid CI memory spikes.
  test: { include: ["src/**/*.test.ts"], environment: "node", maxWorkers: 2 },
});
