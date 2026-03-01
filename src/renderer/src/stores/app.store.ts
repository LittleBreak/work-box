import { create } from "zustand";

/** Core application page identifiers */
export type CorePageId = "home" | "chat" | "plugins" | "settings";

/** Plugin page identifier (pattern: "plugin:<pluginId>") */
export type PluginPageId = `plugin:${string}`;

/** All page identifiers (core + plugin) */
export type PageId = CorePageId | PluginPageId;

export type Theme = "light" | "dark";

export interface AppState {
  currentPage: PageId;
  sidebarCollapsed: boolean;
  theme: Theme;
  setCurrentPage: (page: PageId) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: Theme) => void;
}

export const initialAppState: Pick<AppState, "currentPage" | "sidebarCollapsed" | "theme"> = {
  currentPage: "home",
  sidebarCollapsed: false,
  theme: "dark"
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialAppState,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTheme: (theme) => set({ theme })
}));

/** Check if a page ID refers to a plugin page */
export function isPluginPage(pageId: PageId): pageId is PluginPageId {
  return pageId.startsWith("plugin:");
}

/** Extract the plugin ID from a plugin page ID */
export function extractPluginId(pageId: PluginPageId): string {
  return pageId.slice("plugin:".length);
}
