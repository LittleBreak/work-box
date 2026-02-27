import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PluginListView } from "./PluginListView";

beforeEach(() => {
  Object.defineProperty(window, "workbox", {
    value: {
      plugin: {
        list: vi.fn().mockResolvedValue([
          {
            id: "p1",
            name: "Plugin A",
            version: "1.0.0",
            status: "active",
            permissions: ["fs:read"]
          },
          { id: "p2", name: "Plugin B", version: "2.0.0", status: "disabled", permissions: [] },
          {
            id: "p3",
            name: "Plugin C",
            version: "1.0.0",
            status: "error",
            permissions: [],
            error: "Load failed"
          }
        ]),
        enable: vi.fn().mockResolvedValue(undefined),
        disable: vi.fn().mockResolvedValue(undefined)
      }
    },
    writable: true,
    configurable: true
  });
});

describe("PluginListView", () => {
  it("渲染已安装插件列表", async () => {
    render(<PluginListView />);
    expect(await screen.findByText("Plugin A")).toBeDefined();
    expect(await screen.findByText("Plugin B")).toBeDefined();
  });

  it("显示插件状态标记", async () => {
    render(<PluginListView />);
    expect(await screen.findByText("active")).toBeDefined();
    expect(await screen.findByText("disabled")).toBeDefined();
    expect(await screen.findByText("error")).toBeDefined();
  });

  it("显示插件版本号", async () => {
    render(<PluginListView />);
    const versions = await screen.findAllByText("1.0.0");
    expect(versions.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText("2.0.0")).toBeDefined();
  });

  it("保留 data-testid", () => {
    render(<PluginListView />);
    expect(screen.getByTestId("page-plugins")).toBeDefined();
  });
});
