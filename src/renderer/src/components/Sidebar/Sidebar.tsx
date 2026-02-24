import { Home, MessageSquare, Puzzle, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAppStore, type PageId } from '../../stores/app.store'
import { cn } from '../../lib/utils'

interface NavItem {
  id: PageId
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar(): React.JSX.Element {
  const currentPage = useAppStore((s) => s.currentPage)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'flex h-full flex-col border-r border-border bg-muted/50 transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-52'
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
        {navItems.map((item) => {
          const isActive = currentPage === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className={cn(sidebarCollapsed && 'sr-only')}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
