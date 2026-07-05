import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/fixtures/wrappers/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      globals: false,
    },
  }),
);
