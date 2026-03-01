import { useAppStore, isPluginPage, extractPluginId } from "../../stores/app.store";
import type { PluginPageId } from "../../stores/app.store";
import { Sidebar } from "../Sidebar/Sidebar";
import { HomeView } from "../../features/home/HomeView";
import { ChatView } from "../../features/chat/ChatView";
import { PluginListView } from "../../features/plugins/PluginListView";
import { SettingsView } from "../../features/settings/SettingsView";
import { getPluginPanel } from "../../features/plugins/plugin-panels";

function PageContent(): React.JSX.Element {
  const currentPage = useAppStore((s) => s.currentPage);

  switch (currentPage) {
    case "home":
      return <HomeView />;
    case "chat":
      return <ChatView />;
    case "plugins":
      return <PluginListView />;
    case "settings":
      return <SettingsView />;
    default: {
      if (isPluginPage(currentPage)) {
        const pluginId = extractPluginId(currentPage as PluginPageId);
        const entry = getPluginPanel(pluginId);
        if (entry) {
          const PluginComponent = entry.component;
          return <PluginComponent />;
        }
      }
      return <HomeView />;
    }
  }
}

export function AppLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main data-testid="content" className="flex-1 overflow-auto">
        <PageContent />
      </main>
    </div>
  );
}
