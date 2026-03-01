/**
 * Plugin Panel Registry
 *
 * Static mapping from plugin IDs to their React UI components and sidebar icons.
 * Only built-in plugins bundled in the monorepo are registered here.
 */
import type { ElementType } from "react";
import { Terminal, FolderOpen, GitBranch } from "lucide-react";
import { TerminalPanel } from "../../../../../plugins/terminal/src/ui/TerminalPanel";
import { FileExplorerPanel } from "../../../../../plugins/file-explorer/src/ui/FileExplorerPanel";
import GitPanel from "../../../../../plugins/git-helper/src/ui/GitPanel";

/** Registry entry for a plugin's UI panel */
export interface PluginPanelEntry {
  component: ElementType;
  icon: ElementType;
}

/** Static registry mapping plugin IDs to their panel entries */
export const PLUGIN_PANELS: Record<string, PluginPanelEntry> = {
  "@workbox/plugin-terminal": { component: TerminalPanel, icon: Terminal },
  "@workbox/plugin-file-explorer": { component: FileExplorerPanel, icon: FolderOpen },
  "@workbox/plugin-git-helper": { component: GitPanel, icon: GitBranch }
};

/** Get a plugin's panel entry by ID, or undefined if not registered */
export function getPluginPanel(pluginId: string): PluginPanelEntry | undefined {
  return PLUGIN_PANELS[pluginId];
}
