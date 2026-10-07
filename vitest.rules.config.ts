import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts: needs the Firestore emulator, runs in node.
// Run via `pnpm test:rules` (wraps firebase emulators:exec).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
