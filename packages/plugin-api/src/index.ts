import type { PluginManifest } from "./types";

export type { PluginManifest };

/**
 * Define a Work-Box plugin with the given manifest.
 * Returns the manifest object for registration.
 */
export function definePlugin(manifest: PluginManifest): PluginManifest {
  return manifest;
}
