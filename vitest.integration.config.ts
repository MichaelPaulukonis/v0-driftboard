import path from "node:path";
import { defineConfig } from "vitest/config";

// Runs against Firebase Auth + Firestore emulators.
// Execute via `pnpm test:integration` (wraps `firebase emulators:exec`).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: {
      NEXT_PUBLIC_USE_EMULATOR: "true",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-driftboard",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
