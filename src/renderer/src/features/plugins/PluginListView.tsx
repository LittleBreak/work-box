import { useEffect } from "react";
import { usePluginStore } from "../../stores/plugin.store";
import type { PluginInfo } from "@shared/types";

/** Status badge color mapping */
function statusColor(status: PluginInfo["status"]): string {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-400";
    case "disabled":
      return "bg-gray-500/20 text-gray-400";
    case "error":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

/** Plugin detail panel */
function PluginDetail({ plugin }: { plugin: PluginInfo }): React.JSX.Element {
  const { togglePlugin } = usePluginStore();

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{plugin.name}</h3>
        <button
          className="rounded px-3 py-1 text-sm border"
          onClick={() => togglePlugin(plugin.id)}
        >
          {plugin.status === "active" ? "Disable" : "Enable"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{plugin.description || "No description"}</p>
      {plugin.permissions.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-medium">Permissions:</span>
          <div className="flex gap-1 mt-1 flex-wrap">
            {plugin.permissions.map((perm) => (
              <span
                key={perm}
                className={`text-xs px-2 py-0.5 rounded ${
                  perm === "shell:exec" || perm === "fs:write"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}
      {plugin.error && <p className="text-sm text-red-400 mt-2">Error: {plugin.error}</p>}
    </div>
  );
}

export function PluginListView(): React.JSX.Element {
  const { plugins, loading, selectedPluginId, fetchPlugins, selectPlugin } = usePluginStore();
  const selectedPlugin = plugins.find((p) => p.id === selectedPluginId);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  return (
    <div data-testid="page-plugins" className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Plugins</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading plugins...</p>
      ) : plugins.length === 0 ? (
        <p className="text-muted-foreground">No plugins installed</p>
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className={`rounded-lg border p-3 cursor-pointer hover:border-primary ${
                  selectedPluginId === plugin.id ? "border-primary" : ""
                }`}
                onClick={() => selectPlugin(plugin.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{plugin.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor(plugin.status)}`}>
                    {plugin.status}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{plugin.version}</span>
              </div>
            ))}
          </div>
          {selectedPlugin && (
            <div className="flex-1">
              <PluginDetail plugin={selectedPlugin} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
