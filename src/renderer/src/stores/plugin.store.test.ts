import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePluginStore } from "./plugin.store";

beforeEach(() => {
  Object.defineProperty(window, "workbox", {
    value: {
      plugin: {
        list: vi.fn().mockResolvedValue([
          { id: "p1", name: "P1", version: "1.0.0", status: "active", permissions: [] },
          { id: "p2", name: "P2", version: "2.0.0", status: "disabled", permissions: ["fs:read"] }
        ]),
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined)
      }
    },
    writable: true,
    configurable: true
  });
  usePluginStore.setState({ plugins: [], loading: false, selectedPluginId: null });
});

describe("usePluginStore", () => {
  it("fetchPlugins 加载插件列表", async () => {
    await usePluginStore.getState().fetchPlugins();
    expect(usePluginStore.getState().plugins).toHaveLength(2);
    expect(usePluginStore.getState().plugins[0].id).toBe("p1");
  });

  it("fetchPlugins 设置 loading 状态", async () => {
    const promise = usePluginStore.getState().fetchPlugins();
    // After fetch completes
    await promise;
    expect(usePluginStore.getState().loading).toBe(false);
  });

  it("togglePlugin 对 active 插件调用 disable", async () => {
    await usePluginStore.getState().fetchPlugins();
    await usePluginStore.getState().togglePlugin("p1");
    expect((window as unknown as Record<string, unknown>).workbox).toBeDefined();
    const workbox = (window as unknown as Record<string, unknown>).workbox as {
      plugin: { disable: ReturnType<typeof vi.fn> };
    };
    expect(workbox.plugin.disable).toHaveBeenCalledWith("p1");
  });

  it("togglePlugin 对 disabled 插件调用 enable", async () => {
    await usePluginStore.getState().fetchPlugins();
    await usePluginStore.getState().togglePlugin("p2");
    const workbox = (window as unknown as Record<string, unknown>).workbox as {
      plugin: { enable: ReturnType<typeof vi.fn> };
    };
    expect(workbox.plugin.enable).toHaveBeenCalledWith("p2");
  });

  it("selectPlugin 设置 selectedPluginId", () => {
    usePluginStore.getState().selectPlugin("p1");
    expect(usePluginStore.getState().selectedPluginId).toBe("p1");
  });

  it("selectPlugin null 清除选择", () => {
    usePluginStore.getState().selectPlugin("p1");
    usePluginStore.getState().selectPlugin(null);
    expect(usePluginStore.getState().selectedPluginId).toBeNull();
  });
});
