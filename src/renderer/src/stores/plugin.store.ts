import { create } from "zustand";
import type { PluginInfo } from "@shared/types";

/** Plugin store state */
export interface PluginStoreState {
  plugins: PluginInfo[];
  loading: boolean;
  selectedPluginId: string | null;
  fetchPlugins: () => Promise<void>;
  togglePlugin: (id: string) => Promise<void>;
  selectPlugin: (id: string | null) => void;
}

/** Zustand store for plugin management UI */
export const usePluginStore = create<PluginStoreState>()((set, get) => ({
  plugins: [],
  loading: false,
  selectedPluginId: null,

  fetchPlugins: async () => {
    set({ loading: true });
    try {
      const workbox = (window as unknown as Record<string, unknown>).workbox as {
        plugin: { list: () => Promise<PluginInfo[]> };
      };
      const plugins = await workbox.plugin.list();
      set({ plugins, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  togglePlugin: async (id: string) => {
    const plugin = get().plugins.find((p) => p.id === id);
    if (!plugin) return;

    const workbox = (window as unknown as Record<string, unknown>).workbox as {
      plugin: {
        enable: (id: string) => Promise<void>;
        disable: (id: string) => Promise<void>;
      };
    };

    if (plugin.status === "active") {
      await workbox.plugin.disable(id);
    } else {
      await workbox.plugin.enable(id);
    }
    await get().fetchPlugins();
  },

  selectPlugin: (id: string | null) => {
    set({ selectedPluginId: id });
  }
}));
