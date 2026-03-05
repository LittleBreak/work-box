/**
 * Plugin Panel Auto-Discovery
 *
 * Uses import.meta.glob to automatically discover plugin UI components
 * from the plugins directory. Eliminates the need for static registration.
 */
import type { ElementType } from "react";

/** Registry entry for a plugin's UI panel */
export interface PluginPanelEntry {
  component: ElementType;
}

/**
 * Auto-discover plugin UI panel modules via import.meta.glob.
 * Matches all *Panel.tsx files in plugin UI directories.
 */
const panelModules = import.meta.glob<Record<string, unknown>>(
  "../../../../../plugins/*/src/ui/*Panel.tsx",
  { eager: true }
);

/** Build registry from glob results: extract plugin dirname → pluginId */
function buildRegistry(): Record<string, PluginPanelEntry> {
  const registry: Record<string, PluginPanelEntry> = {};

  for (const [filePath, mod] of Object.entries(panelModules)) {
    // Extract plugin dirname from path like "../../../../../plugins/terminal/src/ui/TerminalPanel.tsx"
    const match = filePath.match(/plugins\/([^/]+)\/src\/ui\//);
    if (!match) continue;

    const dirname = match[1];
    const pluginId = `@workbox/plugin-${dirname}`;

    // Support both default and named exports
    const component =
      (mod.default as ElementType | undefined) ??
      (Object.values(mod).find((v) => typeof v === "function") as ElementType | undefined);

    if (component) {
      registry[pluginId] = { component };
    }
  }

  return registry;
}

const DISCOVERED_PANELS = buildRegistry();

/** Get a plugin's panel entry by ID, or undefined if not discovered */
export function getPluginPanel(pluginId: string): PluginPanelEntry | undefined {
  return DISCOVERED_PANELS[pluginId];
}

/** Get all discovered plugin IDs (for testing) */
export function getDiscoveredPluginIds(): string[] {
  return Object.keys(DISCOVERED_PANELS);
}
