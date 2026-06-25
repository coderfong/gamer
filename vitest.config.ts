import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Minimal harness for the money/fraud-critical paths only (see tests/). Node
// environment — these exercise server modules and route handlers, not the DOM.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
