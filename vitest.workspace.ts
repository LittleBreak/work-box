import { resolve } from "path";
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    resolve: {
      alias: {
        "@main": resolve(__dirname, "src/main"),
        "@shared": resolve(__dirname, "src/shared")
      }
    },
    test: {
      name: "main",
      include: ["src/main/**/*.test.ts", "src/shared/**/*.test.ts"],
      environment: "node"
    }
  },
  {
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "src/shared")
      }
    },
    test: {
      name: "packages",
      include: ["packages/**/*.test.ts"],
      environment: "node"
    }
  },
  {
    resolve: {
      alias: {
        "@renderer": resolve(__dirname, "src/renderer/src"),
        "@shared": resolve(__dirname, "src/shared")
      }
    },
    test: {
      name: "renderer",
      include: ["src/renderer/**/*.test.ts", "src/renderer/**/*.test.tsx"],
      environment: "jsdom",
      setupFiles: ["src/renderer/src/vitest.setup.ts"]
    }
  },
  {
    resolve: {
      alias: {
        "@main": resolve(__dirname, "src/main"),
        "@shared": resolve(__dirname, "src/shared")
      }
    },
    test: {
      name: "plugins",
      include: ["plugins/**/*.test.ts"],
      environment: "node"
    }
  }
]);
