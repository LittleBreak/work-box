/**
 * Plugin Engine - Scan & Parse
 *
 * Responsible for discovering plugins in configured directories,
 * parsing their package.json manifests, and resolving load order.
 */
import path from "node:path";
import fs from "node:fs";
import type { WorkboxPluginConfig, Permission } from "@workbox/plugin-api";

// ---- Types ----

/** Result of parsing a single plugin's package.json */
export interface ParsedPlugin {
  /** Plugin identifier (from package.json name field) */
  id: string;
  /** Absolute path to the plugin directory */
  path: string;
  /** Semantic version string */
  version: string;
  /** Workbox plugin configuration from the "workbox" field */
  config: WorkboxPluginConfig;
}

/** Result of scanning plugin directories */
export interface ScanResult {
  /** Successfully parsed plugins */
  valid: ParsedPlugin[];
  /** Plugins that failed to parse */
  errors: Array<{ pluginDir: string; error: string }>;
}

// ---- Constants ----

/** Valid permission identifiers matching @workbox/plugin-api Permission type */
const VALID_PERMISSIONS: Permission[] = [
  "fs:read",
  "fs:write",
  "shell:exec",
  "network:fetch",
  "ai:chat",
  "clipboard",
  "notification"
];

// ---- Implementation ----

/**
 * Parse a plugin's package.json and validate its workbox configuration.
 *
 * @param packageJson - The parsed package.json object
 * @param pluginPath - Absolute path to the plugin directory
 * @returns ParsedPlugin with validated configuration
 * @throws Error if required fields are missing or permissions are invalid
 */
export function parseManifest(
  packageJson: Record<string, unknown>,
  pluginPath: string
): ParsedPlugin {
  // Validate workbox field exists
  const workbox = packageJson.workbox as Record<string, unknown> | undefined;
  if (!workbox || typeof workbox !== "object") {
    throw new Error(`Missing "workbox" field in package.json at ${pluginPath}`);
  }

  // Validate workbox.name
  if (!workbox.name || typeof workbox.name !== "string") {
    throw new Error(`Missing "workbox.name" field in package.json at ${pluginPath}`);
  }

  // Validate workbox.entry
  const entry = workbox.entry as Record<string, unknown> | undefined;
  if (!entry || typeof entry !== "object") {
    throw new Error(`Missing "workbox.entry" field in package.json at ${pluginPath}`);
  }

  // Validate workbox.entry.main
  if (!entry.main || typeof entry.main !== "string") {
    throw new Error(`Missing "workbox.entry.main" field in package.json at ${pluginPath}`);
  }

  // Validate permissions
  const rawPermissions = (workbox.permissions as string[] | undefined) ?? [];
  for (const perm of rawPermissions) {
    if (!VALID_PERMISSIONS.includes(perm as Permission)) {
      throw new Error(
        `Invalid permission "${perm}" in plugin at ${pluginPath}. ` +
          `Valid permissions: ${VALID_PERMISSIONS.join(", ")}`
      );
    }
  }

  // Build the config object
  const config: WorkboxPluginConfig = {
    name: workbox.name as string,
    description: (workbox.description as string) ?? undefined,
    icon: (workbox.icon as string) ?? undefined,
    permissions: rawPermissions as Permission[],
    entry: {
      main: entry.main as string,
      ui: (entry.ui as string) ?? undefined
    }
  };

  // Optional commands
  if (workbox.commands) {
    config.commands = workbox.commands as WorkboxPluginConfig["commands"];
  }

  // Optional ai
  if (workbox.ai) {
    config.ai = workbox.ai as WorkboxPluginConfig["ai"];
  }

  return {
    id: packageJson.name as string,
    path: pluginPath,
    version: packageJson.version as string,
    config
  };
}

/**
 * Scan plugin directories for valid plugins.
 *
 * For each directory in `dirs`, reads its subdirectories and tries to parse
 * each subdirectory as a plugin (by reading its package.json).
 *
 * @param dirs - Array of directory paths to scan for plugins
 * @returns ScanResult with valid plugins and error entries
 */
export function scanPlugins(dirs: string[]): ScanResult {
  const valid: ParsedPlugin[] = [];
  const errors: ScanResult["errors"] = [];

  for (const dir of dirs) {
    // Skip nonexistent directories
    if (!fs.existsSync(dir)) {
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const pluginDir = path.resolve(dir, entry.name);
      const packageJsonPath = path.join(pluginDir, "package.json");

      // Skip if no package.json
      if (!fs.existsSync(packageJsonPath)) {
        continue;
      }

      let packageJson: Record<string, unknown>;
      try {
        const raw = fs.readFileSync(packageJsonPath, "utf-8");
        packageJson = JSON.parse(raw) as Record<string, unknown>;
      } catch (err) {
        errors.push({
          pluginDir,
          error: `Failed to read/parse package.json: ${err instanceof Error ? err.message : String(err)}`
        });
        continue;
      }

      // Skip if no workbox field (not a workbox plugin)
      if (!packageJson.workbox) {
        continue;
      }

      // Try to parse the manifest
      try {
        const parsed = parseManifest(packageJson, pluginDir);
        valid.push(parsed);
      } catch (err) {
        errors.push({
          pluginDir,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }

  return { valid, errors };
}

/**
 * Resolve the load order of plugins.
 *
 * Phase 2 simple implementation: returns input unchanged.
 * Future phases may implement dependency-based ordering.
 *
 * @param plugins - Array of parsed plugins
 * @returns Ordered array of plugins
 */
export function resolveLoadOrder(plugins: ParsedPlugin[]): ParsedPlugin[] {
  return plugins;
}
