/**
 * Plugin Icon Resolver
 *
 * Maps lucide icon names from plugin manifests to React components.
 * Uses a static mapping to avoid async loading flicker from DynamicIcon.
 */
import type { ElementType } from "react";
import { Terminal, FolderOpen, GitBranch, Braces, Regex, Puzzle } from "lucide-react";

/** Static mapping from icon name to lucide component */
const ICON_MAP: Record<string, ElementType> = {
  terminal: Terminal,
  "folder-open": FolderOpen,
  "git-branch": GitBranch,
  braces: Braces,
  regex: Regex
};

/**
 * Resolve a plugin icon name to a lucide React component.
 * Returns the Puzzle icon as fallback for unknown/missing names.
 *
 * @param iconName - Icon name from plugin manifest (e.g. "terminal", "braces")
 * @returns Corresponding lucide icon component
 */
export function resolvePluginIcon(iconName?: string): ElementType {
  if (!iconName) return Puzzle;
  return ICON_MAP[iconName] ?? Puzzle;
}
