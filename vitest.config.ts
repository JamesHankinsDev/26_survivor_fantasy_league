import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Storybook installs vite@8 which duplicates vitest's bundled vite@7. The
  // runtime works fine, but TypeScript sees two distinct `Plugin` types from
  // the two installs and refuses the cross-cast. The cast bridges them.
  plugins: [react() as any],
  test: {
    // push-service/ is a standalone Node service whose tests run on `node:test`
    // (`node --test`), not vitest. Vitest's default glob picked up its
    // *.test.js files and failed collection with "No test suite found",
    // which turned the whole suite red in CI while every app test passed.
    exclude: [...configDefaults.exclude, "push-service/**"],
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
        ".next/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
