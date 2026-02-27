import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { scanPlugins, parseManifest, resolveLoadOrder } from "./engine";
import type { ParsedPlugin } from "./engine";

/**
 * Plugin Engine (Scan & Parse) tests
 * Covers: parseManifest, scanPlugins, resolveLoadOrder
 */

// ---- Fixture helpers ----

/** Minimal valid package.json with workbox field */
function validPackageJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "test-plugin",
    version: "1.0.0",
    description: "A test plugin",
    workbox: {
      name: "Test Plugin",
      description: "A test plugin",
      permissions: ["fs:read"],
      entry: { main: "./dist/index.js" }
    },
    ...overrides
  };
}

/** Create a plugin dir with package.json inside tmp */
function createPluginDir(
  parentDir: string,
  pluginName: string,
  packageJson: Record<string, unknown>
): string {
  const pluginDir = join(parentDir, pluginName);
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(join(pluginDir, "package.json"), JSON.stringify(packageJson, null, 2));
  return pluginDir;
}

// ---- Tests ----

describe("Plugin Engine", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "workbox-plugin-engine-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ======== parseManifest ========

  describe("parseManifest", () => {
    it("parses a valid package.json with workbox field", () => {
      const pkg = validPackageJson();
      const result = parseManifest(pkg, "/fake/path/test-plugin");

      expect(result.id).toBe("test-plugin");
      expect(result.path).toBe("/fake/path/test-plugin");
      expect(result.version).toBe("1.0.0");
      expect(result.config.name).toBe("Test Plugin");
      expect(result.config.permissions).toEqual(["fs:read"]);
      expect(result.config.entry.main).toBe("./dist/index.js");
    });

    it("parses commands and ai fields", () => {
      const pkg = validPackageJson({
        workbox: {
          name: "Test Plugin",
          permissions: ["fs:read"],
          entry: { main: "./dist/index.js" },
          commands: [{ id: "test:run", title: "Run Test" }],
          ai: { tools: ["test-tool"] }
        }
      });
      const result = parseManifest(pkg, "/fake/path/test-plugin");

      expect(result.config.commands).toEqual([{ id: "test:run", title: "Run Test" }]);
      expect(result.config.ai).toEqual({ tools: ["test-tool"] });
    });

    it("defaults permissions to empty array when not provided", () => {
      const pkg = validPackageJson({
        workbox: {
          name: "Test Plugin",
          entry: { main: "./dist/index.js" }
        }
      });
      const result = parseManifest(pkg, "/fake/path/test-plugin");
      expect(result.config.permissions).toEqual([]);
    });

    it("throws when workbox field is missing", () => {
      const pkg = { name: "test-plugin", version: "1.0.0" };
      expect(() => parseManifest(pkg, "/fake/path")).toThrow(/workbox/i);
    });

    it("throws when workbox.name is missing", () => {
      const pkg = validPackageJson({
        workbox: {
          permissions: ["fs:read"],
          entry: { main: "./dist/index.js" }
        }
      });
      expect(() => parseManifest(pkg, "/fake/path")).toThrow(/name/i);
    });

    it("throws when workbox.entry.main is missing", () => {
      const pkg = validPackageJson({
        workbox: {
          name: "Test Plugin",
          permissions: ["fs:read"],
          entry: {}
        }
      });
      expect(() => parseManifest(pkg, "/fake/path")).toThrow(/entry\.main/i);
    });

    it("throws when entry field is missing entirely", () => {
      const pkg = validPackageJson({
        workbox: {
          name: "Test Plugin",
          permissions: ["fs:read"]
        }
      });
      expect(() => parseManifest(pkg, "/fake/path")).toThrow(/entry/i);
    });

    it("throws when permission is invalid", () => {
      const pkg = validPackageJson({
        workbox: {
          name: "Test Plugin",
          permissions: ["fs:read", "invalid:perm"],
          entry: { main: "./dist/index.js" }
        }
      });
      expect(() => parseManifest(pkg, "/fake/path")).toThrow(/invalid:perm/);
    });
  });

  // ======== scanPlugins ========

  describe("scanPlugins", () => {
    it("scans a valid plugin directory and returns ParsedPlugin", () => {
      const pluginDir = createPluginDir(testDir, "my-plugin", validPackageJson());
      const result = scanPlugins([testDir]);

      expect(result.valid).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.valid[0].id).toBe("test-plugin");
      expect(result.valid[0].path).toBe(resolve(pluginDir));
    });

    it("scans multiple plugin directories", () => {
      const dir1 = mkdtempSync(join(tmpdir(), "workbox-scan1-"));
      const dir2 = mkdtempSync(join(tmpdir(), "workbox-scan2-"));

      try {
        createPluginDir(dir1, "plugin-a", validPackageJson({ name: "plugin-a" }));
        createPluginDir(dir2, "plugin-b", validPackageJson({ name: "plugin-b" }));

        const result = scanPlugins([dir1, dir2]);
        expect(result.valid).toHaveLength(2);
        expect(result.errors).toHaveLength(0);

        const ids = result.valid.map((p) => p.id);
        expect(ids).toContain("plugin-a");
        expect(ids).toContain("plugin-b");
      } finally {
        rmSync(dir1, { recursive: true, force: true });
        rmSync(dir2, { recursive: true, force: true });
      }
    });

    it("handles nonexistent plugin directory gracefully", () => {
      const result = scanPlugins([join(testDir, "does-not-exist")]);
      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("handles empty plugin directory", () => {
      const emptyDir = join(testDir, "empty");
      mkdirSync(emptyDir);
      const result = scanPlugins([emptyDir]);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("skips subdirectory with no package.json", () => {
      const pluginDir = join(testDir, "no-pkg");
      mkdirSync(pluginDir);
      // No package.json created

      const result = scanPlugins([testDir]);
      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("skips subdirectory with no workbox field in package.json", () => {
      const pluginDir = join(testDir, "no-workbox");
      mkdirSync(pluginDir);
      writeFileSync(
        join(pluginDir, "package.json"),
        JSON.stringify({ name: "no-workbox", version: "1.0.0" })
      );

      const result = scanPlugins([testDir]);
      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("collects errors for invalid manifest in scan result", () => {
      // Plugin with invalid permission
      createPluginDir(testDir, "bad-plugin", {
        name: "bad-plugin",
        version: "1.0.0",
        workbox: {
          name: "Bad Plugin",
          permissions: ["not:valid"],
          entry: { main: "./dist/index.js" }
        }
      });

      const result = scanPlugins([testDir]);
      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].pluginDir).toContain("bad-plugin");
      expect(result.errors[0].error).toMatch(/not:valid/);
    });

    it("returns both valid and error entries when mixed", () => {
      createPluginDir(testDir, "good-plugin", validPackageJson({ name: "good-plugin" }));
      createPluginDir(testDir, "bad-plugin", {
        name: "bad-plugin",
        version: "1.0.0",
        workbox: {
          name: "Bad Plugin",
          permissions: ["bad:perm"],
          entry: { main: "./dist/index.js" }
        }
      });

      const result = scanPlugins([testDir]);
      expect(result.valid).toHaveLength(1);
      expect(result.valid[0].id).toBe("good-plugin");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].pluginDir).toContain("bad-plugin");
    });
  });

  // ======== resolveLoadOrder ========

  describe("resolveLoadOrder", () => {
    it("returns plugins in same order (Phase 2 simple impl)", () => {
      const plugins: ParsedPlugin[] = [
        {
          id: "a",
          path: "/a",
          version: "1.0.0",
          config: {
            name: "A",
            permissions: [],
            entry: { main: "./index.js" }
          }
        },
        {
          id: "b",
          path: "/b",
          version: "2.0.0",
          config: {
            name: "B",
            permissions: [],
            entry: { main: "./index.js" }
          }
        }
      ];

      const ordered = resolveLoadOrder(plugins);
      expect(ordered).toEqual(plugins);
    });

    it("returns empty array for empty input", () => {
      const ordered = resolveLoadOrder([]);
      expect(ordered).toEqual([]);
    });
  });
});
