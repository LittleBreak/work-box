import { useEffect } from "react";
import { Home, MessageSquare, Puzzle, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAppStore, type PageId } from "../../stores/app.store";
import { usePluginStore } from "../../stores/plugin.store";
import { PLUGIN_PANELS } from "../../features/plugins/plugin-panels";
import { cn } from "../../lib/utils";

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
}

const topNavItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: MessageSquare }
];

const bottomNavItems: NavItem[] = [
  { id: "plugins", label: "Plugins", icon: Puzzle },
  { id: "settings", label: "Settings", icon: Settings }
];

export function Sidebar(): React.JSX.Element {
  const currentPage = useAppStore((s) => s.currentPage);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const plugins = usePluginStore((s) => s.plugins);
  const fetchPlugins = usePluginStore((s) => s.fetchPlugins);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // Build plugin nav items from active plugins that have UI and are registered
  const pluginNavItems: NavItem[] = plugins
    .filter((p) => p.status === "active" && p.hasUI && PLUGIN_PANELS[p.id])
    .map((p) => ({
      id: `plugin:${p.id}` as PageId,
      label: p.name,
      icon: PLUGIN_PANELS[p.id].icon
    }));

  const hasPluginItems = pluginNavItems.length > 0;

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "flex h-full flex-col border-r border-border bg-muted/50 transition-all duration-200",
        sidebarCollapsed ? "w-14" : "w-52"
      )}
    >
      <div className="flex items-center justify-end p-2">
        <button
          data-testid="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {topNavItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
            collapsed={sidebarCollapsed}
            onClick={() => setCurrentPage(item.id)}
          />
        ))}

        {hasPluginItems && <div data-testid="divider-top" className="mx-1 my-1 h-px bg-border" />}

        {pluginNavItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
            collapsed={sidebarCollapsed}
            onClick={() => setCurrentPage(item.id)}
          />
        ))}

        {hasPluginItems && (
          <div data-testid="divider-bottom" className="mx-1 my-1 h-px bg-border" />
        )}

        {bottomNavItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
            collapsed={sidebarCollapsed}
            onClick={() => setCurrentPage(item.id)}
          />
        ))}
      </nav>
    </aside>
  );
}

/** Reusable nav button component */
function NavButton({
  item,
  isActive,
  collapsed,
  onClick
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const Icon = item.icon;
  return (
    <button
      data-testid={`nav-${item.id}`}
      data-active={isActive ? "true" : "false"}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
    </button>
  );
}
